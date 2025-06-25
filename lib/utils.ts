import type { Point, Midline, CellContent } from "./internalTypes"

export const POINT_COMPARISON_TOLERANCE = 0.001

export const snapToGrid = (value: number, gridSize: number = 25) =>
  Math.round(value / gridSize) * gridSize

export const pointsEqual = (
  p1: Point,
  p2: Point,
  tolerance: number = POINT_COMPARISON_TOLERANCE,
): boolean => {
  return Math.abs(p1.x - p2.x) < tolerance && Math.abs(p1.y - p2.y) < tolerance
}

export const lineIntersection = (
  line1: Midline,
  line2: Midline,
): Point | null => {
  const x1 = line1.start.x,
    y1 = line1.start.y
  const x2 = line1.end.x,
    y2 = line1.end.y
  const x3 = line2.start.x,
    y3 = line2.start.y
  const x4 = line2.end.x,
    y4 = line2.end.y

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
  if (Math.abs(denom) < 0.0001) return null

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

export const lineSegmentIntersection = (
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
  if (Math.abs(denom) < 0.0001) return false

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom

  return t >= 0 && t <= 1 && u >= 0 && u <= 1
}

export const lineIntersectsRectangle = (
  lineStart: Point,
  lineEnd: Point,
  rect: CellContent,
): boolean => {
  const { x, y, width, height } = rect
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

  const rectEdges = [
    { start: { x, y }, end: { x: x + width, y } },
    { start: { x: x + width, y }, end: { x: x + width, y: y + height } },
    { start: { x: x + width, y: y + height }, end: { x, y: y + height } },
    { start: { x, y: y + height }, end: { x, y } },
  ]

  for (const edge of rectEdges) {
    if (lineSegmentIntersection(lineStart, lineEnd, edge.start, edge.end)) {
      return true
    }
  }

  return false
}

export const distanceToCell = (point: Point, cell: CellContent): number => {
  const closestX = Math.max(cell.x, Math.min(point.x, cell.x + cell.width))
  const closestY = Math.max(cell.y, Math.min(point.y, cell.y + cell.height))

  const dx = point.x - closestX
  const dy = point.y - closestY

  return Math.sqrt(dx * dx + dy * dy)
}

export const distanceFromSegmentToCell = (
  start: Point,
  end: Point,
  cell: CellContent,
): number => {
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

export const distanceToAnyCell = (
  point: Point,
  cells: CellContent[],
): number => {
  return Math.min(...cells.map((cell) => distanceToCell(point, cell)))
}

export const segmentDistanceToAnyCell = (
  start: Point,
  end: Point,
  cells: CellContent[],
): number => {
  return Math.min(
    ...cells.map((cell) => distanceFromSegmentToCell(start, end, cell)),
  )
}

export const findClosestPointOnSegmentToCell = (
  start: Point,
  end: Point,
  cell: CellContent,
): { point: Point; distance: number } => {
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

export const findClosestPointOnSegmentToAnyCells = (
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

export const pointToKey = (p: Point): string =>
  `${p.x.toFixed(4)},${p.y.toFixed(4)}`

export const getSegmentKey = (p1: Point, p2: Point): string => {
  const p1x = parseFloat(p1.x.toFixed(4))
  const p1y = parseFloat(p1.y.toFixed(4))
  const p2x = parseFloat(p2.x.toFixed(4))
  const p2y = parseFloat(p2.y.toFixed(4))

  if (p1x < p2x || (p1x === p2x && p1y < p2y)) {
    return `${p1x},${p1y}_${p2x},${p2y}`
  } else {
    return `${p2x},${p2y}_${p1x},${p1y}`
  }
}

export const getAngle = (p1: Point, p2: Point): number => {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x)
}
