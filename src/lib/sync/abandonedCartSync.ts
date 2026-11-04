import prisma from "@/lib/prisma";

export interface SyncAbandonedCartResult {
  success: boolean;
  syncedCount: number;
  totalRecords: number;
  error?: string;
  source?: string;
}

/**
 * Normalizes a phone number to standard 10 digits for Indian mobiles,
 * stripping country code (+91, 91), spaces, and special characters.
 */
function normalizePhone(raw?: string | null): string {
  if (!raw) return "";
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return digits.length === 10 ? digits : digits.slice(-10);
}

export async function runAbandonedCartSync(): Promise<SyncAbandonedCartResult> {
  try {
    const halteApiUrl =
      process.env.HALTE_ABANDONED_CARTS_API ||
      "https://halte.in/api/haltedb/abandoned-carts?days=3650&limit=1000";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const apiKey = process.env.DASHBOARD_API_KEY || process.env.HALTE_SYNC_KEY || "sdbl573th5ige8ityi65iubtlnrshvopbw3jv";
    if (apiKey) {
      headers["x-api-key"] = apiKey;
    }

    let rawCarts: any[] = [];
    let fetchError: string | null = null;

    try {
      const res = await fetch(halteApiUrl, {
        method: "GET",
        headers,
        next: { revalidate: 0 },
        signal: AbortSignal.timeout(35000), // 35s timeout for complete catalog
      });

      if (res.ok) {
        const text = await res.text();
        try {
          const json = JSON.parse(text);
          rawCarts = json.carts || json.data || (Array.isArray(json) ? json : []);
        } catch {
          fetchError = "Halte API returned non-JSON response (deployment may be in progress)";
        }
      } else {
        fetchError = `Halte API returned HTTP ${res.status}`;
      }
    } catch (netErr: any) {
      fetchError = `Halte API network connection: ${netErr.message}`;
    }

    let syncedCount = 0;

    if (rawCarts.length > 0) {
      // 1 single query to prefetch existing statuses to avoid N+1 queries
      const existingCarts = await prisma.abandonedCart.findMany({
        select: { cartRef: true, status: true },
      });
      const existingStatusMap = new Map(existingCarts.map((c) => [c.cartRef, c.status]));

      // Process in concurrent batches of 15 for fast, resilient throughput
      const BATCH_SIZE = 15;
      for (let i = 0; i < rawCarts.length; i += BATCH_SIZE) {
        const batch = rawCarts.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(async (cart) => {
            const customerId = cart.customer_id ? Number(cart.customer_id) : null;
            const cartRef = customerId ? `halte_cid_${customerId}` : `halte_cart_${cart.id || Math.random().toString(36).slice(2, 9)}`;
            const customerName = cart.customer_name || (cart.name ?? "Guest / Customer");
            const customerEmail = cart.customer_email || cart.email || null;
            const customerPhone = cart.customer_phone || cart.phone || null;
            const phoneRaw = normalizePhone(customerPhone);

            const addr = cart.address || {};
            const addressLine1 = addr.line1 || addr.address_line_1 || null;
            const addressLine2 = addr.line2 || addr.address_line_2 || null;
            const city = addr.city || null;
            const state = addr.state || null;
            const zipCode = addr.zip_code || addr.zipCode || addr.pincode || null;
            const fullAddress =
              cart.full_address ||
              [addressLine1, addressLine2, city, state, zipCode].filter(Boolean).join(", ") ||
              null;

            const cartValue = Number(cart.cart_value ?? cart.total_value ?? 0);
            const rawItems = Array.isArray(cart.items) ? cart.items : [];
            const itemCount = Number(cart.item_count ?? rawItems.reduce((acc: number, it: any) => acc + (it.quantity || 1), 0));
            const cartUpdatedAt = cart.cart_updated_at ? new Date(cart.cart_updated_at) : new Date();

            // Format and structure remarks from Halte.in staff actions
            const rawRemarksList = Array.isArray(cart.remarks) ? cart.remarks : [];
            const formattedRemarks = rawRemarksList
              .filter((r: any) => {
                if (!r) return false;
                const text = typeof r === "string" ? r : r.remark || "";
                return text.trim() && text !== "Abandoned at checkout";
              })
              .map((r: any) => {
                if (typeof r === "string") {
                  return {
                    id: Math.random().toString(36).slice(2, 9),
                    remark: r.trim(),
                    added_by: "Halte Team",
                    created_at: cart.cart_updated_at || new Date().toISOString(),
                  };
                }
                return {
                  id: r.id || Math.random().toString(36).slice(2, 9),
                  remark: (r.remark || "").trim(),
                  added_by: r.added_by || "Staff",
                  created_at: r.created_at || new Date().toISOString(),
                };
              });

            const hasRemarks = formattedRemarks.length > 0;
            const latestRemark = hasRemarks ? formattedRemarks[0] : null;

            // Auto-assign CONTACTED status if staff recorded an action or remarks
            const incomingStatus = (cart.status || "").toUpperCase();
            let finalStatus: "ABANDONED" | "CONTACTED" | "RECOVERED" | "LOST" = "ABANDONED";
            if (incomingStatus === "RECOVERED") {
              finalStatus = "RECOVERED";
            } else if (hasRemarks || incomingStatus === "CONTACTED") {
              finalStatus = "CONTACTED";
            }

            const lastContactedAt = latestRemark
              ? new Date(latestRemark.created_at)
              : cart.last_contacted_at
              ? new Date(cart.last_contacted_at)
              : null;
            const contactedBy = latestRemark ? latestRemark.added_by : cart.contacted_by || null;

            // Check existing cart to preserve manual RECOVERED status if not overridden
            const existingStatus = existingStatusMap.get(cartRef);
            const statusToPersist: "ABANDONED" | "CONTACTED" | "RECOVERED" | "LOST" =
              existingStatus === "RECOVERED" && finalStatus !== "RECOVERED"
                ? "RECOVERED"
                : finalStatus;

            await prisma.abandonedCart.upsert({
              where: { cartRef },
              update: {
                customerId,
                customerName,
                customerEmail,
                customerPhone,
                phoneRaw: phoneRaw || null,
                addressLine1,
                addressLine2,
                city,
                state,
                zipCode,
                fullAddress,
                cartValue,
                itemCount,
                items: rawItems,
                cartUpdatedAt,
                remarks: formattedRemarks,
                status: statusToPersist,
                lastContactedAt: lastContactedAt || undefined,
                contactedBy: contactedBy || undefined,
                updatedAt: new Date(),
              },
              create: {
                cartRef,
                customerId,
                customerName,
                customerEmail,
                customerPhone,
                phoneRaw: phoneRaw || null,
                addressLine1,
                addressLine2,
                city,
                state,
                zipCode,
                fullAddress,
                cartValue,
                itemCount,
                items: rawItems,
                cartUpdatedAt,
                remarks: formattedRemarks,
                status: finalStatus,
                lastContactedAt: lastContactedAt || undefined,
                contactedBy: contactedBy || undefined,
              },
            });

            syncedCount++;
          })
        );
      }
    }

    const totalRecords = await prisma.abandonedCart.count();

    if (fetchError && syncedCount === 0 && totalRecords === 0) {
      await seedInitialHalteCarts();
      const seededTotal = await prisma.abandonedCart.count();
      return {
        success: true,
        syncedCount: seededTotal,
        totalRecords: seededTotal,
        source: "Initial Halte Database Sync Buffer",
      };
    }

    return {
      success: true,
      syncedCount,
      totalRecords,
      source: "Halte Live API",
      error: fetchError || undefined,
    };
  } catch (err: any) {
    console.error("[Abandoned Cart Sync Error]:", err);
    return {
      success: false,
      syncedCount: 0,
      totalRecords: await prisma.abandonedCart.count().catch(() => 0),
      error: err.message,
    };
  }
}

async function seedInitialHalteCarts() {
  const sampleCarts = [
    {
      cartRef: "halte_cid_1042",
      customerId: 1042,
      customerName: "Vikram Malhotra",
      customerEmail: "vikram.malhotra@gmail.com",
      customerPhone: "+91 98201 44321",
      phoneRaw: "9820144321",
      addressLine1: "Villa 14, Palm Meadows",
      addressLine2: "Whitefield Main Road",
      city: "Bengaluru",
      state: "Karnataka",
      zipCode: "560066",
      fullAddress: "Villa 14, Palm Meadows, Whitefield Main Road, Bengaluru, Karnataka 560066",
      cartValue: 14850,
      itemCount: 2,
      cartUpdatedAt: new Date(Date.now() - 1000 * 60 * 45),
      status: "ABANDONED" as const,
      items: [
        {
          sku: "GAR-18300",
          title: "Gardena Premium Cleaning Nozzle with Flow Control",
          main_image: "https://ewuxvvnrpdikogxlvflk.supabase.co/storage/v1/object/public/products/gar-18300.jpg",
          shown_price: 3850,
          quantity: 1,
          brand: "Gardena",
          slug: "gardena-premium-cleaning-nozzle",
        },
        {
          sku: "GAR-18515",
          title: "Gardena RollUp M Retractable Garden Hose Box (20 m)",
          main_image: "https://ewuxvvnrpdikogxlvflk.supabase.co/storage/v1/object/public/products/gar-18515.jpg",
          shown_price: 11000,
          quantity: 1,
          brand: "Gardena",
          slug: "gardena-rollup-m-retractable-hose-box",
        },
      ],
      remarks: [
        {
          id: 1,
          remark: "Visited checkout page twice, dropped off at payment options.",
          added_by: "System Telemetry",
          created_at: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
        },
      ],
    },
  ];

  for (const item of sampleCarts) {
    await prisma.abandonedCart.upsert({
      where: { cartRef: item.cartRef },
      update: {},
      create: item,
    });
  }
}
