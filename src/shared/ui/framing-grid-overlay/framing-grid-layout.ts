export const FRAMING_GRID_DIVISION_COUNT = 3;

export function getFramingGridLinePercentages(
  divisionCount = FRAMING_GRID_DIVISION_COUNT,
): number[] {
  if (!Number.isInteger(divisionCount) || divisionCount < 2) {
    throw new Error("Grid division count must be an integer of at least 2.");
  }

  return Array.from(
    { length: divisionCount - 1 },
    (_, index) => ((index + 1) / divisionCount) * 100,
  );
}
