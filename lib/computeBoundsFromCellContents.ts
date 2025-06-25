import type { CellContent } from "./types"

export const computeBoundsFromCellContents = (
  cellContents: Omit<CellContent, "cellId">[],
) => {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const cell of cellContents) {
    minX = Math.min(minX, cell.minX)
    minY = Math.min(minY, cell.minY)
    maxX = Math.max(maxX, cell.maxX)
    maxY = Math.max(maxY, cell.maxY)
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
  }
}
