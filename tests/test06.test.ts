import { test, expect } from "bun:test"
import { calculateCellBoundaries } from "../lib"

const scene = {
  cellContents: [
    {
      minX: 50,
      minY: 50,
      maxX: 150,
      maxY: 150,
    },
    {
      minX: 300,
      minY: 250,
      maxX: 400,
      maxY: 350,
    },
    {
      minX: 50,
      minY: 250,
      maxX: 150,
      maxY: 350,
    },
  ],
}

test("test06", () => {
  const boundaries = calculateCellBoundaries(scene.cellContents)

  expect(boundaries).toEqual([
    {
      start: {
        x: 50,
        y: 200,
      },
      end: {
        x: 225,
        y: 200,
      },
    },
    {
      start: {
        x: 225,
        y: 50,
      },
      end: {
        x: 225,
        y: 350,
      },
    },
  ])
})
