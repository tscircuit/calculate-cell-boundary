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
      minY: 75,
      maxX: 300,
      maxY: 175,
    },
  ],
}

test("test05", () => {
  const boundaries = calculateCellBoundaries(scene.cellContents)

  expect(boundaries).toMatchInlineSnapshot(`
    [
      {
        "end": {
          "x": 150,
          "y": 175,
        },
        "start": {
          "x": 150,
          "y": 0,
        },
      },
    ]
  `)

  expect(boundaries).toEqual([
    {
      end: {
        x: 150,
        y: 0,
      },
      start: {
        x: 150,
        y: 300,
      },
    },
  ])
})
