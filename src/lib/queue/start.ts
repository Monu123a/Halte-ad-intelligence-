import { metaSyncQueue, googleSyncQueue, amazonSyncQueue } from "./queue";
import { syncWorker as metaWorker } from "./metaWorker";
import { googleWorker } from "./googleWorker";
// import amazonWorker from "./amazonWorker" // stub

console.log("Workers started listening...");
