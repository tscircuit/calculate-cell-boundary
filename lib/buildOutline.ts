import type { Line, Point, CellContent } from "./internalTypes"
import { POINT_COMPARISON_TOLERANCE, getSegmentKey } from "./utils"
import { offsetLine } from "./rectUtils"

export const buildOutline = (
  workRects: Array<CellContent & { groupId: number }>,
  offsetX: number,
  offsetY: number,
): Line[] => {
  const outlineLines: Line[] = []
  let outlineLineId = 0
  const TOL = POINT_COMPARISON_TOLERANCE

  const segMap = new Map<string, { start: Point; end: Point }>()

  for (let i = 0; i < workRects.length; i++) {
    const a = workRects[i]
    for (let j = i + 1; j < workRects.length; j++) {
      const b = workRects[j]
      if (a.groupId === b.groupId) continue

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

  segMap.forEach(({ start, end }) => {
    outlineLines.push({
      id: `outline-${outlineLineId++}`,
      start,
      end,
    })
  })

  return outlineLines.map((l) => offsetLine(l, offsetX, offsetY))
}
