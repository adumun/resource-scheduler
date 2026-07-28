import type { SchedulingProblem, SolverOptions } from "@/domain/problem";
import type { SchedulingResult } from "@/domain/result";
import type { Progress } from "@/scheduling-engine/types";
import type { WorkerRequest, WorkerResponse } from "./scheduling.worker";
import { createId } from "@/domain/ids";

export class CancelledError extends Error {
  constructor() {
    super("Scheduling cancelled.");
    this.name = "CancelledError";
  }
}

export interface SolveHandle {
  promise: Promise<SchedulingResult[]>;
  cancel: () => void;
}

let workerFactory: (() => Worker) | null = null;

export function configureWorkerFactory(factory: () => Worker): void {
  workerFactory = factory;
}

function defaultWorker(): Worker {
  return new Worker(new URL("./scheduling.worker.ts", import.meta.url), { type: "module" });
}

export function solveInWorker(
  problem: SchedulingProblem,
  options: SolverOptions,
  onProgress?: (progress: Progress) => void,
): SolveHandle {
  const factory = workerFactory ?? defaultWorker;
  const worker = factory();
  const jobId = createId("job");
  let cancelled = false;
  let settled = false;

  const promise = new Promise<SchedulingResult[]>((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const msg = event.data;
      if (msg.id !== jobId) return;
      if (msg.type === "progress") {
        onProgress?.(msg.progress);
      } else if (msg.type === "result") {
        settled = true;
        worker.terminate();
        if (cancelled) reject(new CancelledError());
        else resolve(msg.results);
      } else if (msg.type === "error") {
        settled = true;
        worker.terminate();
        reject(new Error(msg.message));
      }
    };
    worker.onerror = (event) => {
      if (settled) return;
      settled = true;
      worker.terminate();
      reject(new Error(event.message || "Worker error."));
    };
    const request: WorkerRequest = { type: "solve", id: jobId, problem, options };
    worker.postMessage(request);
  });

  const cancel = () => {
    if (settled) return;
    cancelled = true;
    settled = true;
    worker.terminate();
  };

  return { promise, cancel };
}
