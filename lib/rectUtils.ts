import type { CellContent, Point } from "./internalTypes"
import { POINT_COMPARISON_TOLERANCE, pointsEqual } from "./utils"

export const edgeToEdgeDistance = (a: CellContent, b: CellContent) => {
  const dx = Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width), 0)
  const dy = Math.max(a.y - (b.y + b.height), b.y - (a.y + a.height), 0)
  return dx + dy
}

export const areAdjacent = (a: CellContent, b: CellContent, tol = 0.5) => {
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

export const rectsOverlap = (a: CellContent, b: CellContent) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y

export class DSU {
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

export const offsetPoint = (
  p: Point,
  offsetX: number,
  offsetY: number,
): Point => ({
  x: p.x + offsetX,
  y: p.y + offsetY,
})

export const offsetLine = <T extends { start: Point; end: Point }>(
  l: T,
  offsetX: number,
  offsetY: number,
): T => ({
  ...l,
  start: offsetPoint(l.start, offsetX, offsetY),
  end: offsetPoint(l.end, offsetX, offsetY),
})

export const offsetRect = (
  r: CellContent,
  offsetX: number,
  offsetY: number,
): CellContent => ({
  ...r,
  x: r.x + offsetX,
  y: r.y + offsetY,
})
