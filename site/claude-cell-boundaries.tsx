import React, { useState, useMemo } from "react"
import { computeBoundsFromCellContents } from "./computeBoundsFromCellContents"

// Type definitions
interface CellContent {
  cellId: string
  x: number
  y: number
  width: number
  height: number
}

interface Point {
  x: number
  y: number
}

interface Midline {
  id: string
  start: Point
  end: Point
  cellIds: [string, string]
  type: "horizontal" | "vertical"
}

interface Line {
  id: string
  start: Point
  end: Point
  fromCellIds?: string[]
  distanceToAnyCell?: number
}

interface Intersection {
  point: Point
  midlineIds: string[]
}

// Utility functions
const snapToGrid = (value: number, gridSize: number = 25) =>
  Math.round(value / gridSize) * gridSize

const POINT_COMPARISON_TOLERANCE = 0.001 // Used for comparing float coordinates

const pointsEqual = (
  p1: Point,
  p2: Point,
  tolerance: number = POINT_COMPARISON_TOLERANCE,
): boolean => {
  return Math.abs(p1.x - p2.x) < tolerance && Math.abs(p1.y - p2.y) < tolerance
}

const lineIntersection = (line1: Midline, line2: Midline): Point | null => {
  const x1 = line1.start.x,
    y1 = line1.start.y
  const x2 = line1.end.x,
    y2 = line1.end.y
  const x3 = line2.start.x,
    y3 = line2.start.y
  const x4 = line2.end.x,
    y4 = line2.end.y

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
  if (Math.abs(denom) < 0.0001) return null // Parallel lines

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1),
    }
  }
  return null
}

const lineIntersectsRectangle = (
  lineStart: Point,
  lineEnd: Point,
  rect: CellContent,
): boolean => {
  // Check if line segment intersects with rectangle
  const { x, y, width, height } = rect

  // Check if either endpoint is inside the rectangle
  const startInside =
    lineStart.x >= x &&
    lineStart.x <= x + width &&
    lineStart.y >= y &&
    lineStart.y <= y + height
  const endInside =
    lineEnd.x >= x &&
    lineEnd.x <= x + width &&
    lineEnd.y >= y &&
    lineEnd.y <= y + height

  if (startInside || endInside) return true

  // Check intersection with each edge of the rectangle
  const rectEdges = [
    { start: { x, y }, end: { x: x + width, y } }, // top
    { start: { x: x + width, y }, end: { x: x + width, y: y + height } }, // right
    { start: { x: x + width, y: y + height }, end: { x, y: y + height } }, // bottom
    { start: { x, y: y + height }, end: { x, y } }, // left
  ]

  for (const edge of rectEdges) {
    if (lineSegmentIntersection(lineStart, lineEnd, edge.start, edge.end)) {
      return true
    }
  }

  return false
}

const lineSegmentIntersection = (
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point,
): boolean => {
  const x1 = p1.x,
    y1 = p1.y
  const x2 = p2.x,
    y2 = p2.y
  const x3 = p3.x,
    y3 = p3.y
  const x4 = p4.x,
    y4 = p4.y

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
  if (Math.abs(denom) < 0.0001) return false // Parallel lines

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom

  return t >= 0 && t <= 1 && u >= 0 && u <= 1
}

const distanceToCell = (point: Point, cell: CellContent): number => {
  // Find the closest point on the rectangle to the given point
  const closestX = Math.max(cell.x, Math.min(point.x, cell.x + cell.width))
  const closestY = Math.max(cell.y, Math.min(point.y, cell.y + cell.height))

  // Calculate distance from the point to the closest point on the rectangle
  const dx = point.x - closestX
  const dy = point.y - closestY

  return Math.sqrt(dx * dx + dy * dy)
}

const distanceFromSegmentToCell = (
  start: Point,
  end: Point,
  cell: CellContent,
): number => {
  // Check multiple points along the segment to find minimum distance
  const numSamples = 10
  let minDistance = Infinity

  for (let i = 0; i <= numSamples; i++) {
    const t = i / numSamples
    const point = {
      x: start.x + t * (end.x - start.x),
      y: start.y + t * (end.y - start.y),
    }
    const distance = distanceToCell(point, cell)
    minDistance = Math.min(minDistance, distance)
  }

  return minDistance
}

const distanceToAnyCell = (point: Point, cells: CellContent[]): number => {
  return Math.min(...cells.map((cell) => distanceToCell(point, cell)))
}

const segmentDistanceToAnyCell = (
  start: Point,
  end: Point,
  cells: CellContent[],
): number => {
  return Math.min(
    ...cells.map((cell) => distanceFromSegmentToCell(start, end, cell)),
  )
}

const findClosestPointOnSegmentToCell = (
  start: Point,
  end: Point,
  cell: CellContent,
): { point: Point; distance: number } => {
  // Sample multiple points along the segment
  const numSamples = 20
  let closestPoint = start
  let minDistance = Infinity

  for (let i = 0; i <= numSamples; i++) {
    const t = i / numSamples
    const point = {
      x: start.x + t * (end.x - start.x),
      y: start.y + t * (end.y - start.y),
    }
    const distance = distanceToCell(point, cell)
    if (distance < minDistance) {
      minDistance = distance
      closestPoint = point
    }
  }

  return { point: closestPoint, distance: minDistance }
}

const findClosestPointOnSegmentToAnyCells = (
  start: Point,
  end: Point,
  cells: CellContent[],
): { point: Point; distance: number; cellIndex: number } => {
  let globalClosest = { point: start, distance: Infinity, cellIndex: -1 }

  cells.forEach((cell, index) => {
    const { point, distance } = findClosestPointOnSegmentToCell(
      start,
      end,
      cell,
    )
    if (distance < globalClosest.distance) {
      globalClosest = { point, distance, cellIndex: index }
    }
  })

  return globalClosest
}

// Helper function to convert a Point to a string key
// Precision should be related to POINT_COMPARISON_TOLERANCE
const pointToKey = (p: Point): string => `${p.x.toFixed(4)},${p.y.toFixed(4)}`

// Helper function to create a canonical key for a segment
const getSegmentKey = (p1: Point, p2: Point): string => {
  // Use toFixed to handle potential floating point inaccuracies in keys
  const p1x = parseFloat(p1.x.toFixed(4))
  const p1y = parseFloat(p1.y.toFixed(4))
  const p2x = parseFloat(p2.x.toFixed(4))
  const p2y = parseFloat(p2.y.toFixed(4))

  // Sort points by x, then y to ensure (A,B) and (B,A) have the same key
  if (p1x < p2x || (p1x === p2x && p1y < p2y)) {
    return `${p1x},${p1y}_${p2x},${p2y}`
  } else {
    return `${p2x},${p2y}_${p1x},${p1y}`
  }
}

const getAngle = (p1: Point, p2: Point): number => {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x)
}

//
// ── Rectangle helpers (edge-to-edge) ────────────────────────────
const edgeToEdgeDistance = (a: CellContent, b: CellContent) => {
  const dx = Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width), 0)
  const dy = Math.max(a.y - (b.y + b.height), b.y - (a.y + a.height), 0)
  return dx + dy // Manhattan distance
}

const areAdjacent = (a: CellContent, b: CellContent, tol = 0.5) => {
  const shareVertical =
    (Math.abs(a.x + a.width - b.x) < tol ||
      Math.abs(b.x + b.width - a.x) < tol) &&
    !(a.y + a.height <= b.y || b.y + b.height <= a.y)

  const shareHorizontal =
    (Math.abs(a.y + a.height - b.y) < tol ||
      Math.abs(b.y + b.height - a.y) < tol) &&
    !(a.x + a.width <= b.x || b.x + b.width <= a.x)

  return shareVertical || shareHorizontal
}

// Simple union-find for grouping rects
class DSU {
  parent: number[]
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i)
  }
  find(i: number): number {
    if (this.parent[i] !== i) this.parent[i] = this.find(this.parent[i])
    return this.parent[i]
  }
  union(i: number, j: number) {
    const pi = this.find(i)
    const pj = this.find(j)
    if (pi !== pj) this.parent[pj] = pi
  }
}

export const calculateCellBoundaries = (
  inputCellContents: Omit<CellContent, "cellId">[],
  containerWidth?: number,
  containerHeight?: number,
): {
  midlines: Midline[]
  allSegments: Array<Line>
  validSegments: Array<Line>
  mergedRectGroups: CellContent[][]
  cellRects: CellContent[]
  gridRects: CellContent[]
  outlineLines: Line[]
  // polygons: Array<PolygonType>; // Removed
  // mergedPolygons: Array<PolygonType>; // Removed
} => {
  const cellContents = inputCellContents.map((cellContent, index) => ({
    ...cellContent,
    cellId: `cell-${index}`,
  }))
  const containerBounds = computeBoundsFromCellContents(
    cellContents.map((c) => ({
      minX: c.x,
      minY: c.y,
      maxX: c.x + c.width,
      maxY: c.y + c.height,
    })),
  )
  // TODO handle container offset
  containerWidth ??= containerBounds.maxX // - containerBounds.minX
  containerHeight ??= containerBounds.maxY // - containerBounds.minY
  console.log({ containerWidth, containerHeight })

  // Step 1: Calculate midlines between all cells
  const midlines: Midline[] = []
  let midlineId = 0

  for (let i = 0; i < cellContents.length; i++) {
    for (let j = i + 1; j < cellContents.length; j++) {
      const cell1 = cellContents[i]
      const cell2 = cellContents[j]

      const cell1Right = cell1.x + cell1.width
      const cell2Right = cell2.x + cell2.width
      const cell1Bottom = cell1.y + cell1.height
      const cell2Bottom = cell2.y + cell2.height

      // Vertical midline (horizontal gap)
      const hasHorizontalGap = cell1Right < cell2.x || cell2Right < cell1.x
      if (hasHorizontalGap) {
        let midX
        if (cell1Right < cell2.x) {
          midX = (cell1Right + cell2.x) / 2
        } else {
          midX = (cell2Right + cell1.x) / 2
        }

        midlines.push({
          id: `midline-${midlineId++}`,
          start: { x: midX, y: 0 },
          end: { x: midX, y: containerHeight },
          cellIds: [cell1.cellId, cell2.cellId],
          type: "vertical",
        })
      }

      // Horizontal midline (vertical gap)
      const hasVerticalGap = cell1Bottom < cell2.y || cell2Bottom < cell1.y
      if (hasVerticalGap) {
        let midY
        if (cell1Bottom < cell2.y) {
          midY = (cell1Bottom + cell2.y) / 2
        } else {
          midY = (cell2Bottom + cell1.y) / 2
        }

        midlines.push({
          id: `midline-${midlineId++}`,
          start: { x: 0, y: midY },
          end: { x: containerWidth, y: midY },
          cellIds: [cell1.cellId, cell2.cellId],
          type: "horizontal",
        })
      }
    }
  }

  // Step 2: Calculate intersections between midlines
  const intersections: Intersection[] = []
  for (let i = 0; i < midlines.length; i++) {
    for (let j = i + 1; j < midlines.length; j++) {
      const intersection = lineIntersection(midlines[i], midlines[j])
      if (intersection) {
        intersections.push({
          point: intersection,
          midlineIds: [midlines[i].id, midlines[j].id],
        })
      }
    }
  }

  // Step 3: Calculate segments between intersections
  const allSegments: Line[] = []
  let segmentId = 0

  midlines.forEach((midline) => {
    // Find all intersections on this midline
    const midlineIntersections = intersections
      .filter((int) => int.midlineIds.includes(midline.id))
      .map((int) => int.point)
      .sort((a, b) => {
        if (midline.type === "vertical") {
          return a.y - b.y
        } else {
          return a.x - b.x
        }
      })

    // Add start and end points
    const allPoints = [midline.start, ...midlineIntersections, midline.end]

    // Create segments between consecutive points
    for (let i = 0; i < allPoints.length - 1; i++) {
      const segment: Line = {
        id: `segment-${segmentId++}`,
        start: allPoints[i],
        end: allPoints[i + 1],
        fromCellIds: midline.cellIds,
        distanceToAnyCell: segmentDistanceToAnyCell(
          allPoints[i],
          allPoints[i + 1],
          cellContents,
        ),
      }
      allSegments.push(segment)
    }
  })

  // Step 4: Remove segments that intersect cell content (invalid segments)
  const validSegments = allSegments.filter((segment) => {
    // Check if the entire segment intersects any cell
    return !cellContents.some((cell) => {
      return lineIntersectsRectangle(segment.start, segment.end, cell)
    })
  })

  // ── NEW: build grid rectangles from VALID segments ───────────
  // 1. Collect unique x positions of vertical segments + container edges
  const verticalXs = new Set<number>([0, containerWidth])
  // 2. Collect unique y positions of horizontal segments + container edges
  const horizontalYs = new Set<number>([0, containerHeight])

  validSegments.forEach((seg) => {
    const isVertical = Math.abs(seg.start.x - seg.end.x) < 0.001
    if (isVertical) {
      verticalXs.add(seg.start.x)
    } else {
      horizontalYs.add(seg.start.y)
    }
  })

  const xs = Array.from(verticalXs).sort((a, b) => a - b)
  const ys = Array.from(horizontalYs).sort((a, b) => a - b)

  // --- Rect that tightly follows the grid around each cell ------------
  const cellContainingRectMap = new Map<string, CellContent>()
  const cellContainingRects: CellContent[] = []

  cellContents.forEach((cell, idx) => {
    // left / right grid lines that bound the cell
    // xs and ys are sorted and include 0 and containerWidth/Height respectively.
    const minXGrid = xs[0]
    const maxXGrid = xs[xs.length - 1]
    const minYGrid = ys[0]
    const maxYGrid = ys[ys.length - 1]

    let left = xs.filter((v) => v <= cell.x).pop()
    if (left === undefined) left = minXGrid

    let right = xs.find((v) => v >= cell.x + cell.width)
    if (right === undefined) right = maxXGrid

    let top = ys.filter((v) => v <= cell.y).pop()
    if (top === undefined) top = minYGrid

    let bot = ys.find((v) => v >= cell.y + cell.height)
    if (bot === undefined) bot = maxYGrid

    const rect: CellContent = {
      cellId: `contain-${cell.cellId}`,
      x: left,
      y: top,
      width: Math.max(0, right - left),
      height: Math.max(0, bot - top),
    }
    cellContainingRectMap.set(cell.cellId, rect)
    cellContainingRects.push(rect)
  })

  // helper: axis-aligned rectangle overlap
  const rectsOverlap = (a: CellContent, b: CellContent) =>
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y

  // 3. Build every cell in the grid; drop any that intersect an input cell
  const gridRects: CellContent[] = []
  let gridRectId = 0

  for (let xi = 0; xi < xs.length - 1; xi++) {
    const x0 = xs[xi]
    const x1 = xs[xi + 1]
    if (x1 - x0 <= 0) continue

    for (let yi = 0; yi < ys.length - 1; yi++) {
      const y0 = ys[yi]
      const y1 = ys[yi + 1]
      if (y1 - y0 <= 0) continue

      const candidate: CellContent = {
        cellId: `gridRect-${gridRectId++}`,
        x: x0,
        y: y0,
        width: x1 - x0,
        height: y1 - y0,
      }

      // skip if candidate overlaps any original cell
      if (cellContents.some((c) => rectsOverlap(candidate, c))) continue

      gridRects.push(candidate)
    }
  }

  // add the containing rects to the grid set
  cellContainingRects.forEach((r) => {
    const key = `${r.x},${r.y},${r.width},${r.height}`
    if (
      !gridRects.some((g) => `${g.x},${g.y},${g.width},${g.height}` === key)
    ) {
      gridRects.push(r)
    }
  })

  // ── Step 5: merge GRID rects outward from each cell ───────────────
  // One cell ⇒ one merged-rect group.  Start with the rect that
  // contains the cell. Then, iteratively merge adjacent grid rects based on the
  // minimum distanceToAnyCell of their bounding segments.

  interface WorkRect extends CellContent {
    merged: boolean
    groupId: number | null
    minBoundingSegmentDistance: number
  }

  // Working copy of every grid rect with merge flags and distance metric
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
          sx2 > x + POINT_COMPARISON_TOLERANCE && // ensure segment x-range overlaps rect x-range with positive length
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
          sy2 > y + POINT_COMPARISON_TOLERANCE && // ensure segment y-range overlaps rect y-range with positive length
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

  // 5-a Mark the “key rects” (the cell-containing rects) as the seeds
  cellContainingRects.forEach((contRect, idx) => {
    const wr = workRects.find(
      (w) =>
        pointsEqual({ x: w.x, y: w.y }, { x: contRect.x, y: contRect.y }) &&
        Math.abs(w.width - contRect.width) < POINT_COMPARISON_TOLERANCE &&
        Math.abs(w.height - contRect.height) < POINT_COMPARISON_TOLERANCE,
    )
    if (wr) {
      wr.merged = true
      wr.groupId = idx // one group per cell
    }
  })

  // 5-b Iterative grow-out: assign each rect to an adjacent merged group,
  // prioritizing rects with lower minBoundingSegmentDistance.
  // Skipped rects are re-evaluated in subsequent passes.
  let unmergedRectsProcessingList: WorkRect[] = workRects
    .filter((r) => !r.merged)
    .sort((a, b) => a.minBoundingSegmentDistance - b.minBoundingSegmentDistance)

  let keepProcessing = true
  while (keepProcessing && unmergedRectsProcessingList.length > 0) {
    keepProcessing = false // Assume no merges in this pass initially
    const remainingAfterPass: WorkRect[] = []

    for (const rectToConsider of unmergedRectsProcessingList) {
      // Find the current state of this rect from the main workRects array
      const currentRectState = workRects.find(
        (wr) => wr.cellId === rectToConsider.cellId,
      )

      // If rect somehow already processed or not found, skip
      if (!currentRectState || currentRectState.merged) {
        if (currentRectState && currentRectState.merged && !keepProcessing) {
          // If it got merged by another rect earlier in this same pass, ensure keepProcessing is true
          // This can happen if rect A merges, then rect B (neighbour of A) is processed.
          // However, the main check for keepProcessing is if a rect *changes* its state to merged.
        }
        continue
      }

      const neighbours = workRects.filter(
        (other) => other.merged && areAdjacent(currentRectState, other),
      )

      if (neighbours.length > 0) {
        currentRectState.merged = true
        keepProcessing = true // A merge occurred, so at least one more pass might be needed

        if (neighbours.length === 1) {
          currentRectState.groupId = neighbours[0].groupId
        } else {
          // Tie-breaking: find best group to join based on distance to original cell
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
              // Further tie-breaking: prefer smaller group ID (arbitrary but consistent)
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
        // Cannot merge this rect in this pass, add to list for next pass
        remainingAfterPass.push(rectToConsider)
      }
    }
    // Prepare for next pass with only rects that couldn't be merged, re-sorted
    unmergedRectsProcessingList = remainingAfterPass.sort(
      (a, b) => a.minBoundingSegmentDistance - b.minBoundingSegmentDistance,
    )
  }

  // 5-d  collect final groups – first element MUST be the cell-containing rect,
  //      followed by the original cell rect and the rest of the merged grid rects
  const mergedRectGroups: CellContent[][] = []
  cellContainingRects.forEach((contRect, idx) => {
    const groupRects = workRects
      .filter((r) => r.merged && r.groupId === idx)
      .map(({ merged, groupId, ...plain }) => plain) // strip helper props
    const cellRect = cellContents[idx] // original cell rect
    mergedRectGroups.push([
      contRect,
      cellRect,
      ...groupRects.filter((r) => r.cellId !== contRect.cellId),
    ])
  })

  // ── Step 6:  outlines between DIFFERENT merged-rect groups ──────────────
  const outlineLines: Line[] = []
  let outlineLineId = 0
  const TOL = POINT_COMPARISON_TOLERANCE

  // Only consider grid rects that were merged into some group
  const groupedRects = workRects.filter(
    (r): r is WorkRect & { groupId: number } => r.groupId !== null,
  )

  // Helper map to de-duplicate identical segments
  const segMap = new Map<string, { start: Point; end: Point }>()

  for (let i = 0; i < groupedRects.length; i++) {
    const a = groupedRects[i]
    for (let j = i + 1; j < groupedRects.length; j++) {
      const b = groupedRects[j]
      if (a.groupId === b.groupId) continue // same merged rect → skip

      // ── vertical shared edge (left/right) ─────────────────────────────
      const aRight = a.x + a.width
      const bRight = b.x + b.width
      if (Math.abs(aRight - b.x) < TOL || Math.abs(bRight - a.x) < TOL) {
        const x = Math.abs(aRight - b.x) < TOL ? aRight : bRight
        const y0 = Math.max(a.y, b.y)
        const y1 = Math.min(a.y + a.height, b.y + b.height)
        if (y1 - y0 > TOL) {
          const s = { x, y: y0 }
          const e = { x, y: y1 }
          segMap.set(getSegmentKey(s, e), { start: s, end: e })
        }
      }

      // ── horizontal shared edge (top/bottom) ──────────────────────────
      const aBot = a.y + a.height
      const bBot = b.y + b.height
      if (Math.abs(aBot - b.y) < TOL || Math.abs(bBot - a.y) < TOL) {
        const y = Math.abs(aBot - b.y) < TOL ? aBot : bBot
        const x0 = Math.max(a.x, b.x)
        const x1 = Math.min(a.x + a.width, b.x + b.width)
        if (x1 - x0 > TOL) {
          const s = { x: x0, y }
          const e = { x: x1, y }
          segMap.set(getSegmentKey(s, e), { start: s, end: e })
        }
      }
    }
  }

  // Convert map → outlineLines array
  segMap.forEach(({ start, end }) => {
    outlineLines.push({
      id: `outline-${outlineLineId++}`,
      start,
      end,
    })
  })

  return {
    midlines,
    allSegments,
    validSegments,
    mergedRectGroups,
    cellRects: cellContents,
    gridRects,
    outlineLines,
    // polygons: [], // Removed
    // mergedPolygons: [], // Removed
  }
}

const RECT_STAGE_ID = "rects" // new step-id for pre-merge rects
const OUTLINE_STAGE_ID = "outlines" // new step-id for final outlines

const CellBoundariesVisualization = () => {
  const [cellContents, setCellContents] = useState([
    { x: 100, y: 100, width: 120, height: 80 },
    { x: 300, y: 150, width: 100, height: 100 },
    { x: 150, y: 300, width: 140, height: 90 },
  ])
  const [draggingCellIndex, setDraggingCellIndex] = useState<number | null>(
    null,
  )
  const [dragStartOffset, setDragStartOffset] = useState<Point | null>(null)

  const [showStep, setShowStep] = useState("validSegments") // Default to a valid step
  const [nextId, setNextId] = useState(4)
  const mergedRectGroupColors = [
    "bg-orange-500",
    "bg-cyan-600",
    "bg-red-600",
    "bg-indigo-600",
    "bg-violet-600",
    "bg-fuchsia-600",
  ] // Changed first color
  // const [highlightReusedSegments, setHighlightReusedSegments] = useState(false); // Removed
  const [showDistanceDebug, setShowDistanceDebug] = useState(false)
  const [showFilteredSegments, setShowFilteredSegments] = useState(false) // This seems unused, consider removing later if confirmed
  const [colorByDistance, setColorByDistance] = useState(false)
  // const [hiddenPathIndices, setHiddenPathIndices] = useState<Set<number>>(new Set()); // Removed as it was likely for polygons

  const results = useMemo(() => {
    return calculateCellBoundaries(cellContents, 800, 600)
  }, [cellContents])

  const cellToGroupColorMap = useMemo(() => {
    if (showStep !== "mergedRects" || !results.mergedRectGroups) {
      return new Map<string, string>()
    }

    const map = new Map<string, string>() // cellId to color class

    results.mergedRectGroups.forEach((group, groupIndex) => {
      const colorClass =
        mergedRectGroupColors[groupIndex % mergedRectGroupColors.length]
      group.forEach((cellInGroup) => {
        // cellInGroup has cellId
        map.set(cellInGroup.cellId, colorClass)
      })
    })
    return map
  }, [showStep, results.mergedRectGroups, mergedRectGroupColors])

  // ❶ PUT BELOW the `cellToGroupColorMap` useMemo (or anywhere before render)
  const mergedRects = useMemo(() => {
    return results.mergedRectGroups.map((group) => {
      const minX = Math.min(...group.map((c) => c.x))
      const minY = Math.min(...group.map((c) => c.y))
      const maxX = Math.max(...group.map((c) => c.x + c.width))
      const maxY = Math.max(...group.map((c) => c.y + c.height))
      return {
        // one rect per group
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      }
    })
  }, [results.mergedRectGroups])

  // Stage-5 rects = every rectangle cut out by the valid segments grid
  const preMergeRects = useMemo(() => {
    return results.gridRects.map((r, idx) => ({
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      colorIdx: idx,
    }))
  }, [results.gridRects])

  // Find max distance for color scaling
  const maxDistance = useMemo(() => {
    if (results.validSegments && results.validSegments.length > 0) {
      return Math.max(
        ...results.validSegments.map((s) => s.distanceToAnyCell || 0),
        0,
      )
    }
    return 0
  }, [results.validSegments])

  const getDistanceColor = (distance: number) => {
    if (!colorByDistance) return null
    const normalized = Math.min(distance / maxDistance, 1)
    // Blue (close) to Red (far)
    const hue = (1 - normalized) * 240 // 240 (blue) to 0 (red)
    return `hsl(${hue}, 70%, 50%)`
  }

  const addCell = () => {
    const newCell = {
      x: snapToGrid(Math.random() * 600),
      y: snapToGrid(Math.random() * 400),
      width: snapToGrid(80 + Math.random() * 80),
      height: snapToGrid(60 + Math.random() * 80),
    }
    setCellContents((prev) => [...prev, newCell])
    setNextId((prev) => prev + 1)
  }

  const handleCellMouseDown = (index: number, event: React.MouseEvent) => {
    event.preventDefault()
    const cellElement = event.currentTarget as HTMLElement
    const containerElement = cellElement.offsetParent as HTMLElement

    if (!containerElement) {
      console.error("Draggable item's container not found. Cannot start drag.")
      return
    }

    const containerRect = containerElement.getBoundingClientRect()
    const cell = cellContents[index] // cell is {x, y, width, height} relative to container

    setDraggingCellIndex(index)
    setDragStartOffset({
      x: event.clientX - containerRect.left - cell.x,
      y: event.clientY - containerRect.top - cell.y,
    })
    document.body.style.cursor = "grabbing"
  }

  const handleContainerMouseMove = (event: React.MouseEvent) => {
    if (draggingCellIndex === null || !dragStartOffset) return
    event.preventDefault()

    const containerRect = (
      event.currentTarget as HTMLElement
    ).getBoundingClientRect()

    let newX = event.clientX - dragStartOffset.x - containerRect.left
    let newY = event.clientY - dragStartOffset.y - containerRect.top

    newX = snapToGrid(newX)
    newY = snapToGrid(newY)

    // Prevent dragging outside container boundaries (optional, adjust as needed)
    // newX = Math.max(0, Math.min(newX, 800 - cellContents[draggingCellIndex].width));
    // newY = Math.max(0, Math.min(newY, 600 - cellContents[draggingCellIndex].height));

    setCellContents((prev) =>
      prev.map((cell, index) =>
        index === draggingCellIndex ? { ...cell, x: newX, y: newY } : cell,
      ),
    )
  }

  const handleContainerMouseUp = () => {
    if (draggingCellIndex !== null) {
      setDraggingCellIndex(null)
      setDragStartOffset(null)
      document.body.style.cursor = "default"
    }
  }

  const colors = [
    "bg-blue-500",
    "bg-red-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-yellow-500",
    "bg-pink-500",
  ]

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-gray-800">
            Cell Boundaries Algorithm (Reusable Segments)
          </h2>
          <button
            onClick={addCell}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
          >
            Add Cell
          </button>
        </div>
        <p className="text-gray-600">
          Visualizing the cell boundary calculation algorithm. Segments can be
          reused across paths!
        </p>
      </div>

      <div className="mb-4 flex gap-4 items-center">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Visualization Step:
          </label>
          <select
            value={showStep}
            onChange={(e) => setShowStep(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 bg-white"
          >
            <option value="cells">1. Input Cells Only</option>
            <option value="midlines">2. Midlines</option>
            <option value="allSegments">3. All Segments</option>
            <option value="validSegments">
              4. Valid Segments (No Cell Intersections)
            </option>
            <option value={RECT_STAGE_ID}>5. Rects (pre-merge)</option>
            <option value="mergedRects">6. Merged Rects</option>
            <option value={OUTLINE_STAGE_ID}>7. Draw Outlines</option>
            {/* <option value="final">5. Constructed Polygons</option> // Removed */}
            {/* <option value="merged">6. Merged Polygons</option> // Removed */}
          </select>
        </div>

        {(showStep === "allSegments" || showStep === "validSegments") && ( // Adjusted condition
          <>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showDistanceDebug}
                onChange={(e) => setShowDistanceDebug(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">
                Show Distance Debug
              </span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={colorByDistance}
                onChange={(e) => setColorByDistance(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">
                Color by Distance
              </span>
            </label>
          </>
        )}
      </div>

      <div className="flex gap-6">
        <div
          className="relative bg-white border-2 border-gray-300"
          style={{ width: "800px", height: "600px" }}
          onMouseMove={handleContainerMouseMove}
          onMouseUp={handleContainerMouseUp}
          onMouseLeave={handleContainerMouseUp} // Stop dragging if mouse leaves container
        >
          {/* Grid pattern */}
          <svg
            className="absolute inset-0 pointer-events-none opacity-10"
            width="800"
            height="600"
          >
            <defs>
              <pattern
                id="grid"
                width="25"
                height="25"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 25 0 L 0 0 0 25"
                  fill="none"
                  stroke="#666"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Render based on selected step */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width="800"
            height="600"
          >
            {/* Midlines */}
            {(showStep === "midlines" || showStep === "allSegments") &&
              results.midlines.map((midline) => (
                <line
                  key={midline.id}
                  x1={midline.start.x}
                  y1={midline.start.y}
                  x2={midline.end.x}
                  y2={midline.end.y}
                  stroke="#94a3b8"
                  strokeWidth="1"
                  strokeDasharray="3,3"
                  opacity="0.6"
                />
              ))}

            {/* All Segments */}
            {showStep === "allSegments" &&
              results.allSegments.map((segment) => {
                const closestInfo = showDistanceDebug
                  ? findClosestPointOnSegmentToAnyCells(
                      segment.start,
                      segment.end,
                      cellContents,
                    )
                  : null

                return (
                  <g key={segment.id}>
                    <line
                      x1={segment.start.x}
                      y1={segment.start.y}
                      x2={segment.end.x}
                      y2={segment.end.y}
                      stroke="#f59e0b"
                      strokeWidth="2"
                      opacity="0.7"
                    />
                    <text
                      x={(segment.start.x + segment.end.x) / 2}
                      y={(segment.start.y + segment.end.y) / 2 - 5}
                      fontSize="10"
                      fill="#000"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      {segment.distanceToAnyCell?.toFixed(1)}
                    </text>
                    {showDistanceDebug && closestInfo && (
                      <>
                        <circle
                          cx={closestInfo.point.x}
                          cy={closestInfo.point.y}
                          r="3"
                          fill="#dc2626"
                          stroke="#fff"
                          strokeWidth="1"
                        />
                        <line
                          x1={closestInfo.point.x}
                          y1={closestInfo.point.y}
                          x2={closestInfo.point.x}
                          y2={closestInfo.point.y - 15}
                          stroke="#dc2626"
                          strokeWidth="1"
                          strokeDasharray="2,2"
                        />
                        <text
                          x={closestInfo.point.x}
                          y={closestInfo.point.y - 17}
                          fontSize="8"
                          fill="#dc2626"
                          textAnchor="middle"
                        >
                          {closestInfo.distance.toFixed(1)}
                        </text>
                      </>
                    )}
                  </g>
                )
              })}

            {/* Valid Segments */}
            {showStep === "validSegments" &&
              results.validSegments.map((segment) => {
                const closestInfo = showDistanceDebug
                  ? findClosestPointOnSegmentToAnyCells(
                      segment.start,
                      segment.end,
                      cellContents,
                    )
                  : null

                return (
                  <g key={segment.id}>
                    <line
                      x1={segment.start.x}
                      y1={segment.start.y}
                      x2={segment.end.x}
                      y2={segment.end.y}
                      stroke="#06b6d4"
                      strokeWidth="2"
                      opacity="0.8"
                    />
                    <text
                      x={(segment.start.x + segment.end.x) / 2}
                      y={(segment.start.y + segment.end.y) / 2 - 5}
                      fontSize="10"
                      fill="#000"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      {segment.distanceToAnyCell?.toFixed(1)}
                    </text>
                    {showDistanceDebug && closestInfo && (
                      <>
                        <circle
                          cx={closestInfo.point.x}
                          cy={closestInfo.point.y}
                          r="3"
                          fill="#dc2626"
                          stroke="#fff"
                          strokeWidth="1"
                        />
                      </>
                    )}
                  </g>
                )
              })}

            {/* Polygon rendering removed */}

            {/* Outlines of Merged Rects */}
            {showStep === OUTLINE_STAGE_ID &&
              results.outlineLines.map((line) => (
                <line
                  key={line.id}
                  x1={line.start.x}
                  y1={line.start.y}
                  x2={line.end.x}
                  y2={line.end.y}
                  stroke="purple"
                  strokeWidth="3"
                  opacity="0.9"
                />
              ))}
          </svg>

          {/* ── NEW STAGE 5: SHOW EVERY RECT ───────────────────────────── */}
          {showStep === RECT_STAGE_ID &&
            preMergeRects.map((rect, idx) => {
              const colorClass = colors[rect.colorIdx % colors.length]
              return (
                <div
                  key={`pre-rect-${idx}`}
                  className={`absolute ${colorClass} opacity-40 border-4 border-white rounded-lg pointer-events-none`}
                  style={{
                    left: `${rect.x}px`,
                    top: `${rect.y}px`,
                    width: `${rect.width}px`,
                    height: `${rect.height}px`,
                  }}
                />
              )
            })}

          {/* ❷ DISPLAY MERGED RECTS (IN STAGE 6) -------------------------------- */}
          {showStep === "mergedRects" &&
            results.mergedRectGroups.map((group, groupIdx) => {
              const colorClass =
                mergedRectGroupColors[groupIdx % mergedRectGroupColors.length]
              // The first element in the group is the containing rect, second is the original cell,
              // the rest are other grid rects. We want to draw all of them.
              // Skip the original cell rect (index 1) as it's drawn separately with text.
              // Or, draw all of them here with less opacity and let the main cell draw on top.
              // For now, let's draw all rects in the group.
              return group.map((rect, rectIdx) => (
                <div
                  key={`merged-rect-${groupIdx}-${rect.cellId || rectIdx}`}
                  className={`absolute ${colorClass} opacity-30 border border-white pointer-events-none`}
                  style={{
                    left: `${rect.x}px`,
                    top: `${rect.y}px`,
                    width: `${rect.width}px`,
                    height: `${rect.height}px`,
                  }}
                />
              ))
            })}

          {/* Cell contents */}
          {cellContents.map((cell, index) => {
            const cellId = `cell-${index}` // Consistent with cellId generation in calculateCellBoundaries
            let bgColorClass = colors[index % colors.length] // Default color

            if (showStep === "mergedRects") {
              const mergedColorClass = cellToGroupColorMap.get(cellId)
              if (mergedColorClass) {
                bgColorClass = mergedColorClass
              }
            }

            return (
              <div
                key={index}
                className={`absolute ${bgColorClass} rounded-lg shadow-lg border-2 border-white flex items-center justify-center text-white font-bold text-lg opacity-80 ${draggingCellIndex === null ? "cursor-grab" : draggingCellIndex === index ? "cursor-grabbing" : "cursor-default"}`}
                style={{
                  left: `${cell.x}px`,
                  top: `${cell.y}px`,
                  width: `${cell.width}px`,
                  height: `${cell.height}px`,
                  userSelect: "none", // Prevent text selection during drag
                }}
                onMouseDown={(e) => handleCellMouseDown(index, e)}
              >
                {index + 1}
              </div>
            )
          })}
        </div>

        {/* Info Panel */}
        <div className="w-80 bg-white p-4 rounded-lg border border-gray-300">
          <h3 className="text-lg font-bold mb-3">Algorithm Information</h3>

          <div className="space-y-3 text-sm">
            <div>
              <strong>Cells:</strong> {cellContents.length}
            </div>
            <div>
              <strong>Midlines:</strong> {results.midlines.length}
            </div>
            <div>
              <strong>All Segments:</strong> {results.allSegments.length}
            </div>
            <div>
              <strong>Valid Segments:</strong> {results.validSegments.length}
            </div>
            <div>
              <strong>Pre-merge Rects (Stage 5):</strong>{" "}
              {results.gridRects.length}
            </div>
            <div>
              <strong>Merged Rect Groups (Stage 6):</strong>{" "}
              {results.mergedRectGroups?.length || 0}
              {/* <pre>{JSON.stringify(results.mergedRectGroups, null, 2)}</pre> */}
            </div>
            <div>
              <strong>Outline Lines (Stage 7):</strong>{" "}
              {results.outlineLines?.length || 0}
            </div>
            {/* Polygon counts removed */}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="font-semibold mb-2">Step Description:</h4>
            <div className="text-sm text-gray-600">
              {showStep === "cells" &&
                "Input cells (rectangles) that need boundaries calculated between them."}
              {showStep === "midlines" &&
                "Midlines drawn between all cell pairs with gaps, extending to container bounds."}
              {showStep === "allSegments" &&
                "All segments created between midline intersections. Distance values show minimum distance from segment to any cell."}
              {showStep === "validSegments" &&
                "Segments that don't intersect any cell content (invalid segments removed)."}
              {showStep === RECT_STAGE_ID &&
                "Stage 5: All individual rects prior to any merging. Each rect has its own colour."}
              {showStep === "mergedRects" &&
                "Stage 6: Merged Rects. Displays groups of cells that are considered merged. Rects in the same group share a color."}
              {showStep === OUTLINE_STAGE_ID &&
                "Stage 7: Draw Outlines. External boundaries of the merged rectangle groups, excluding lines on the global container border."}
              {/* Polygon step descriptions removed */}
              {showDistanceDebug &&
                (showStep === "allSegments" ||
                  showStep === "validSegments") && ( // Adjusted condition
                  <div className="mt-2 text-red-600">
                    <strong>Debug Mode:</strong> For segment-based views, red
                    dots show closest point to cells.
                  </div>
                )}
              {colorByDistance &&
                (showStep === "allSegments" ||
                  showStep === "validSegments") && ( // Adjusted condition
                  <div className="mt-2 text-sm">
                    <strong>Color Scale:</strong>
                    <span className="text-blue-600">
                      {" "}
                      Blue = Close to cells
                    </span>{" "}
                    →<span className="text-red-600"> Red = Far from cells</span>
                    <div className="text-xs text-gray-500 mt-1">
                      Max distance: {maxDistance.toFixed(1)}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CellBoundariesVisualization
