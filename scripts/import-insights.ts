import { PrismaClient } from "@prisma/client";
import * as xlsx from "xlsx";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  const filePath = "/Users/harshahlawat/Downloads/Ultimate_Ads_Strategy_Pure.xlsx";
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets["Top Campaign Recommendations"];
  
  if (!sheet) {
    throw new Error("Sheet 'Top Campaign Recommendations' not found!");
  }
  
  const data = xlsx.utils.sheet_to_json(sheet);
  
  const batch = [];
  
  for (const row of data as any[]) {
    batch.push({
      productSku: row["Product SKU"] || "UNKNOWN",
      targetState: row["Target State"] || "UNKNOWN",
      peakMonth: row["Peak Month"] || "UNKNOWN",
      season: row["Season"] || "UNKNOWN",
      historicalUnitsSold: parseInt(row["Historical Units Sold"], 10) || 0,
      historicalRevenue: parseFloat(row["Historical Revenue"]) || 0,
      confidenceLevel: row["Confidence Level"] || "UNKNOWN",
      campaignRecommendation: row["Campaign Recommendation"] || "",
    });
  }

  if (batch.length > 0) {
    console.log(`Inserting ${batch.length} insights...`);
    const chunkSize = 2000;
    for (let i = 0; i < batch.length; i += chunkSize) {
      await prisma.productOpportunityInsights.createMany({
        data: batch.slice(i, i + chunkSize)
      });
    }
    console.log("Successfully imported all records.");
  } else {
    console.log("No records found to import.");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
