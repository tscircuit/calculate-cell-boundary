import type { CellContent, Line } from "./types"
import { calculateCellBoundaries as calculateCellBoundariesDebug } from "../site/claude-cell-boundaries"

export const calculateCellBoundaries = (
  inputCellContents: Omit<CellContent, "cellId">[],
) => {
  const { outlineLines } = calculateCellBoundariesDebug(
    inputCellContents.map((c) => ({
      x: c.minX,
      y: c.minY,
      width: c.maxX - c.minX,
      height: c.maxY - c.minY,
    })),
  )
  return outlineLines
    .map((l) => ({
      start: { x: l.start.x, y: l.start.y },
      end: { x: l.end.x, y: l.end.y },
    }))
    .sort((a, b) => {
      if (a.start.x !== b.start.x) {
        return a.start.x - b.start.x
      }
      return a.start.y - b.start.y
    })
}
