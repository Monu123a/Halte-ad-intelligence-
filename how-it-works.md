# ADuniFY: System Architecture & Workflow

ADuniFY is built around three main pillars: **Ingestion, Intelligence, and Action.**

## 1. Data Ingestion (The Inputs)
The app constantly pulls in data from three completely different sources and standardizes it:

- **Ad Spend (The Connections):** Every morning at 6:00 AM, the background worker securely talks to Meta (and soon Google/Amazon). It downloads every Campaign, Ad Set, and the daily spend/impressions. It automatically parses the captions and targeting to assign the correct Brand, Product, and Region.
- **True Seasonality (Amazon Sales DB):** Instead of guessing when a product sells best, the app looks at your 4-year Amazon Sales history. It mathematically knows that "Snow Chains" peak in January in the North, while "Watering" peaks in Spring.
- **Lead Quality (The Sales Team):** Leads drop into the Leads tab. Your sales team manually calls them and tags them (`GENUINE`, `CONVERTED`, `SPAM`, `QUOTATION SENT`).

## 2. The Intelligence Engine (The Brain)
This is where the magic happens. The system cross-references the Ad Spend with the Lead Quality.

- It completely ignores "Awareness" and "Click" spend when judging lead quality.
- It takes the total money spent strictly on *Messaging* campaigns and divides it purely by the leads your sales team tagged as `GENUINE` or `CONVERTED`. 
- This gives you your true **Cost Per Genuine Lead (CPGL)**—a metric Meta's dashboard cannot possibly give you, because Meta doesn't know which leads were spam!

## 3. Action (The Recommendations)
The engine looks at every single active Ad Set and issues a daily directive:

- **The Seasonal Filter:** If Meta is spending money pushing Snow Chains in July, the engine instantly flags it with a **Hold (Seasonal)**.
- **The Tercile Filter:** For everything else, it ranks your ad sets by their true CPGL. The top 33% most efficient ad sets get an **Increase** recommendation. The middle 33% get a **Hold**. The worst 33% get a **Reduce**. 

---

## Roadmap: Google Ads & Amazon Ads
The database is already 100% ready for Google and Amazon (using generalized `AdConnection`, `platformCampaignId`, etc.). 

**Integration Plan:**
1. **The Connectors:** Build `GoogleAdsConnector` and `AmazonAdsConnector` to standardize ad groups into our universal `AdSet` format.
2. **The OAuth Flow:** Add "Connect Google" and "Connect Amazon" buttons to the Connections UI.
3. **The Sync Worker:** Update the 6:00 AM worker to loop through all enabled connections, dynamically routing to the correct platform API.
