import { test, expect } from "bun:test"
import { calculateCellBoundaries } from "../lib"

const scene = {
  cellContents: [
    {
      minX: 300,
      minY: 250,
      maxX: 400,
      maxY: 350,
    },
    {
      minX: 125,
      minY: 100,
      maxX: 225,
      maxY: 200,
    },
    {
      minX: 300,
      minY: 100,
      maxX: 400,
      maxY: 200,
    },
  ],
}

test("test08", () => {
  const boundaries = calculateCellBoundaries(scene.cellContents)

  expect(boundaries).toEqual(
    [
      {
        start: {
          x: 262.5,
          y: 100,
        },
        end: {
          x: 262.5,
          y: 350,
        },
      },
      {
        start: {
          x: 262.5,
          y: 225,
        },
        end: {
          x: 400,
          y: 225,
        },
      },
    ].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  )
})
