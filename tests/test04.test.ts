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
      minX: 75,
      minY: 150,
      maxX: 275,
      maxY: 250,
    },
  ],
}

test("test04", () => {
  const boundaries = calculateCellBoundaries(scene.cellContents)

  expect(boundaries).toEqual([
    {
      start: {
        x: 0,
        y: 125,
      },
      end: {
        x: 275,
        y: 125,
      },
    },
  ])
})
