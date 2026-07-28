import type { SchedulingProblem, SolverOptions } from "@/domain/problem";
import type { SchedulingResult, UnscheduledActivity } from "@/domain/result";
import type { Assignment } from "@/domain/assignment";
import type { Placement, Instance, Progress } from "./types";
import type { Indexes } from "./indexes";
import { buildIndexes } from "./indexes";
import { buildCandidateConfig, buildInstances, orderInstances } from "./candidates";
import { buildHardRules, UsageIndex, checkPlacement, entryFor, type HardRules } from "./checks";
import { buildSoftRules, softPenaltyOnly, evaluateSoft, type AssignedItem, type SoftRules } from "./penalty";
import { evaluate } from "./evaluate";
import { diagnose } from "./diagnostics";
import { Rng } from "./rng";
import { id } from "@/domain/ids";
import { rid } from "@/domain/ids";

function countAssigned(assigned: (Placement | null)[]): number {
  let c = 0;
  for (const p of assigned) if (p !== null) c += 1;
  return c;
}

function rebuildUsage(
  assigned: (Placement | null)[],
  instances: Instance[],
  indexes: Indexes,
): UsageIndex {
  const usage = new UsageIndex();
  for (let i = 0; i < assigned.length; i += 1) {
    const p = assigned[i];
    if (p == null) continue;
    const slot = indexes.slotsById.get(p.slotId);
    if (slot === undefined) continue;
    usage.add(entryFor(instances[i]!, i, slot, p));
  }
  return usage;
}

function buildItems(
  assigned: (Placement | null)[],
  instances: Instance[],
  indexes: Indexes,
): AssignedItem[] {
  const items: AssignedItem[] = [];
  for (let i = 0; i < assigned.length; i += 1) {
    const p = assigned[i];
    if (p == null) continue;
    const slot = indexes.slotsById.get(p.slotId);
    if (slot === undefined) continue;
    items.push({ instance: instances[i]!, placement: p, slot, instanceOrder: i });
  }
  return items;
}

function samePlacement(a: Placement, b: Placement): boolean {
  if (a.slotId !== b.slotId) return false;
  if (a.resources.length !== b.resources.length) return false;
  for (let k = 0; k < a.resources.length; k += 1) {
    if (a.resources[k]!.resourceId !== b.resources[k]!.resourceId) return false;
  }
  return true;
}

function greedyAssign(
  instances: Instance[],
  indexes: Indexes,
  rules: HardRules,
  rng: Rng,
): { assigned: (Placement | null)[]; usage: UsageIndex } {
  const n = instances.length;
  const assigned: (Placement | null)[] = new Array(n).fill(null);
  const usage = new UsageIndex();
  const perm = rng.shuffle(instances.map((_, i) => i));
  for (const i of perm) {
    const inst = instances[i]!;
    if (inst.placements.length === 0) continue;
    let chosen: Placement | null = null;
    const shuffledPlacements = rng.shuffle(inst.placements);
    for (const p of shuffledPlacements) {
      const slot = indexes.slotsById.get(p.slotId);
      if (slot === undefined) continue;
      if (checkPlacement(usage, rules, slot, p, inst, i).ok) {
        chosen = p;
        break;
      }
    }
    if (chosen !== null) {
      assigned[i] = chosen;
      const slot = indexes.slotsById.get(chosen.slotId)!;
      usage.add(entryFor(inst, i, slot, chosen));
    }
  }
  return { assigned, usage };
}

function localSearch(
  assigned: (Placement | null)[],
  instances: Instance[],
  indexes: Indexes,
  hardRules: HardRules,
  softRules: SoftRules,
  options: SolverOptions,
  rng: Rng,
  start: number,
  onProgress?: (p: Progress) => void,
  shouldCancel?: () => boolean,
): void {
  const n = instances.length;
  const usage = rebuildUsage(assigned, instances, indexes);
  let items = buildItems(assigned, instances, indexes);
  let currentPenalty = softPenaltyOnly(items, softRules);
  let bestCount = countAssigned(assigned);
  let bestPenalty = currentPenalty;
  let bestAssigned = assigned.slice();

  const T0 = 8;
  const Tend = 0.05;
  const maxIter = options.maxIterations;

  for (let iter = 0; iter < maxIter; iter += 1) {
    if (shouldCancel?.()) break;
    if (iter % 128 === 0) {
      const elapsed = Date.now() - start;
      if (elapsed > options.timeoutMs) break;
      if (onProgress !== undefined) {
        onProgress({
          phase: "improving",
          assigned: bestCount,
          total: n,
          bestScore: Math.max(0, Math.round(100 - bestPenalty)),
          elapsedMs: elapsed,
        });
      }
    }

    const i = rng.int(0, n - 1);
    const inst = instances[i]!;
    if (inst.placements.length === 0) continue;
    const candidate = rng.pick(inst.placements);
    if (candidate === undefined) continue;
    const prev = assigned[i] ?? null;
    if (prev !== null && samePlacement(prev, candidate)) continue;

    usage.remove(i);
    const slot = indexes.slotsById.get(candidate.slotId);
    if (slot === undefined) {
      if (prev !== null) usage.add(entryFor(inst, i, indexes.slotsById.get(prev.slotId)!, prev));
      continue;
    }
    const check = checkPlacement(usage, hardRules, slot, candidate, inst, i);
    if (!check.ok) {
      if (prev !== null) usage.add(entryFor(inst, i, indexes.slotsById.get(prev.slotId)!, prev));
      continue;
    }

    assigned[i] = candidate;
    usage.add(entryFor(inst, i, slot, candidate));
    items = buildItems(assigned, instances, indexes);
    const newPenalty = softPenaltyOnly(items, softRules);
    const delta = newPenalty - currentPenalty;
    const wasUnassigned = prev === null;
    const temp = T0 * Math.pow(Tend / T0, iter / maxIter);
    const accept = wasUnassigned || delta < 0 || rng.float() < Math.exp(-delta / Math.max(temp, 0.001));

    if (accept) {
      currentPenalty = newPenalty;
      const count = countAssigned(assigned);
      if (count > bestCount || (count === bestCount && currentPenalty < bestPenalty)) {
        bestCount = count;
        bestPenalty = currentPenalty;
        bestAssigned = assigned.slice();
      }
    } else {
      usage.remove(i);
      assigned[i] = prev;
      if (prev !== null) usage.add(entryFor(inst, i, indexes.slotsById.get(prev.slotId)!, prev));
    }
  }

  for (let k = 0; k < assigned.length; k += 1) assigned[k] = bestAssigned[k] ?? null;
}

export function solveOnce(
  problem: SchedulingProblem,
  options: SolverOptions,
  rng: Rng,
  onProgress?: (p: Progress) => void,
  shouldCancel?: () => boolean,
): SchedulingResult {
  const start = Date.now();
  const indexes = buildIndexes(problem);
  const config = buildCandidateConfig(problem);
  const rawInstances = buildInstances(problem, indexes, config, rng);
  const instances = orderInstances(rawInstances, rng);
  const n = instances.length;
  const hardRules = buildHardRules(problem);
  const softRules = buildSoftRules(problem);

  onProgress?.({ phase: "candidates", assigned: 0, total: n, bestScore: 0, elapsedMs: 0 });

  const restarts =
    options.optimizationLevel === "fast" ? 6 : options.optimizationLevel === "balanced" ? 18 : 45;

  let bestAssigned: (Placement | null)[] = new Array(n).fill(null);
  let bestCount = -1;
  let bestPenalty = Infinity;

  for (let r = 0; r < restarts; r += 1) {
    if (shouldCancel?.()) break;
    if (Date.now() - start > options.timeoutMs * 0.6) break;
    const { assigned } = greedyAssign(instances, indexes, hardRules, rng);
    const count = countAssigned(assigned);
    if (count > 0) {
      const items = buildItems(assigned, instances, indexes);
      const penalty = softPenaltyOnly(items, softRules);
      if (count > bestCount || (count === bestCount && penalty < bestPenalty)) {
        bestCount = count;
        bestPenalty = penalty;
        bestAssigned = assigned.slice();
      }
    }
    if (count === n) break;
    onProgress?.({
      phase: "searching",
      assigned: bestCount,
      total: n,
      bestScore: Math.max(0, Math.round(100 - bestPenalty)),
      elapsedMs: Date.now() - start,
    });
  }

  if (bestCount <= 0) {
    bestAssigned = greedyAssign(instances, indexes, hardRules, rng).assigned;
    bestCount = countAssigned(bestAssigned);
  }

  localSearch(
    bestAssigned,
    instances,
    indexes,
    hardRules,
    softRules,
    options,
    rng,
    start,
    onProgress,
    shouldCancel,
  );

  const items = buildItems(bestAssigned, instances, indexes);
  const { hardViolations, softViolations, score } = evaluate(problem, indexes, items);

  const unscheduledOrders = new Set<number>();
  for (let i = 0; i < bestAssigned.length; i += 1) {
    if (bestAssigned[i] === null) unscheduledOrders.add(i);
  }
  const unscheduled: UnscheduledActivity[] = [];
  for (const i of unscheduledOrders) {
    const inst = instances[i]!;
    unscheduled.push({
      activityId: rid(inst.activityId),
      instanceIndex: inst.instanceIndex,
      reason: inst.placements.length === 0 ? "No feasible placement exists." : "All placements conflict with hard constraints.",
    });
  }

  const diagnostics = diagnose(problem, indexes, instances, unscheduledOrders);

  const assignments: Assignment[] = items.map((item) => ({
    id: id.assignment(),
    activityId: rid(item.instance.activityId),
    instanceIndex: item.instance.instanceIndex,
    slotId: item.placement.slotId,
    resources: item.placement.resources.map((r) => ({ role: r.role, resourceId: r.resourceId })),
  }));

  const valid = hardViolations.length === 0 && unscheduled.length === 0;

  onProgress?.({
    phase: "finalizing",
    assigned: assignments.length,
    total: n,
    bestScore: score.value,
    elapsedMs: Date.now() - start,
  });

  return {
    scheduleId: problem.scheduleId,
    solutionId: id.solution(),
    assignments,
    unscheduled,
    score,
    hardViolations,
    softViolations,
    diagnostics,
    generatedAt: new Date().toISOString(),
    elapsedMs: Date.now() - start,
    solverOptions: options,
    seed: rng.seed,
    valid,
  };
}

function resultSignature(result: SchedulingResult): string {
  const parts = result.assignments
    .map((a) => `${a.activityId}#${a.instanceIndex}@${a.slotId}[${a.resources.map((r) => r.resourceId).join(",")}]`)
    .sort();
  return parts.join("|");
}

export function solve(
  problem: SchedulingProblem,
  options: SolverOptions,
  onProgress?: (p: Progress) => void,
  shouldCancel?: () => boolean,
): SchedulingResult[] {
  const count = Math.max(1, options.alternativeCount);
  const results: SchedulingResult[] = [];
  const seen = new Set<string>();
  for (let k = 0; k < count + 2; k += 1) {
    if (shouldCancel?.()) break;
    const seed = (options.seed + k * 0x9e3779b9) >>> 0;
    const rng = new Rng(seed);
    const result = solveOnce(problem, { ...options, seed }, rng, onProgress, shouldCancel);
    const sig = resultSignature(result);
    if (!seen.has(sig)) {
      seen.add(sig);
      results.push(result);
    }
    if (results.length >= count) break;
  }
  return results.sort((a, b) => b.score.value - a.score.value);
}

export const schedulingEngine: import("./types").SchedulingEngine = { solve };

export { evaluateSoft };
