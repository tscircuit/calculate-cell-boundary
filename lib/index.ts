import type { CellContent, Line } from "./types"

/**
 * Calculate the boundaries between the cells. Lines are drawn in the middle of
 * cell content walls.
 *
 * The algorithm first computes all the midlines between all cells.
 *
 * Then, it computes all the intersections between all midlines.
 *
 * Finally, it computes all the segments between all intersections.
 *
 * We now must determine which segments are part of the boundary. Call these
 * the boundarySegments
 *
 * We can now eliminate any boundarySegment that is does not have the highest
 * distanceToAnyCell among boundarySegments that share it's same fromCellIds
 *
 * We run a greedy path search starting at a remaining boundary segment. We use
 * the segment that has the highest "distanceToAnyCell"
 *
 * Starting at this segment, we evaluate each of the connected segments. We
 * pick the one that has the highest distanceToAnyCell. We then add this segment
 * to our path. We repeat this process without backtracking until we reach a
 * boundary segment.
 *
 * We then look to see if any boundary segments aren't part of a path, if they
 * aren't, we start a new path at that segment.
 *
 * To get our cellBoundaries output, we process each path, making sure to not
 * add duplicate segments, but add each segment to the output.
 *
 */
export const calculateCellBoundariesDebug = (
  inputCellContents: Omit<CellContent, "cellId">[],
): {
  // Add any intermediate outputs here that we might want to visualize
  midlines: Midline[]
  allSegments: Array<Line>
  boundarySegments: Array<Line>
  remainingBoundarySegments: Array<Line>
  paths: Array<Array<Line>>
  cellBoundaries: Array<Line>
} => {
  const cellContents = inputCellContents.map((cellContent, index) => ({
    ...cellContent,
    cellId: `cell-${index}`,
  }))

  throw new Error("Not implemented")
}

export const calculateCellBoundaries = (
  inputCellContents: Omit<CellContent, "cellId">[],
) => {
  const { cellBoundaries } = calculateCellBoundariesDebug(inputCellContents)
  return cellBoundaries
}
