import * as xlsx from "xlsx";
import path from "path";

async function main() {
  const filePath = path.resolve("./source folder/Halte Amz Master GST Records 23 - 26 .xlsx");
  const workbook = xlsx.readFile(filePath);
  
  let invalidCount = 0;
  for (const year of [2023, 2024, 2025, 2026]) {
    const sheet = workbook.Sheets[`GST_MASTER_${year}`];
    if (!sheet) continue;

    const data = xlsx.utils.sheet_to_json(sheet);
    for (const row of data as any[]) {
      if ((row["Transaction Type"] || row["Transaction type"]) !== "Shipment") continue;
      
      const dateVal = row["Order Date"];
      let orderDate = new Date();
      if (typeof dateVal === 'number') {
        orderDate = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
      } else if (typeof dateVal === 'string') {
        orderDate = new Date(dateVal);
      } else {
        if (invalidCount < 5) console.log(`Invalid date (type ${typeof dateVal}):`, dateVal, row);
        invalidCount++;
        continue;
      }
      
      if (isNaN(orderDate.getTime())) {
        if (invalidCount < 5) console.log(`NaN date:`, dateVal, row);
        invalidCount++;
      }
    }
  }
  console.log(`Total invalid dates: ${invalidCount}`);
}

main().catch(console.error);
