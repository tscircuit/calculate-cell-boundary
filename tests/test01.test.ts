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
      minX: 200,
      minY: 0,
      maxX: 300,
      maxY: 100,
    },
  ],
}

test("test01", () => {
  const { cellBoundaries } = calculateCellBoundaries(scene.cellContents)

  expect(cellBoundaries).toEqual([
    {
      start: { x: 150, y: 0 },
      end: { x: 150, y: 100 },
    },
  ])
})
