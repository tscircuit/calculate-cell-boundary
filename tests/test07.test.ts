import { test, expect } from "bun:test"
import { calculateCellBoundaries } from "../lib"

const scene = {
  cellContents: [
    {
      minX: 100,
      minY: 75,
      maxX: 200,
      maxY: 175,
    },
    {
      minX: 400,
      minY: 200,
      maxX: 500,
      maxY: 300,
    },
    {
      minX: 250,
      minY: 150,
      maxX: 350,
      maxY: 250,
    },
  ],
}

test("test07", () => {
  const boundaries = calculateCellBoundaries(scene.cellContents)

  expect(boundaries).toEqual([
    {
      start: {
        x: 225,
        y: 75,
      },
      end: {
        x: 225,
        y: 300,
      },
    },
    {
      start: {
        x: 375,
        y: 75,
      },
      end: {
        x: 375,
        y: 300,
      },
    },
  ])
})
