export interface CellContent {
  cellId: string
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface Vec2 {
  x: number
  y: number
}

export interface Line {
  start: { x: number; y: number }
  end: { x: number; y: number }
}

export type Midline =
  | {
      midlineType: "horizontal"
      y: number
      fromCellIds: Set<string>
    }
  | {
      midlineType: "vertical"
      x: number
      fromCellIds: Set<string>
    }
