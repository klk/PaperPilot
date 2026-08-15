type Waiter = {
  resolve: (release: () => void) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

declare global {
  // eslint-disable-next-line no-var
  var paperpilotWorkerQueue: { active: number; waiting: Waiter[] } | undefined;
}

const state = global.paperpilotWorkerQueue ?? { active: 0, waiting: [] };
global.paperpilotWorkerQueue = state;

function configuredConcurrency() {
  const value = Number(process.env.WORKER_CONCURRENCY || 2);
  return Number.isInteger(value) && value > 0 ? Math.min(value, 16) : 2;
}

function releaseSlot() {
  const next = state.waiting.shift();
  if (next) {
    clearTimeout(next.timer);
    next.resolve(releaseSlot);
    return;
  }
  state.active = Math.max(0, state.active - 1);
}

export function acquireWorkerSlot(timeoutMs = 15_000): Promise<() => void> {
  if (state.active < configuredConcurrency()) {
    state.active += 1;
    return Promise.resolve(releaseSlot);
  }
  const maxQueue = Number(process.env.WORKER_QUEUE_SIZE || 20);
  if (state.waiting.length >= maxQueue) return Promise.reject(new Error("WORKER_QUEUE_FULL"));
  return new Promise((resolve, reject) => {
    const waiter: Waiter = {
      resolve,
      reject,
      timer: setTimeout(() => {
        const index = state.waiting.indexOf(waiter);
        if (index >= 0) state.waiting.splice(index, 1);
        reject(new Error("WORKER_QUEUE_TIMEOUT"));
      }, timeoutMs),
    };
    state.waiting.push(waiter);
  });
}

export function workerQueueStatus() {
  return { active: state.active, waiting: state.waiting.length, concurrency: configuredConcurrency() };
}
