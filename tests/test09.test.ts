import { test, expect } from "bun:test"
import { calculateCellBoundaries } from "../lib"

const scene = {
  cellContents: [
    {
      minX: 150,
      minY: 100,
      maxX: 250,
      maxY: 200,
    },
    {
      minX: 250,
      minY: 250,
      maxX: 350,
      maxY: 350,
    },
    {
      minX: 300,
      minY: 50,
      maxX: 400,
      maxY: 150,
    },
  ],
}

test("test09", () => {
  const boundaries = calculateCellBoundaries(scene.cellContents)

  expect(boundaries).toEqual(
    [
      {
        start: {
          x: 150,
          y: 225,
        },
        end: {
          x: 275,
          y: 225,
        },
      },
      {
        start: {
          x: 275,
          y: 100,
        },
        end: {
          x: 275,
          y: 225,
        },
      },
      {
        start: {
          x: 275,
          y: 200,
        },
        end: {
          x: 400,
          y: 200,
        },
      },
    ].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  )
})
