import type { CellContent, Line, Vec2 } from "./types"
import { calculateCellBoundaries as calculateCellBoundariesDebug } from "../site/claude-cell-boundaries"
import { mergeAlignedSegments } from "./mergeAlignedSegments"

const pointSortKey = (A: Vec2, B: Vec2) => {
  if (A.x !== B.x) {
    return A.x - B.x
  }
  return A.y - B.y
}

export const calculateCellBoundaries = (
  inputCellContents: Omit<CellContent, "cellId">[],
): Line[] => {
  const { outlineLines: rawOutlineLines } = calculateCellBoundariesDebug(
    inputCellContents.map((c) => ({
      x: c.minX,
      y: c.minY,
      width: c.maxX - c.minX,
      height: c.maxY - c.minY,
    })),
  )

  const mappedLines: Line[] = rawOutlineLines.map((l) => ({
    start: { x: l.start.x, y: l.start.y },
    end: { x: l.end.x, y: l.end.y },
  }))

  const mergedOutlineLines = mergeAlignedSegments(mappedLines)

  return mergedOutlineLines
    .map((a) => ({
      start: pointSortKey(a.start, a.end) < 0 ? a.start : a.end,
      end: pointSortKey(a.start, a.end) < 0 ? a.end : a.start,
    }))
    .sort((a, b) => {
      return pointSortKey(a.start, b.start) || pointSortKey(a.end, b.end)
    })
}
