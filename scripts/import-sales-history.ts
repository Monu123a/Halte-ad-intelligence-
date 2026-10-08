import { PrismaClient } from "@prisma/client";
import * as xlsx from "xlsx";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  const filePath = path.resolve("./source folder/Halte Amz Master GST Records 23 - 26 .xlsx");
  console.log("Reading Excel file:", filePath);
  
  const workbook = xlsx.readFile(filePath);
  
  const masterSheet = workbook.Sheets["MASTER_PRODUCT"];
  if (!masterSheet) {
    throw new Error("MASTER_PRODUCT sheet not found!");
  }
  
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
  
  console.log(`Loaded ${Object.keys(skuToCategory).length} SKU mappings.`);

  const years = [2023, 2024, 2025, 2026];
  let totalImported = 0;

  for (const year of years) {
    const sheetName = `GST_MASTER_${year}`;
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      console.warn(`Sheet ${sheetName} not found, skipping.`);
      continue;
    }

    const data = xlsx.utils.sheet_to_json(sheet);
    console.log(`Parsing ${sheetName}, found ${data.length} rows.`);
    
    const batch = [];
    
    for (const row of data as any[]) {
      const txType = row["Transaction Type"] || row["Transaction type"];
      if (txType !== "Shipment") continue;
      
      const sku = row["Sku"] || row["SKU"];
      if (!sku) continue;
      
      const dateVal = row["Order Date"];
      let orderDate = new Date();
      if (typeof dateVal === 'number') {
        orderDate = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
      } else if (typeof dateVal === 'string') {
        orderDate = new Date(dateVal);
      } else {
        continue; // skip invalid date
      }
      
      if (isNaN(orderDate.getTime())) {
        continue; // skip invalid date
      }
      
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
      // Use chunks to avoid too large payloads
      const chunkSize = 2000;
      for (let i = 0; i < batch.length; i += chunkSize) {
        await prisma.salesHistory.createMany({
          data: batch.slice(i, i + chunkSize)
        });
      }
      totalImported += batch.length;
    }
  }

  console.log(`Finished importing ${totalImported} SalesHistory records.`);

  console.log("Updating SeasonalRules...");
  
  await prisma.seasonalRule.update({
    where: { product: "Snow Chains" },
    data: {
      validMonths: [12, 1, 2, 3],
      validRegions: ["Himachal Pradesh", "Uttar Pradesh", "Delhi", "Haryana", "Uttarakhand"]
    }
  });

  await prisma.seasonalRule.update({
    where: { product: "Watering (sprinklers etc.)" },
    data: {
      validMonths: [1, 2, 3, 4],
      validRegions: ["Kerala", "Karnataka", "Maharashtra", "Uttar Pradesh", "Tamil Nadu"]
    }
  });

  await prisma.seasonalRule.update({
    where: { product: "Brush Cutters" },
    data: {
      validMonths: [5, 7, 8, 9, 10],
      validRegions: ["Kerala", "Karnataka", "West Bengal", "Meghalaya", "Maharashtra"]
    }
  });

  console.log("SeasonalRule table updated.");
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
