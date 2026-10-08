import * as xlsx from "xlsx";
import path from "path";

async function main() {
  const filePath = path.resolve("./source folder/Halte Amz Master GST Records 23 - 26 .xlsx");
  const workbook = xlsx.readFile(filePath);
  
  const masterSheet = workbook.Sheets["MASTER_PRODUCT"];
  const masterData = xlsx.utils.sheet_to_json(masterSheet);
  const skuToCategory: Record<string, string> = {};
  
  for (const row of masterData as any[]) {
    const sku = row["seller-sku"] || row["Seller Sku"] || row["SKU"];
    const subCat = row["Sub Category"] || row["Sub-Category"];
    if (sku && subCat) {
      skuToCategory[sku] = subCat;
    }
  }
  
  const years = [2023, 2024, 2025, 2026];
  let totalShipments = 0;
  let emptySku = 0;
  let invalidDate = 0;
  let validImported = 0;
  let hasSubCategory = 0;
  let noSubCategory = 0;

  for (const year of years) {
    const sheetName = `GST_MASTER_${year}`;
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const data = xlsx.utils.sheet_to_json(sheet);
    for (const row of data as any[]) {
      const txType = row["Transaction Type"] || row["Transaction type"];
      if (txType !== "Shipment") continue;
      
      totalShipments++;
      
      const sku = row["Sku"] || row["SKU"];
      if (!sku) {
        emptySku++;
        continue;
      }
      
      const dateVal = row["Order Date"];
      let orderDate = new Date();
      if (typeof dateVal === 'number') {
        orderDate = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
      } else if (typeof dateVal === 'string') {
        orderDate = new Date(dateVal);
      } else {
        invalidDate++;
        continue;
      }
      
      if (isNaN(orderDate.getTime())) {
        invalidDate++;
        continue;
      }
      
      validImported++;
      if (skuToCategory[sku]) {
        hasSubCategory++;
      } else {
        noSubCategory++;
      }
    }
  }

  console.log(`Total Shipments: ${totalShipments}`);
  console.log(`Dropped - Empty SKU: ${emptySku}`);
  console.log(`Dropped - Invalid Date: ${invalidDate}`);
  console.log(`Valid Imported: ${validImported}`);
  console.log(`- of which have SubCategory: ${hasSubCategory}`);
  console.log(`- of which NO SubCategory (Null): ${noSubCategory}`);
}

main().catch(console.error);
