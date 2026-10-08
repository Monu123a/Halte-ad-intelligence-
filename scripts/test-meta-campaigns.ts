import { MetaAdsConnector } from "../src/lib/connector/meta";

const connector = new MetaAdsConnector();
const token = process.env.META_ACCESS_TOKEN;
const accountId = "act_311914471593198"; // Updated to the active account

async function main() {
  if (!token) {
    console.error("Please provide the Meta Access Token:");
    console.error("META_ACCESS_TOKEN='your_token' npx tsx scripts/test-meta-campaigns.ts");
    process.exit(1);
  }

  console.log(`Fetching campaigns for ${accountId}...`);
  try {
    const campaigns = await connector.fetchCampaigns(token, accountId);
    console.log(`Successfully fetched ${campaigns.length} campaigns. Displaying first 3...`);
    
    const sample = campaigns.slice(0, 3);
    for (const c of sample) {
      console.log(`\n=== Campaign ID: ${c.id} ===`);
      console.log(`Name/Caption: ${c.name}`);
      console.log(`Objective: ${c.objective}`);
      
      const firstAd = c.rawResponse?.ads?.data?.[0];
      if (firstAd) {
        console.log("Creative Fields found:");
        console.log("- page_id:", firstAd.creative?.object_story_spec?.page_id);
        console.log("- instagram_actor_id:", firstAd.creative?.instagram_actor_id);
        console.log("- object_story_spec:", JSON.stringify(firstAd.creative?.object_story_spec, null, 2));
      } else {
        console.log("No ads data returned for this campaign.");
      }
    }

    console.log(`\n\nFetching ad sets for targeting inspection...`);
    const adSets = await connector.fetchAdSets(token, accountId);
    const sampleAdSets = adSets.slice(0, 3);
    for (const a of sampleAdSets) {
      console.log(`\n=== Ad Set ID: ${a.id} ===`);
      console.log(`Name: ${a.name}`);
      console.log(`Targeting: ${JSON.stringify(a.rawResponse?.targeting, null, 2)}`);
    }

  } catch (err: any) {
    console.error("Error fetching campaigns:", err.message);
  }
}

main();
