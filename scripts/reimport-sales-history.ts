import { PrismaClient } from "@prisma/client";
import * as xlsx from "xlsx";
import path from "path";

const prisma = new PrismaClient();

function parseCustomDate(dateVal: any): Date | null {
  if (typeof dateVal === 'number') {
    return new Date(Math.round((dateVal - 25569) * 86400 * 1000));
  }
  if (typeof dateVal === 'string') {
    // Try to parse DD-MM-YYYY HH:mm
    const match = dateVal.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})/);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1; // 0-indexed
      const year = parseInt(match[3], 10);
      const hour = parseInt(match[4], 10);
      const minute = parseInt(match[5], 10);
      return new Date(year, month, day, hour, minute);
    }
    // Also try DD-MM-YYYY without time
    const match2 = dateVal.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (match2) {
      const day = parseInt(match2[1], 10);
      const month = parseInt(match2[2], 10) - 1;
      const year = parseInt(match2[3], 10);
      return new Date(year, month, day);
    }
    // Fallback standard parse
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

async function main() {
  await prisma.salesHistory.deleteMany(); // Wipe old bad data
  
  const filePath = path.resolve("./source folder/Halte Amz Master GST Records 23 - 26 .xlsx");
  const workbook = xlsx.readFile(filePath);
  
  const masterSheet = workbook.Sheets["MASTER_PRODUCT"];
  const masterData = xlsx.utils.sheet_to_json(masterSheet);
  const skuToCategory: Record<string, string> = {};
  const skuToBrand: Record<string, string> = {};
  
  for (const row of masterData as any[]) {
    const sku = row["seller-sku"] || row["Seller Sku"] || row["SKU"];
    const subCat = row["Sub Category"] || row["Sub-Category"];
    const brand = row["Brand"];
    if (sku) {
      if (subCat) skuToCategory[sku] = subCat;
      if (brand) skuToBrand[sku] = brand;
    }
  }

  const years = [2023, 2024, 2025, 2026];
  let totalImported = 0;

  for (const year of years) {
    const sheetName = `GST_MASTER_${year}`;
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const data = xlsx.utils.sheet_to_json(sheet);
    const batch = [];
    
    for (const row of data as any[]) {
      const txType = row["Transaction Type"] || row["Transaction type"];
      if (txType !== "Shipment") continue;
      
      const sku = row["Sku"] || row["SKU"];
      if (!sku) continue;
      
      const orderDate = parseCustomDate(row["Order Date"]);
      if (!orderDate) continue;
      
      const qtyStr = row["Quantity"];
      const quantity = parseInt(String(qtyStr), 10) || 1;
      const shipToState = row["Ship To State"] || row["Ship to State"];
      
      batch.push({
        orderDate,
        sku,
        subCategory: skuToCategory[sku] || null,
        brand: skuToBrand[sku] || row["Brand"] || null,
        quantity,
        shipToState: shipToState || null,
      });
    }

    if (batch.length > 0) {
      console.log(`Inserting ${batch.length} shipments for ${year}...`);
      const chunkSize = 2000;
      for (let i = 0; i < batch.length; i += chunkSize) {
        await prisma.salesHistory.createMany({
          data: batch.slice(i, i + chunkSize)
        });
      }
      totalImported += batch.length;
    }
  }

  console.log(`Re-import finished successfully! Total exact rows: ${totalImported}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
