import { test, expect } from "bun:test"
import { calculateCellBoundaries } from "../lib"

const scene = {
  cellContents: [
    {
      minX: 175,
      minY: 50,
      maxX: 275,
      maxY: 150,
    },
    {
      minX: 25,
      minY: 225,
      maxX: 125,
      maxY: 325,
    },
    {
      minX: 250,
      minY: 300,
      maxX: 350,
      maxY: 400,
    },
    {
      minX: 375,
      minY: 75,
      maxX: 475,
      maxY: 175,
    },
  ],
}

test("test12", () => {
  const boundaries = calculateCellBoundaries(scene.cellContents)
  boundaries.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))

  expect(boundaries).toEqual(
    [
      {
        start: {
          x: 25,
          y: 200,
        },
        end: {
          x: 187.5,
          y: 200,
        },
      },
      {
        start: {
          x: 187.5,
          y: 200,
        },
        end: {
          x: 187.5,
          y: 225,
        },
      },
      {
        start: {
          x: 187.5,
          y: 225,
        },
        end: {
          x: 362.5,
          y: 225,
        },
      },
      {
        start: {
          x: 187.5,
          y: 237.5,
        },
        end: {
          x: 187.5,
          y: 400,
        },
      },
      {
        start: {
          x: 187.5,
          y: 237.5,
        },
        end: {
          x: 250,
          y: 237.5,
        },
      },
      {
        start: {
          x: 250,
          y: 225,
        },
        end: {
          x: 250,
          y: 237.5,
        },
      },
      {
        start: {
          x: 325,
          y: 50,
        },
        end: {
          x: 325,
          y: 225,
        },
      },
      {
        start: {
          x: 362.5,
          y: 225,
        },
        end: {
          x: 362.5,
          y: 237.5,
        },
      },
      {
        start: {
          x: 362.5,
          y: 237.5,
        },
        end: {
          x: 475,
          y: 237.5,
        },
      },
    ].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  )
})
