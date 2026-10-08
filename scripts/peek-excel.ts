import * as xlsx from "xlsx";
import path from "path";

async function main() {
  const filePath = "/Users/harshahlawat/Downloads/Ultimate_Ads_Strategy_Pure.xlsx";
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets["Top Campaign Recommendations"];
  if (!sheet) {
    console.error("Sheet not found!");
    console.log("Available sheets:", workbook.SheetNames);
    return;
  }
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  console.log("Headers:", data[0]);
  console.log("First row:", data[1]);
}
main().catch(console.error);
