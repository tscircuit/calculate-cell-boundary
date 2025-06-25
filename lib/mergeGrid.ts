import type { Line, CellContent } from "./internalTypes"
import { POINT_COMPARISON_TOLERANCE, pointsEqual } from "./utils"
import { areAdjacent, edgeToEdgeDistance } from "./rectUtils"

interface WorkRect extends CellContent {
  merged: boolean
  groupId: number | null
  minBoundingSegmentDistance: number
}

export const mergeGridRects = (
  validSegments: Line[],
  gridRects: CellContent[],
  cellContainingRects: CellContent[],
  cellContents: CellContent[],
): {
  mergedRectGroups: CellContent[][]
  groupedRects: Array<CellContent & { groupId: number }>
} => {
  const workRects: WorkRect[] = gridRects.map((r) => {
    let minDistanceForRect = Infinity
    const { x, y, width, height } = r

    validSegments.forEach((segment) => {
      const sx1 = Math.min(segment.start.x, segment.end.x)
      const sx2 = Math.max(segment.start.x, segment.end.x)
      const sy1 = Math.min(segment.start.y, segment.end.y)
      const sy2 = Math.max(segment.start.y, segment.end.y)

      const segmentIsHorizontal =
        Math.abs(segment.start.y - segment.end.y) < POINT_COMPARISON_TOLERANCE
      const segmentIsVertical =
        Math.abs(segment.start.x - segment.end.x) < POINT_COMPARISON_TOLERANCE

      let onBoundary = false
      if (segmentIsHorizontal) {
        if (
          (Math.abs(sy1 - y) < POINT_COMPARISON_TOLERANCE ||
            Math.abs(sy1 - (y + height)) < POINT_COMPARISON_TOLERANCE) &&
          sx1 < x + width - POINT_COMPARISON_TOLERANCE &&
          sx2 > x + POINT_COMPARISON_TOLERANCE &&
          Math.max(sx1, x) + POINT_COMPARISON_TOLERANCE <
            Math.min(sx2, x + width)
        ) {
          onBoundary = true
        }
      } else if (segmentIsVertical) {
        if (
          (Math.abs(sx1 - x) < POINT_COMPARISON_TOLERANCE ||
            Math.abs(sx1 - (x + width)) < POINT_COMPARISON_TOLERANCE) &&
          sy1 < y + height - POINT_COMPARISON_TOLERANCE &&
          sy2 > y + POINT_COMPARISON_TOLERANCE &&
          Math.max(sy1, y) + POINT_COMPARISON_TOLERANCE <
            Math.min(sy2, y + height)
        ) {
          onBoundary = true
        }
      }

      if (onBoundary && segment.distanceToAnyCell !== undefined) {
        minDistanceForRect = Math.min(
          minDistanceForRect,
          segment.distanceToAnyCell,
        )
      }
    })

    return {
      ...r,
      merged: false,
      groupId: null,
      minBoundingSegmentDistance: minDistanceForRect,
    }
  })

  cellContainingRects.forEach((contRect, idx) => {
    const wr = workRects.find(
      (w) =>
        pointsEqual({ x: w.x, y: w.y }, { x: contRect.x, y: contRect.y }) &&
        Math.abs(w.width - contRect.width) < POINT_COMPARISON_TOLERANCE &&
        Math.abs(w.height - contRect.height) < POINT_COMPARISON_TOLERANCE,
    )
    if (wr) {
      wr.merged = true
      wr.groupId = idx
    }
  })

  let unmergedRectsProcessingList: WorkRect[] = workRects
    .filter((r) => !r.merged)
    .sort((a, b) => a.minBoundingSegmentDistance - b.minBoundingSegmentDistance)

  let keepProcessing = true
  while (keepProcessing && unmergedRectsProcessingList.length > 0) {
    keepProcessing = false
    const remainingAfterPass: WorkRect[] = []

    for (const rectToConsider of unmergedRectsProcessingList) {
      const currentRectState = workRects.find(
        (wr) => wr.cellId === rectToConsider.cellId,
      )

      if (!currentRectState || currentRectState.merged) {
        continue
      }

      const neighbours = workRects.filter(
        (other) => other.merged && areAdjacent(currentRectState, other),
      )

      if (neighbours.length > 0) {
        currentRectState.merged = true
        keepProcessing = true

        if (neighbours.length === 1) {
          currentRectState.groupId = neighbours[0].groupId
        } else {
          let bestGroupId = null
          let minDistanceToOriginalCell = Infinity
          for (const neighbour of neighbours) {
            if (neighbour.groupId === null) continue

            const originalCellForGroup = cellContents[neighbour.groupId]
            const distance = edgeToEdgeDistance(
              currentRectState,
              originalCellForGroup,
            )

            if (distance < minDistanceToOriginalCell) {
              minDistanceToOriginalCell = distance
              bestGroupId = neighbour.groupId
            } else if (distance === minDistanceToOriginalCell) {
              if (
                bestGroupId === null ||
                (neighbour.groupId !== null && neighbour.groupId < bestGroupId)
              ) {
                bestGroupId = neighbour.groupId
              }
            }
          }
          currentRectState.groupId = bestGroupId
        }
      } else {
        remainingAfterPass.push(rectToConsider)
      }
    }
    unmergedRectsProcessingList = remainingAfterPass.sort(
      (a, b) => a.minBoundingSegmentDistance - b.minBoundingSegmentDistance,
    )
  }

  const mergedRectGroups: CellContent[][] = []
  cellContainingRects.forEach((contRect, idx) => {
    const groupRects = workRects
      .filter((r) => r.merged && r.groupId === idx)
      .map(({ merged, groupId, ...plain }) => plain)
    const cellRect = cellContents[idx]
    mergedRectGroups.push([
      contRect,
      cellRect,
      ...groupRects.filter((r) => r.cellId !== contRect.cellId),
    ])
  })

  const groupedRects = workRects.filter(
    (r): r is WorkRect & { groupId: number } => r.groupId !== null,
  )

  return { mergedRectGroups, groupedRects }
}
