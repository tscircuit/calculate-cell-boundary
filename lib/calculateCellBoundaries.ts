import { computeBoundsFromCellContents } from "./computeBoundsFromCellContents"
import type { CellContent, Line } from "./internalTypes"
import { computeMidlines } from "./computeMidlines"
import { computeIntersections } from "./computeIntersections"
import { computeSegments } from "./computeSegments"
import { buildGrid } from "./buildGrid"
import { mergeGridRects } from "./mergeGrid"
import { buildOutline } from "./buildOutline"
import { offsetLine, offsetRect } from "./rectUtils"

export const calculateCellBoundaries = (
  inputCellContents: Omit<CellContent, "cellId">[],
  containerWidth?: number,
  containerHeight?: number,
) => {
  const originalCellContents = inputCellContents.map((cellContent, index) => ({
    ...cellContent,
    cellId: `cell-${index}`,
  }))

  const containerBounds = computeBoundsFromCellContents(
    originalCellContents.map((c) => ({
      minX: c.x,
      minY: c.y,
      maxX: c.x + c.width,
      maxY: c.y + c.height,
    })),
  )

  const offsetX = containerBounds.minX
  const offsetY = containerBounds.minY

  containerWidth ??= containerBounds.maxX - containerBounds.minX
  containerHeight ??= containerBounds.maxY - containerBounds.minY

  const cellContents = originalCellContents.map((c) => ({
    ...c,
    x: c.x - offsetX,
    y: c.y - offsetY,
  }))

  const midlines = computeMidlines(
    cellContents,
    containerWidth,
    containerHeight,
  )

  const intersections = computeIntersections(midlines)

  const allSegments = computeSegments(midlines, intersections, cellContents)

  const { validSegments, cellContainingRects, gridRects } = buildGrid(
    allSegments,
    cellContents,
    containerWidth,
    containerHeight,
  )

  const { mergedRectGroups, groupedRects } = mergeGridRects(
    validSegments,
    gridRects,
    cellContainingRects,
    cellContents,
  )

  const outlineLines = buildOutline(groupedRects, offsetX, offsetY)

  return {
    midlines: midlines.map((l) => offsetLine(l, offsetX, offsetY)),
    allSegments: allSegments.map((l) => offsetLine(l, offsetX, offsetY)),
    validSegments: validSegments.map((l) => offsetLine(l, offsetX, offsetY)),
    mergedRectGroups: mergedRectGroups.map((g) =>
      g.map((r) => offsetRect(r, offsetX, offsetY)),
    ),
    cellRects: cellContents.map((r) => offsetRect(r, offsetX, offsetY)),
    gridRects: gridRects.map((r) => offsetRect(r, offsetX, offsetY)),
    outlineLines,
  }
}
