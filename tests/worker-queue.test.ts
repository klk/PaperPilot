import assert from "node:assert/strict";
import test from "node:test";
import { acquireWorkerSlot, workerQueueStatus } from "../lib/worker-queue";

test("worker queue bounds concurrent work and releases slots", async () => {
  const previousConcurrency = process.env.WORKER_CONCURRENCY;
  process.env.WORKER_CONCURRENCY = "1";
  const release = await acquireWorkerSlot();
  assert.equal(workerQueueStatus().active, 1);
  await assert.rejects(() => acquireWorkerSlot(5), /WORKER_QUEUE_TIMEOUT/);
  release();
  assert.equal(workerQueueStatus().active, 0);
  if (previousConcurrency === undefined) delete process.env.WORKER_CONCURRENCY;
  else process.env.WORKER_CONCURRENCY = previousConcurrency;
});
