import type { CellContent, Midline } from "./internalTypes"

export const computeMidlines = (
  cellContents: CellContent[],
  containerWidth: number,
  containerHeight: number,
): Midline[] => {
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

  return midlines
}
