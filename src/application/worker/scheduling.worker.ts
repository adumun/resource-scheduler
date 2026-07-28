/// <reference lib="webworker" />
import { solve } from "@/scheduling-engine/solver";
import type { SchedulingProblem, SolverOptions } from "@/domain/problem";
import type { SchedulingResult } from "@/domain/result";
import type { Progress } from "@/scheduling-engine/types";

export interface SolveRequest {
  type: "solve";
  id: string;
  problem: SchedulingProblem;
  options: SolverOptions;
}

export type WorkerRequest = SolveRequest;

export interface ProgressMessage {
  type: "progress";
  id: string;
  progress: Progress;
}
export interface ResultMessage {
  type: "result";
  id: string;
  results: SchedulingResult[];
}
export interface ErrorMessage {
  type: "error";
  id: string;
  message: string;
}
export type WorkerResponse = ProgressMessage | ResultMessage | ErrorMessage;

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  if (msg.type !== "solve") return;
  try {
    const results = solve(msg.problem, msg.options, (progress) => {
      const response: ProgressMessage = { type: "progress", id: msg.id, progress };
      ctx.postMessage(response);
    });
    const response: ResultMessage = { type: "result", id: msg.id, results };
    ctx.postMessage(response);
  } catch (err) {
    const response: ErrorMessage = { type: "error", id: msg.id, message: (err as Error).message };
    ctx.postMessage(response);
  }
};

export {};
