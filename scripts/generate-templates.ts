import * as xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';

function generateSalesTemplate() {
  const wb = xlsx.utils.book_new();
  
  const b2bData = [
    { "Transaction Type": "Shipment", "Order Date": "05-12-2025", "Sku": "GAR-SNOW-01", "Quantity": 2, "Ship To State": "Jammu and Kashmir" }
  ];
  
  const masterData = [
    { "Seller Sku": "GAR-SNOW-01", "Sub Category": "Snow Chains", "Brand": "Gardena" }
  ];

  xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(b2bData), "B2B");
  xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(masterData), "MASTER_PRODUCT");

  const filePath = path.join(process.cwd(), 'downloads', 'Template_Amazon_Sales.xlsx');
  xlsx.writeFile(wb, filePath);
  console.log("Created", filePath);
}

function generateInsightsTemplate() {
  const wb = xlsx.utils.book_new();
  
  const data = [
    {
      "Product SKU": "GAR-SNOW-01",
      "Target State": "Jammu and Kashmir",
      "Peak Month": "January",
      "Season": "Winter",
      "Historical Units Sold": 150,
      "Historical Revenue": 75000,
      "Confidence Level": "High",
      "Campaign Recommendation": "Run conversion campaign focused on cold regions"
    }
  ];

  xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(data), "Top Campaign Recommendations");

  const filePath = path.join(process.cwd(), 'downloads', 'Template_Opportunity_Insights.xlsx');
  xlsx.writeFile(wb, filePath);
  console.log("Created", filePath);
}

fs.mkdirSync(path.join(process.cwd(), 'downloads'), { recursive: true });
generateSalesTemplate();
generateInsightsTemplate();
