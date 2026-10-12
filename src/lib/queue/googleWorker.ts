import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { runGoogleSync } from "../sync/googleSync";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const googleWorker = new Worker(
  "google-sync-queue",
  async (job: Job) => {
    const { connectionId } = job.data;
    await runGoogleSync(connectionId);
  },
  { connection }
);
