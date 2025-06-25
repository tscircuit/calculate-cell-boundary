import type { Midline, Intersection } from "./internalTypes"
import { lineIntersection } from "./utils"

export const computeIntersections = (midlines: Midline[]): Intersection[] => {
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
  return intersections
}
