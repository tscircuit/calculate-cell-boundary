import { test, expect } from "bun:test"
import { calculateCellBoundaries } from "../lib"

const scene = {
  cellContents: [
    {
      minX: 0,
      minY: 0,
      maxX: 100,
      maxY: 100,
    },
    {
      minX: 50,
      minY: 200,
      maxX: 250,
      maxY: 300,
    },
    {
      minX: 200,
      minY: 0,
      maxX: 300,
      maxY: 100,
    },
  ],
}

test("test03", () => {
  const boundaries = calculateCellBoundaries(scene.cellContents)

  expect(boundaries).toEqual(
    [
      {
        start: { x: 150, y: 0 },
        end: { x: 150, y: 150 },
      },
      {
        start: { x: 0, y: 150 },
        end: { x: 300, y: 150 },
      },
    ].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  )
})
