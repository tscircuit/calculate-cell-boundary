import type { Midline, Intersection, Line, CellContent } from "./internalTypes"
import { segmentDistanceToAnyCell } from "./utils"

export const computeSegments = (
  midlines: Midline[],
  intersections: Intersection[],
  cellContents: CellContent[],
): Line[] => {
  const allSegments: Line[] = []
  let segmentId = 0

  midlines.forEach((midline) => {
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

    const allPoints = [midline.start, ...midlineIntersections, midline.end]

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

  return allSegments
}
