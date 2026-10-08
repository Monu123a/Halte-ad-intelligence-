// prisma/seed-demo.ts
//
// Fills the database with realistic demo data so the app has something to
// show today, without a real Meta connection yet.
//
// HOW TO RUN:
//   1. Save this file as prisma/seed-demo.ts in your project
//   2. Check the field names below against your actual prisma/schema.prisma
//      — if you renamed anything (e.g. SeasonalRule fields), adjust here first
//   3. Run:  npx tsx prisma/seed-demo.ts
//
// This is DEMO data only — every spend/lead number below is made up to look
// realistic. Be upfront if asked directly that it's sample data for the demo,
// not live numbers yet.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding demo data...");

  // ---------- 1. BRANDS ----------
  const gardena = await prisma.brand.upsert({
    where: { pageId: "demo_page_gardena" },
    update: {},
    create: {
      name: "Gardena",
      colorToken: "green",
      isSeasonal: true,
      pageId: "demo_page_gardena",
    },
  });

  const bkr = await prisma.brand.upsert({
    where: { pageId: "demo_page_bkr" },
    update: {},
    create: {
      name: "BKR",
      colorToken: "amber",
      isSeasonal: true,
      pageId: "demo_page_bkr",
    },
  });

  const gorilla = await prisma.brand.upsert({
    where: { pageId: "demo_page_gorilla" },
    update: {},
    create: {
      name: "Gorilla",
      colorToken: "slate",
      isSeasonal: false,
      pageId: "demo_page_gorilla",
    },
  });

  const velcro = await prisma.brand.upsert({
    where: { pageId: "demo_page_velcro" },
    update: {},
    create: {
      name: "Velcro",
      colorToken: "rust",
      isSeasonal: false,
      pageId: "demo_page_velcro",
    },
  });

  // ---------- 2. META CONNECTION (the one real ad account you have access to) ----------
  const connection = await prisma.adConnection.upsert({
    where: { platformAccountId: "act_311914471593198" },
    update: {},
    create: {
      platform: "META",
      platformAccountId: "act_311914471593198",
      label: "Halte India Main (demo — not yet syncing live)",
      accessTokenEnc: "demo_placeholder_not_a_real_token",
      status: "PENDING", // honestly reflect that this isn't a real live sync yet
      lastSyncedAt: null,
    },
  });

  // ---------- 3. CAMPAIGNS + AD SETS ----------
  type CampaignSeed = {
    brand: typeof gardena;
    name: string;
    product: string;
    format: string;
    objective: string;
    region: string;
    adSetName: string;
  };

  const campaignSeeds: CampaignSeed[] = [
    { brand: gardena, name: "Sprinklers — Carousel", product: "Watering (sprinklers etc.)", format: "Carousel", objective: "Messages", region: "West", adSetName: "Sprinklers — Carousel — Messages" },
    { brand: gardena, name: "Hose Reels — Static", product: "Hose Reels", format: "Static", objective: "ProfileVisit", region: "South", adSetName: "Hose Reels — Static — Profile Visit" },
    { brand: bkr, name: "Snow Chains — Static", product: "Snow Chains", format: "Static", objective: "Messages", region: "North", adSetName: "Snow Chains — Static — North region" },
    { brand: bkr, name: "Fogging Machine — Carousel", product: "Fogging M/C", format: "Carousel", objective: "Messages", region: "East", adSetName: "Fogging Machine — Carousel — East region" },
    { brand: gorilla, name: "Mounting Tape — Reel", product: "Mounting Tape", format: "Reel", objective: "Engagement", region: "All India", adSetName: "Mounting Tape — Reel — Broad" },
    { brand: velcro, name: "Cord Organiser — Static", product: "Cord Organiser", format: "Static", objective: "ProfileVisit", region: "All India", adSetName: "Cord Organiser — Static — Profile Visit" },
  ];

  const createdAdSets: Record<string, string> = {};

  for (const seed of campaignSeeds) {
    const platformCampaignId = `demo_campaign_${seed.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;

    const campaign = await prisma.campaign.upsert({
      where: { platformCampaignId },
      update: {},
      create: {
        adConnectionId: connection.id,
        // Since Campaign.brandPageId references Brand.pageId in our schema, we pass the pageId here
        brandPageId: seed.brand.pageId,
        platformCampaignId,
        name: seed.name,
        pageId: seed.brand.pageId,
        objective: seed.objective,
        format: seed.format,
        region: seed.region,
        product: seed.product,
      },
    });

    const platformAdSetId = `demo_adset_${seed.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;

    const adSet = await prisma.adSet.upsert({
      where: { platformAdSetId },
      update: {},
      create: {
        platformAdSetId,
        name: seed.adSetName,
        campaignId: campaign.id,
      },
    });

    createdAdSets[seed.adSetName] = adSet.id;

    // ---------- 4. DAILY METRICS (last 14 days) ----------
    const baseSpend = 800 + Math.random() * 2500; // per-day spend varies by ad set
    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const dailySpend = Math.round(baseSpend * (0.8 + Math.random() * 0.4));

      await prisma.dailyMetric.upsert({
        where: { adSetId_date: { adSetId: adSet.id, date } },
        update: {},
        create: {
          adSetId: adSet.id,
          date,
          spend: dailySpend,
          impressions: Math.round(dailySpend * (15 + Math.random() * 10)),
          clicks: Math.round(dailySpend * (0.08 + Math.random() * 0.05)),
          rawResponse: { demo: true },
        },
      });
    }
  }

  // ---------- 5. LEADS (tagged, so Overview + Lead Tagging pages have real data) ----------
  const leadSeeds = [
    { adSet: "Sprinklers — Carousel — Messages", contactRef: "+91 98xxxxx211", messageText: "I need more info on this product", tag: "SPAM" },
    { adSet: "Sprinklers — Carousel — Messages", contactRef: "+91 91xxxxx004", messageText: "Is the 15m sprinkler in stock?", tag: "GENUINE" },
    { adSet: "Sprinklers — Carousel — Messages", contactRef: "+91 90xxxxx552", messageText: "Placed the order, thank you!", tag: "CONVERTED" },
    { adSet: "Hose Reels — Static — Profile Visit", contactRef: "+91 87xxxxx045", messageText: "Is this available in 25m size, what's the price?", tag: "GENUINE" },
    { adSet: "Hose Reels — Static — Profile Visit", contactRef: "+91 99xxxxx630", messageText: "👍", tag: "SPAM" },
    { adSet: "Snow Chains — Static — North region", contactRef: "+91 96xxxxx781", messageText: "Do these fit a Mahindra Thar?", tag: "GENUINE" },
    { adSet: "Snow Chains — Static — North region", contactRef: "+91 93xxxxx220", messageText: "Ordered yesterday, confirming delivery", tag: "CONVERTED" },
    { adSet: "Fogging Machine — Carousel — East region", contactRef: "+91 90xxxxx782", messageText: "Ordered yesterday, wanted to confirm delivery", tag: "CONVERTED" },
    { adSet: "Fogging Machine — Carousel — East region", contactRef: "+91 88xxxxx113", messageText: "What chemicals work with this machine?", tag: "GENUINE" },
    { adSet: "Mounting Tape — Reel — Broad", contactRef: "+91 97xxxxx445", messageText: "Does this hold on textured walls?", tag: "GENUINE" },
    { adSet: "Mounting Tape — Reel — Broad", contactRef: "+91 92xxxxx998", messageText: "price?", tag: "SPAM" },
    { adSet: "Cord Organiser — Static — Profile Visit", contactRef: "+91 99xxxxx630", messageText: "👍", tag: "SPAM" },
    // A couple left untagged so the Lead Tagging page has something to demo live
    { adSet: "Sprinklers — Carousel — Messages", contactRef: "+91 95xxxxx310", messageText: "Can I get a bulk discount for 10 units?", tag: "UNTAGGED" },
    { adSet: "Snow Chains — Static — North region", contactRef: "+91 94xxxxx667", messageText: "What sizes do you have available?", tag: "UNTAGGED" },
  ];

  for (const lead of leadSeeds) {
    const adSetId = createdAdSets[lead.adSet];
    if (!adSetId) continue;

    await prisma.lead.create({
      data: {
        adSetId,
        contactRef: lead.contactRef,
        messageText: lead.messageText,
        tag: lead.tag as any,
        taggedAt: lead.tag !== "UNTAGGED" ? new Date() : null,
      },
    });
  }

  // ---------- 6. SEASONAL RULES (adjust model name if yours differs) ----------
  try {
    await prisma.seasonalRule.upsert({
      where: { product: "Snow Chains" },
      update: {},
      create: {
        product: "Snow Chains",
        validRegions: ["North"],
        validMonths: [11, 12, 1, 2],
      },
    });
    await prisma.seasonalRule.upsert({
      where: { product: "Watering (sprinklers etc.)" },
      update: {},
      create: {
        product: "Watering (sprinklers etc.)",
        validRegions: ["West", "South"],
        validMonths: [2, 3, 4, 5],
      },
    });
  } catch (e) {
    console.log("Skipped seasonal rules — check your SeasonalRule model field names if this errors.");
  }

  console.log("Demo data seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
