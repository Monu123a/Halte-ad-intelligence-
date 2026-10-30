import { Pool } from "pg";

let pool: Pool | null = null;

function getStorePool(): Pool | null {
  const connectionString = 
    process.env.HALTE_STORE_DB_URL || 
    "postgresql://postgres.clvmribjdecelazooiyo:%2Bd%3FPjHU3hUNh%21K-@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres";

  if (!connectionString) {
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });
  }

  return pool;
}

export interface StoreStatsSummary {
  connected: boolean;
  totalOrders: number;
  netRevenue: number;
  netProfit: number;
  cancelledOrders: number;
  cancellationRate: string;
  totalCustomers: number;
  topStates: Array<{ state: string; orders: number; revenue: number }>;
  topSkus: Array<{ sku: string; count: number; revenue: number; profit: number }>;
  recentCustomers: Array<{ name: string; phone: string | null; state: string | null; totalSpent: number; totalOrders: number; notes: string | null }>;
}

let cachedSummary: { data: StoreStatsSummary; expiresAt: number } | null = null;

export async function getStoreMetricsSummary(): Promise<StoreStatsSummary> {
  const p = getStorePool();
  if (!p) {
    return {
      connected: false,
      totalOrders: 0,
      netRevenue: 0,
      netProfit: 0,
      cancelledOrders: 0,
      cancellationRate: "0%",
      totalCustomers: 0,
      topStates: [],
      topSkus: [],
      recentCustomers: []
    };
  }

  const now = Date.now();
  if (cachedSummary && now < cachedSummary.expiresAt) {
    return cachedSummary.data;
  }

  try {
    const [statsRes, custCountRes, topStatesRes, topSkusRes, topCustRes] = await Promise.all([
      p.query(`
        SELECT 
          count(*) as total_orders,
          sum(case when order_status NOT IN ('Cancelled', 'Returned') then item_price * quantity else 0 end) as net_revenue,
          sum(case when order_status NOT IN ('Cancelled', 'Returned') then profit else 0 end) as net_profit,
          count(case when order_status = 'Cancelled' then 1 end) as cancelled_orders
        FROM orders;
      `),
      p.query(`SELECT count(*) as total_customers FROM customers;`),
      p.query(`
        SELECT ship_state, count(*) as orders, sum(item_price * quantity) as revenue
        FROM orders
        WHERE ship_state IS NOT NULL AND order_status NOT IN ('Cancelled')
        GROUP BY ship_state
        ORDER BY revenue DESC
        LIMIT 6;
      `),
      p.query(`
        SELECT sku, count(*) as count, sum(item_price * quantity) as revenue, sum(profit) as profit
        FROM orders
        WHERE sku IS NOT NULL AND order_status NOT IN ('Cancelled')
        GROUP BY sku
        ORDER BY revenue DESC
        LIMIT 6;
      `),
      p.query(`
        SELECT name, phone, state, total_spent, total_orders, notes
        FROM customers
        WHERE total_spent > 0
        ORDER BY total_spent DESC
        LIMIT 6;
      `)
    ]);

    const totalOrders = parseInt(statsRes.rows[0]?.total_orders || "0", 10);
    const netRevenue = parseFloat(statsRes.rows[0]?.net_revenue || "0");
    const netProfit = parseFloat(statsRes.rows[0]?.net_profit || "0");
    const cancelledOrders = parseInt(statsRes.rows[0]?.cancelled_orders || "0", 10);
    const cancellationRate = totalOrders > 0 ? `${((cancelledOrders / totalOrders) * 100).toFixed(1)}%` : "0%";
    const totalCustomers = parseInt(custCountRes.rows[0]?.total_customers || "0", 10);

    const topStates = topStatesRes.rows.map((r: any) => ({
      state: r.ship_state,
      orders: parseInt(r.orders || "0", 10),
      revenue: parseFloat(r.revenue || "0")
    }));

    const topSkus = topSkusRes.rows.map((r: any) => ({
      sku: r.sku,
      count: parseInt(r.count || "0", 10),
      revenue: parseFloat(r.revenue || "0"),
      profit: parseFloat(r.profit || "0")
    }));

    const recentCustomers = topCustRes.rows.map((r: any) => ({
      name: r.name,
      phone: r.phone,
      state: r.state,
      totalSpent: parseFloat(r.total_spent || "0"),
      totalOrders: parseInt(r.total_orders || "0", 10),
      notes: r.notes
    }));

    const data: StoreStatsSummary = {
      connected: true,
      totalOrders,
      netRevenue,
      netProfit,
      cancelledOrders,
      cancellationRate,
      totalCustomers,
      topStates,
      topSkus,
      recentCustomers
    };

    cachedSummary = { data, expiresAt: now + 5 * 60 * 1000 }; // 5 min cache
    return data;
  } catch (err: any) {
    console.error("[HalteStoreDB Error]:", err.message);
    return {
      connected: false,
      totalOrders: 0,
      netRevenue: 0,
      netProfit: 0,
      cancelledOrders: 0,
      cancellationRate: "0%",
      totalCustomers: 0,
      topStates: [],
      topSkus: [],
      recentCustomers: []
    };
  }
}

/**
 * Executes a safe, read-only SELECT query directly on the Halte production database.
 */
export async function runSafeStoreQuery(sql: string): Promise<any[]> {
  const p = getStorePool();
  if (!p) throw new Error("Store database pool is not connected.");

  const clean = sql.trim().replace(/;+$/, "");
  const lower = clean.toLowerCase();
  if (!lower.startsWith("select") && !lower.startsWith("with")) {
    throw new Error("Only read-only SELECT queries are permitted.");
  }

  const forbidden = ["insert ", "update ", "delete ", "drop ", "alter ", "truncate ", "grant ", "revoke ", "create "];
  if (forbidden.some(f => lower.includes(f))) {
    throw new Error("Mutation queries are blocked for database safety.");
  }

  // Ensure query has a limit to prevent memory spikes
  const cappedSql = lower.includes("limit") ? clean : `${clean} LIMIT 50`;
  const res = await p.query(cappedSql);
  return res.rows;
}
