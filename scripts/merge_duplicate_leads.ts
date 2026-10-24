import prisma from "../src/lib/prisma";
import { normalizePhone } from "../src/lib/leadMatcher";

const TAG_PRIORITY: Record<string, number> = {
  CONVERTED: 5,
  QUOTATION_SENT: 4,
  GENUINE: 3,
  INFO_ONLY: 2,
  SPAM: 1,
  UNTAGGED: 0
};

async function main() {
  console.log("Starting duplicate leads consolidation...");

  const allLeads = await prisma.lead.findMany({
    orderBy: { createdAt: "asc" }
  });

  console.log(`Loaded ${allLeads.length} total leads from database.`);

  const groups = new Map<string, typeof allLeads>();

  for (const l of allLeads) {
    const rawDigits = normalizePhone(l.phoneRaw) || normalizePhone(l.contactRef);
    const key = rawDigits || l.contactRef.trim().toLowerCase();

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(l);
  }

  let mergedCount = 0;
  let deletedCount = 0;

  for (const [key, group] of groups.entries()) {
    if (group.length > 1) {
      console.log(`\nMerging ${group.length} leads for key: ${key}`);

      // Sort by creation time
      group.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      // Master record: pick the one with adSetId or the earliest one
      const master = group.find(g => g.adSetId) || group[0];
      const otherRecords = group.filter(g => g.id !== master.id);

      // Collect all messages
      const allMessages: string[] = [];
      let totalMessagesCount = 0;
      let highestTag = master.tag;
      let highestTagPriority = TAG_PRIORITY[master.tag] || 0;
      let taggedBy = master.taggedBy;
      let taggedAt = master.taggedAt;
      let instance = master.instance;
      let platform = master.platform;
      let accountName = master.accountName;
      let adSetId = master.adSetId;

      for (const rec of group) {
        if (rec.messageText) {
          const parts = rec.messageText.split("\n---\n");
          for (const p of parts) {
            const trimmed = p.trim();
            if (trimmed && !allMessages.includes(trimmed)) {
              allMessages.push(trimmed);
            }
          }
        }
        totalMessagesCount += rec.messagesCount || 1;

        const prio = TAG_PRIORITY[rec.tag] || 0;
        if (prio > highestTagPriority) {
          highestTag = rec.tag;
          highestTagPriority = prio;
          taggedBy = rec.taggedBy || taggedBy;
          taggedAt = rec.taggedAt || taggedAt;
        }

        if (!instance && rec.instance) instance = rec.instance;
        if (!platform && rec.platform) platform = rec.platform;
        if (!accountName && rec.accountName) accountName = rec.accountName;
        if (!adSetId && rec.adSetId) adSetId = rec.adSetId;
      }

      // If instances differ (e.g. Phone 1 and Phone 2), combine them
      const instancesSet = new Set<string>();
      for (const rec of group) {
        if (rec.instance) {
          if (rec.instance.includes("&")) {
            rec.instance.split("&").map(s => s.trim()).forEach(i => instancesSet.add(i));
          } else {
            instancesSet.add(rec.instance.trim());
          }
        }
      }
      if (instancesSet.size > 1) {
        instance = Array.from(instancesSet).join(" & ");
      }

      const combinedText = allMessages.join("\n---\n") || master.messageText;
      const normalizedPhoneNum = normalizePhone(master.phoneRaw) || normalizePhone(master.contactRef);

      // Update master record
      await prisma.lead.update({
        where: { id: master.id },
        data: {
          phoneRaw: normalizedPhoneNum,
          instance: instance || "Phone 1",
          platform: platform || "WhatsApp Direct",
          accountName: accountName || (instance ? `WhatsApp (${instance})` : null),
          messageText: combinedText,
          messagesCount: Math.max(totalMessagesCount, allMessages.length, 1),
          tag: highestTag,
          taggedBy,
          taggedAt,
          adSetId,
          updatedAt: new Date()
        }
      });

      // Delete the duplicate records
      const idsToDelete = otherRecords.map(r => r.id);
      await prisma.lead.deleteMany({
        where: { id: { in: idsToDelete } }
      });

      mergedCount++;
      deletedCount += idsToDelete.length;
      console.log(`  Merged into ${master.id}, deleted ${idsToDelete.length} redundant records.`);
    } else {
      // Ensure phoneRaw is populated on single records if missing
      const single = group[0];
      const normalizedPhoneNum = normalizePhone(single.phoneRaw) || normalizePhone(single.contactRef);
      if (normalizedPhoneNum && single.phoneRaw !== normalizedPhoneNum) {
        await prisma.lead.update({
          where: { id: single.id },
          data: { phoneRaw: normalizedPhoneNum }
        });
      }
    }
  }

  console.log(`\nDone! Successfully merged ${mergedCount} duplicate groups and removed ${deletedCount} redundant rows.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
