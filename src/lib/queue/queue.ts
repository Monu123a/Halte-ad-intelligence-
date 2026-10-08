import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const metaSyncQueue = new Queue("meta-sync-queue", { connection });
export const googleSyncQueue = new Queue("google-sync-queue", { connection });
export const amazonSyncQueue = new Queue("amazon-sync-queue", { connection });

export async function triggerMetaSync(connectionId: string) {
  await metaSyncQueue.add("sync", { connectionId });
}

export async function triggerGoogleSync(connectionId: string) {
  await googleSyncQueue.add("sync", { connectionId });
}

export async function triggerAmazonSync(connectionId: string) {
  await amazonSyncQueue.add("sync", { connectionId });
}
