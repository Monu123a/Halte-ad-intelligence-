import { MetaAdsConnector } from "../src/lib/connector/meta";

const connector = new MetaAdsConnector();
const token = process.env.META_ACCESS_TOKEN;
const accountId = "act_311914471593198";

async function main() {
  const campaigns = await connector.fetchCampaigns(token, accountId);
  const sample = campaigns.find(c => c.name.includes("Work smarter"));
  if (sample) {
    const firstAd = sample.rawResponse?.ads?.data?.[0];
    if (firstAd) {
      console.log(JSON.stringify(firstAd.creative, null, 2));
    }
  }
}
main();
