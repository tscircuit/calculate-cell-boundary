import { test, expect } from "bun:test"
import { calculateCellBoundaries } from "../lib"

const scene = {
  cellContents: [
    {
      minX: 375,
      minY: 50,
      maxX: 475,
      maxY: 150,
    },
    {
      minX: 175,
      minY: 125,
      maxX: 275,
      maxY: 225,
    },
    {
      minX: 325,
      minY: 175,
      maxX: 425,
      maxY: 275,
    },
  ],
}

test("test10", () => {
  const boundaries = calculateCellBoundaries(scene.cellContents)

  expect(boundaries).toEqual(
    [
      {
        start: {
          x: 300,
          y: 162.5,
        },
        end: {
          x: 300,
          y: 275,
        },
      },
      {
        start: {
          x: 300,
          y: 162.5,
        },
        end: {
          x: 475,
          y: 162.5,
        },
      },
      {
        start: {
          x: 325,
          y: 50,
        },
        end: {
          x: 325,
          y: 162.5,
        },
      },
    ].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  )
})
