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
      minX: 0,
      minY: 200,
      maxX: 100,
      maxY: 300,
    },
  ],
}

test("test02", () => {
  const boundaries = calculateCellBoundaries(scene.cellContents)

  expect(boundaries).toEqual([
    {
      start: { x: 0, y: 150 },
      end: { x: 100, y: 150 },
    },
  ])
})
