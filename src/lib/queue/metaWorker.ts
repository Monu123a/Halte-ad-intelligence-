import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { runMetaSync } from "../sync/metaSync";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const syncWorker = new Worker(
  "meta-sync-queue",
  async (job: Job) => {
    const { connectionId } = job.data;
    await runMetaSync(connectionId);
  },
  { connection }
);
