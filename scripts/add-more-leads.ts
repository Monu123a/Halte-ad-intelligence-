import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const adSets = await prisma.adSet.findMany();
  if (adSets.length === 0) {
    console.log("No ad sets found.");
    return;
  }

  const messages = [
    "What is the price?",
    "Do you deliver to Mumbai?",
    "I want to order 5 pieces.",
    "Can you share more pictures?",
    "Is this available in black?",
    "Hello",
    "Please call me",
    "How long does shipping take?",
    "Interested",
    "Is there a warranty?",
    "Does this work with 220V?",
    "I placed an order but haven't received tracking yet.",
    "Do you offer bulk discounts?",
    "Can I return it if I don't like it?",
    "Show me the catalog."
  ];

  const newLeads = [];
  
  for (let i = 0; i < 30; i++) {
    const randomAdSet = adSets[Math.floor(Math.random() * adSets.length)];
    const randomMsg = messages[Math.floor(Math.random() * messages.length)];
    const randomPhone = `+91 ${9000000000 + Math.floor(Math.random() * 999999999)}`;
    
    newLeads.push({
      adSetId: randomAdSet.id,
      contactRef: randomPhone.replace(/(\d{5})(\d{5})/, "$1xxxxx"),
      messageText: randomMsg,
      tag: "UNTAGGED" as const,
    });
  }

  const created = await prisma.lead.createMany({
    data: newLeads
  });

  console.log(`Successfully added ${created.count} new untagged leads for testing.`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
