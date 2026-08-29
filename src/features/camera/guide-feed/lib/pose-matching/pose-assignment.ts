import type {
  CommonPose,
  PoseAssignment,
  PosePairMatch,
} from "./types";
import type { PoseMatchConfig } from "./pose-match-config";
import { matchPosePair } from "./pose-geometry";

interface AssignmentCandidate {
  targetIndex: number;
  liveIndex: number;
  cost: number;
  match: PosePairMatch;
}

function getAssignmentCost(
  match: PosePairMatch,
  config: PoseMatchConfig,
) {
  const { position, scale, pose } = match.score;
  return (
    ((100 - position) / 100) * config.assignmentWeights.position +
    ((100 - scale) / 100) * config.assignmentWeights.scale +
    ((100 - pose) / 100) * config.assignmentWeights.pose
  );
}

function createCandidates(
  targets: readonly CommonPose[],
  livePoses: readonly CommonPose[],
  config: PoseMatchConfig,
) {
  return targets.map((target, targetIndex) =>
    livePoses.map((live, liveIndex): AssignmentCandidate => {
      const match = matchPosePair(target, live, config);
      return {
        targetIndex,
        liveIndex,
        match,
        cost: getAssignmentCost(match, config),
      };
    }),
  );
}

function exactAssignment(
  candidates: AssignmentCandidate[][],
  targetCount: number,
  liveCount: number,
) {
  const targetIsSmaller = targetCount <= liveCount;
  const rowCount = Math.min(targetCount, liveCount);
  const columnCount = Math.max(targetCount, liveCount);
  let bestCost = Number.POSITIVE_INFINITY;
  let bestSelection: AssignmentCandidate[] = [];

  function search(
    row: number,
    usedColumns: Set<number>,
    selection: AssignmentCandidate[],
    totalCost: number,
  ) {
    if (totalCost >= bestCost) return;
    if (row === rowCount) {
      bestCost = totalCost;
      bestSelection = [...selection];
      return;
    }

    for (let column = 0; column < columnCount; column += 1) {
      if (usedColumns.has(column)) continue;
      const candidate = targetIsSmaller
        ? candidates[row][column]
        : candidates[column][row];
      usedColumns.add(column);
      selection.push(candidate);
      search(
        row + 1,
        usedColumns,
        selection,
        totalCost + candidate.cost,
      );
      selection.pop();
      usedColumns.delete(column);
    }
  }

  search(0, new Set(), [], 0);
  return bestSelection;
}

function greedyAssignment(
  candidates: AssignmentCandidate[][],
  targetCount: number,
  liveCount: number,
) {
  const sortedCandidates = candidates
    .flat()
    .sort((first, second) => first.cost - second.cost);
  const usedTargets = new Set<number>();
  const usedLive = new Set<number>();
  const selection: AssignmentCandidate[] = [];

  for (const candidate of sortedCandidates) {
    if (
      usedTargets.has(candidate.targetIndex) ||
      usedLive.has(candidate.liveIndex)
    ) {
      continue;
    }
    usedTargets.add(candidate.targetIndex);
    usedLive.add(candidate.liveIndex);
    selection.push(candidate);

    if (selection.length === Math.min(targetCount, liveCount)) break;
  }

  return selection;
}

export function assignPoses(
  targets: readonly CommonPose[],
  livePoses: readonly CommonPose[],
  config: PoseMatchConfig,
): {
  assignments: PoseAssignment[];
  unmatchedTargetIndices: number[];
  unmatchedLiveIndices: number[];
} {
  if (targets.length === 0 || livePoses.length === 0) {
    return {
      assignments: [],
      unmatchedTargetIndices: targets.map((_, index) => index),
      unmatchedLiveIndices: livePoses.map((_, index) => index),
    };
  }

  const candidates = createCandidates(targets, livePoses, config);
  const useExactAssignment =
    Math.max(targets.length, livePoses.length) <=
    config.maxExactAssignmentPeople;
  const selection = useExactAssignment
    ? exactAssignment(candidates, targets.length, livePoses.length)
    : greedyAssignment(candidates, targets.length, livePoses.length);
  const assignedTargetIndices = new Set(
    selection.map(({ targetIndex }) => targetIndex),
  );
  const assignedLiveIndices = new Set(
    selection.map(({ liveIndex }) => liveIndex),
  );

  return {
    assignments: selection
      .map(({ targetIndex, liveIndex, match }) => ({
        targetIndex,
        liveIndex,
        score: match.score.overall,
        match,
      }))
      .sort((first, second) => first.targetIndex - second.targetIndex),
    unmatchedTargetIndices: targets
      .map((_, index) => index)
      .filter((index) => !assignedTargetIndices.has(index)),
    unmatchedLiveIndices: livePoses
      .map((_, index) => index)
      .filter((index) => !assignedLiveIndices.has(index)),
  };
}
