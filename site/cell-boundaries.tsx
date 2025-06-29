import React, { useState, useMemo } from "react"
import { calculateCellBoundaries } from "../lib/calculateCellBoundaries"

// Type definitions
interface CellContent {
  cellId: string
  x: number
  y: number
  width: number
  height: number
}

interface Point {
  x: number
  y: number
}

interface Midline {
  id: string
  start: Point
  end: Point
  cellIds: [string, string]
  type: "horizontal" | "vertical"
}

interface Line {
  id: string
  start: Point
  end: Point
  fromCellIds?: string[]
  distanceToAnyCell?: number
}

interface Intersection {
  point: Point
  midlineIds: string[]
}

// Utility functions
const snapToGrid = (value: number, gridSize: number = 25) =>
  Math.round(value / gridSize) * gridSize

const POINT_COMPARISON_TOLERANCE = 0.001 // Used for comparing float coordinates

const pointsEqual = (
  p1: Point,
  p2: Point,
  tolerance: number = POINT_COMPARISON_TOLERANCE,
): boolean => {
  return Math.abs(p1.x - p2.x) < tolerance && Math.abs(p1.y - p2.y) < tolerance
}

const lineIntersection = (line1: Midline, line2: Midline): Point | null => {
  const x1 = line1.start.x,
    y1 = line1.start.y
  const x2 = line1.end.x,
    y2 = line1.end.y
  const x3 = line2.start.x,
    y3 = line2.start.y
  const x4 = line2.end.x,
    y4 = line2.end.y

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
  if (Math.abs(denom) < 0.0001) return null // Parallel lines

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1),
    }
  }
  return null
}

const lineIntersectsRectangle = (
  lineStart: Point,
  lineEnd: Point,
  rect: CellContent,
): boolean => {
  // Check if line segment intersects with rectangle
  const { x, y, width, height } = rect

  // Check if either endpoint is inside the rectangle
  const startInside =
    lineStart.x >= x &&
    lineStart.x <= x + width &&
    lineStart.y >= y &&
    lineStart.y <= y + height
  const endInside =
    lineEnd.x >= x &&
    lineEnd.x <= x + width &&
    lineEnd.y >= y &&
    lineEnd.y <= y + height

  if (startInside || endInside) return true

  // Check intersection with each edge of the rectangle
  const rectEdges = [
    { start: { x, y }, end: { x: x + width, y } }, // top
    { start: { x: x + width, y }, end: { x: x + width, y: y + height } }, // right
    { start: { x: x + width, y: y + height }, end: { x, y: y + height } }, // bottom
    { start: { x, y: y + height }, end: { x, y } }, // left
  ]

  for (const edge of rectEdges) {
    if (lineSegmentIntersection(lineStart, lineEnd, edge.start, edge.end)) {
      return true
    }
  }

  return false
}

const lineSegmentIntersection = (
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point,
): boolean => {
  const x1 = p1.x,
    y1 = p1.y
  const x2 = p2.x,
    y2 = p2.y
  const x3 = p3.x,
    y3 = p3.y
  const x4 = p4.x,
    y4 = p4.y

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
  if (Math.abs(denom) < 0.0001) return false // Parallel lines

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom

  return t >= 0 && t <= 1 && u >= 0 && u <= 1
}

const distanceToCell = (point: Point, cell: CellContent): number => {
  // Find the closest point on the rectangle to the given point
  const closestX = Math.max(cell.x, Math.min(point.x, cell.x + cell.width))
  const closestY = Math.max(cell.y, Math.min(point.y, cell.y + cell.height))

  // Calculate distance from the point to the closest point on the rectangle
  const dx = point.x - closestX
  const dy = point.y - closestY

  return Math.sqrt(dx * dx + dy * dy)
}

const distanceFromSegmentToCell = (
  start: Point,
  end: Point,
  cell: CellContent,
): number => {
  // Check multiple points along the segment to find minimum distance
  const numSamples = 10
  let minDistance = Infinity

  for (let i = 0; i <= numSamples; i++) {
    const t = i / numSamples
    const point = {
      x: start.x + t * (end.x - start.x),
      y: start.y + t * (end.y - start.y),
    }
    const distance = distanceToCell(point, cell)
    minDistance = Math.min(minDistance, distance)
  }

  return minDistance
}

const distanceToAnyCell = (point: Point, cells: CellContent[]): number => {
  return Math.min(...cells.map((cell) => distanceToCell(point, cell)))
}

const segmentDistanceToAnyCell = (
  start: Point,
  end: Point,
  cells: CellContent[],
): number => {
  return Math.min(
    ...cells.map((cell) => distanceFromSegmentToCell(start, end, cell)),
  )
}

const findClosestPointOnSegmentToCell = (
  start: Point,
  end: Point,
  cell: CellContent,
): { point: Point; distance: number } => {
  // Sample multiple points along the segment
  const numSamples = 20
  let closestPoint = start
  let minDistance = Infinity

  for (let i = 0; i <= numSamples; i++) {
    const t = i / numSamples
    const point = {
      x: start.x + t * (end.x - start.x),
      y: start.y + t * (end.y - start.y),
    }
    const distance = distanceToCell(point, cell)
    if (distance < minDistance) {
      minDistance = distance
      closestPoint = point
    }
  }

  return { point: closestPoint, distance: minDistance }
}

const findClosestPointOnSegmentToAnyCells = (
  start: Point,
  end: Point,
  cells: CellContent[],
): { point: Point; distance: number; cellIndex: number } => {
  let globalClosest = { point: start, distance: Infinity, cellIndex: -1 }

  cells.forEach((cell, index) => {
    const { point, distance } = findClosestPointOnSegmentToCell(
      start,
      end,
      cell,
    )
    if (distance < globalClosest.distance) {
      globalClosest = { point, distance, cellIndex: index }
    }
  })

  return globalClosest
}

const RECT_STAGE_ID = "rects" // new step-id for pre-merge rects
const OUTLINE_STAGE_ID = "outlines" // new step-id for final outlines

const CellBoundariesVisualization = () => {
  const [cellContents, setCellContents] = useState([
    { x: 100, y: 100, width: 120, height: 80 },
    { x: 300, y: 150, width: 100, height: 100 },
    { x: 150, y: 300, width: 140, height: 90 },
  ])
  const [draggingCellIndex, setDraggingCellIndex] = useState<number | null>(
    null,
  )
  const [dragStartOffset, setDragStartOffset] = useState<Point | null>(null)

  const [showStep, setShowStep] = useState("validSegments") // Default to a valid step
  const [nextId, setNextId] = useState(4)
  const mergedRectGroupColors = [
    "bg-orange-500",
    "bg-cyan-600",
    "bg-red-600",
    "bg-indigo-600",
    "bg-violet-600",
    "bg-fuchsia-600",
  ] // Changed first color
  // const [highlightReusedSegments, setHighlightReusedSegments] = useState(false); // Removed
  const [showDistanceDebug, setShowDistanceDebug] = useState(false)
  const [showFilteredSegments, setShowFilteredSegments] = useState(false) // This seems unused, consider removing later if confirmed
  const [colorByDistance, setColorByDistance] = useState(false)
  // const [hiddenPathIndices, setHiddenPathIndices] = useState<Set<number>>(new Set()); // Removed as it was likely for polygons

  const results = useMemo(() => {
    return calculateCellBoundaries(cellContents, 800, 600)
  }, [cellContents])

  const cellToGroupColorMap = useMemo(() => {
    if (showStep !== "mergedRects" || !results.mergedRectGroups) {
      return new Map<string, string>()
    }

    const map = new Map<string, string>() // cellId to color class

    results.mergedRectGroups.forEach((group, groupIndex) => {
      const colorClass =
        mergedRectGroupColors[groupIndex % mergedRectGroupColors.length]
      group.forEach((cellInGroup) => {
        // cellInGroup has cellId
        map.set(cellInGroup.cellId, colorClass)
      })
    })
    return map
  }, [showStep, results.mergedRectGroups, mergedRectGroupColors])

  // ❶ PUT BELOW the `cellToGroupColorMap` useMemo (or anywhere before render)
  const mergedRects = useMemo(() => {
    return results.mergedRectGroups.map((group) => {
      const minX = Math.min(...group.map((c) => c.x))
      const minY = Math.min(...group.map((c) => c.y))
      const maxX = Math.max(...group.map((c) => c.x + c.width))
      const maxY = Math.max(...group.map((c) => c.y + c.height))
      return {
        // one rect per group
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      }
    })
  }, [results.mergedRectGroups])

  // Stage-5 rects = every rectangle cut out by the valid segments grid
  const preMergeRects = useMemo(() => {
    return results.gridRects.map((r, idx) => ({
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      colorIdx: idx,
    }))
  }, [results.gridRects])

  // Find max distance for color scaling
  const maxDistance = useMemo(() => {
    if (results.validSegments && results.validSegments.length > 0) {
      return Math.max(
        ...results.validSegments.map((s) => s.distanceToAnyCell || 0),
        0,
      )
    }
    return 0
  }, [results.validSegments])

  const getDistanceColor = (distance: number) => {
    if (!colorByDistance) return null
    const normalized = Math.min(distance / maxDistance, 1)
    // Blue (close) to Red (far)
    const hue = (1 - normalized) * 240 // 240 (blue) to 0 (red)
    return `hsl(${hue}, 70%, 50%)`
  }

  const addCell = () => {
    const newCell = {
      x: snapToGrid(Math.random() * 600),
      y: snapToGrid(Math.random() * 400),
      width: snapToGrid(80 + Math.random() * 80),
      height: snapToGrid(60 + Math.random() * 80),
    }
    setCellContents((prev) => [...prev, newCell])
    setNextId((prev) => prev + 1)
  }

  const handleCellMouseDown = (index: number, event: React.MouseEvent) => {
    event.preventDefault()
    const cellElement = event.currentTarget as HTMLElement
    const containerElement = cellElement.offsetParent as HTMLElement

    if (!containerElement) {
      console.error("Draggable item's container not found. Cannot start drag.")
      return
    }

    const containerRect = containerElement.getBoundingClientRect()
    const cell = cellContents[index] // cell is {x, y, width, height} relative to container

    setDraggingCellIndex(index)
    setDragStartOffset({
      x: event.clientX - containerRect.left - cell.x,
      y: event.clientY - containerRect.top - cell.y,
    })
    document.body.style.cursor = "grabbing"
  }

  const handleContainerMouseMove = (event: React.MouseEvent) => {
    if (draggingCellIndex === null || !dragStartOffset) return
    event.preventDefault()

    const containerRect = (
      event.currentTarget as HTMLElement
    ).getBoundingClientRect()

    let newX = event.clientX - dragStartOffset.x - containerRect.left
    let newY = event.clientY - dragStartOffset.y - containerRect.top

    newX = snapToGrid(newX)
    newY = snapToGrid(newY)

    // Prevent dragging outside container boundaries (optional, adjust as needed)
    // newX = Math.max(0, Math.min(newX, 800 - cellContents[draggingCellIndex].width));
    // newY = Math.max(0, Math.min(newY, 600 - cellContents[draggingCellIndex].height));

    setCellContents((prev) =>
      prev.map((cell, index) =>
        index === draggingCellIndex ? { ...cell, x: newX, y: newY } : cell,
      ),
    )
  }

  const handleContainerMouseUp = () => {
    if (draggingCellIndex !== null) {
      setDraggingCellIndex(null)
      setDragStartOffset(null)
      document.body.style.cursor = "default"
    }
  }

  const colors = [
    "bg-blue-500",
    "bg-red-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-yellow-500",
    "bg-pink-500",
  ]

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-gray-800">
            Cell Boundaries Algorithm (Reusable Segments)
          </h2>
          <button
            onClick={addCell}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
          >
            Add Cell
          </button>
        </div>
        <p className="text-gray-600">
          Visualizing the cell boundary calculation algorithm. Segments can be
          reused across paths!
        </p>
      </div>

      <div className="mb-4 flex gap-4 items-center">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Visualization Step:
          </label>
          <select
            value={showStep}
            onChange={(e) => setShowStep(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 bg-white"
          >
            <option value="cells">1. Input Cells Only</option>
            <option value="midlines">2. Midlines</option>
            <option value="allSegments">3. All Segments</option>
            <option value="validSegments">
              4. Valid Segments (No Cell Intersections)
            </option>
            <option value={RECT_STAGE_ID}>5. Rects (pre-merge)</option>
            <option value="mergedRects">6. Merged Rects</option>
            <option value={OUTLINE_STAGE_ID}>7. Draw Outlines</option>
            {/* <option value="final">5. Constructed Polygons</option> // Removed */}
            {/* <option value="merged">6. Merged Polygons</option> // Removed */}
          </select>
        </div>

        {(showStep === "allSegments" || showStep === "validSegments") && ( // Adjusted condition
          <>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showDistanceDebug}
                onChange={(e) => setShowDistanceDebug(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">
                Show Distance Debug
              </span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={colorByDistance}
                onChange={(e) => setColorByDistance(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">
                Color by Distance
              </span>
            </label>
          </>
        )}
      </div>

      <div className="flex gap-6">
        <div
          className="relative bg-white border-2 border-gray-300"
          style={{ width: "800px", height: "600px" }}
          onMouseMove={handleContainerMouseMove}
          onMouseUp={handleContainerMouseUp}
          onMouseLeave={handleContainerMouseUp} // Stop dragging if mouse leaves container
        >
          {/* Grid pattern */}
          <svg
            className="absolute inset-0 pointer-events-none opacity-10"
            width="800"
            height="600"
          >
            <defs>
              <pattern
                id="grid"
                width="25"
                height="25"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 25 0 L 0 0 0 25"
                  fill="none"
                  stroke="#666"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Render based on selected step */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width="800"
            height="600"
          >
            {/* Midlines */}
            {(showStep === "midlines" || showStep === "allSegments") &&
              results.midlines.map((midline) => (
                <line
                  key={midline.id}
                  x1={midline.start.x}
                  y1={midline.start.y}
                  x2={midline.end.x}
                  y2={midline.end.y}
                  stroke="#94a3b8"
                  strokeWidth="1"
                  strokeDasharray="3,3"
                  opacity="0.6"
                />
              ))}

            {/* All Segments */}
            {showStep === "allSegments" &&
              results.allSegments.map((segment) => {
                const closestInfo = showDistanceDebug
                  ? findClosestPointOnSegmentToAnyCells(
                      segment.start,
                      segment.end,
                      cellContents,
                    )
                  : null

                return (
                  <g key={segment.id}>
                    <line
                      x1={segment.start.x}
                      y1={segment.start.y}
                      x2={segment.end.x}
                      y2={segment.end.y}
                      stroke="#f59e0b"
                      strokeWidth="2"
                      opacity="0.7"
                    />
                    <text
                      x={(segment.start.x + segment.end.x) / 2}
                      y={(segment.start.y + segment.end.y) / 2 - 5}
                      fontSize="10"
                      fill="#000"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      {segment.distanceToAnyCell?.toFixed(1)}
                    </text>
                    {showDistanceDebug && closestInfo && (
                      <>
                        <circle
                          cx={closestInfo.point.x}
                          cy={closestInfo.point.y}
                          r="3"
                          fill="#dc2626"
                          stroke="#fff"
                          strokeWidth="1"
                        />
                        <line
                          x1={closestInfo.point.x}
                          y1={closestInfo.point.y}
                          x2={closestInfo.point.x}
                          y2={closestInfo.point.y - 15}
                          stroke="#dc2626"
                          strokeWidth="1"
                          strokeDasharray="2,2"
                        />
                        <text
                          x={closestInfo.point.x}
                          y={closestInfo.point.y - 17}
                          fontSize="8"
                          fill="#dc2626"
                          textAnchor="middle"
                        >
                          {closestInfo.distance.toFixed(1)}
                        </text>
                      </>
                    )}
                  </g>
                )
              })}

            {/* Valid Segments */}
            {showStep === "validSegments" &&
              results.validSegments.map((segment) => {
                const closestInfo = showDistanceDebug
                  ? findClosestPointOnSegmentToAnyCells(
                      segment.start,
                      segment.end,
                      cellContents,
                    )
                  : null

                return (
                  <g key={segment.id}>
                    <line
                      x1={segment.start.x}
                      y1={segment.start.y}
                      x2={segment.end.x}
                      y2={segment.end.y}
                      stroke="#06b6d4"
                      strokeWidth="2"
                      opacity="0.8"
                    />
                    <text
                      x={(segment.start.x + segment.end.x) / 2}
                      y={(segment.start.y + segment.end.y) / 2 - 5}
                      fontSize="10"
                      fill="#000"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      {segment.distanceToAnyCell?.toFixed(1)}
                    </text>
                    {showDistanceDebug && closestInfo && (
                      <>
                        <circle
                          cx={closestInfo.point.x}
                          cy={closestInfo.point.y}
                          r="3"
                          fill="#dc2626"
                          stroke="#fff"
                          strokeWidth="1"
                        />
                      </>
                    )}
                  </g>
                )
              })}

            {/* Polygon rendering removed */}

            {/* Outlines of Merged Rects */}
            {showStep === OUTLINE_STAGE_ID &&
              results.outlineLines.map((line) => (
                <line
                  key={line.id}
                  x1={line.start.x}
                  y1={line.start.y}
                  x2={line.end.x}
                  y2={line.end.y}
                  stroke="purple"
                  strokeWidth="3"
                  opacity="0.9"
                />
              ))}
          </svg>

          {/* ── NEW STAGE 5: SHOW EVERY RECT ───────────────────────────── */}
          {showStep === RECT_STAGE_ID &&
            preMergeRects.map((rect, idx) => {
              const colorClass = colors[rect.colorIdx % colors.length]
              return (
                <div
                  key={`pre-rect-${idx}`}
                  className={`absolute ${colorClass} opacity-40 border-4 border-white rounded-lg pointer-events-none`}
                  style={{
                    left: `${rect.x}px`,
                    top: `${rect.y}px`,
                    width: `${rect.width}px`,
                    height: `${rect.height}px`,
                  }}
                />
              )
            })}

          {/* ❷ DISPLAY MERGED RECTS (IN STAGE 6) -------------------------------- */}
          {showStep === "mergedRects" &&
            results.mergedRectGroups.map((group, groupIdx) => {
              const colorClass =
                mergedRectGroupColors[groupIdx % mergedRectGroupColors.length]
              // The first element in the group is the containing rect, second is the original cell,
              // the rest are other grid rects. We want to draw all of them.
              // Skip the original cell rect (index 1) as it's drawn separately with text.
              // Or, draw all of them here with less opacity and let the main cell draw on top.
              // For now, let's draw all rects in the group.
              return group.map((rect, rectIdx) => (
                <div
                  key={`merged-rect-${groupIdx}-${rect.cellId || rectIdx}`}
                  className={`absolute ${colorClass} opacity-30 border border-white pointer-events-none`}
                  style={{
                    left: `${rect.x}px`,
                    top: `${rect.y}px`,
                    width: `${rect.width}px`,
                    height: `${rect.height}px`,
                  }}
                />
              ))
            })}

          {/* Cell contents */}
          {cellContents.map((cell, index) => {
            const cellId = `cell-${index}` // Consistent with cellId generation in calculateCellBoundaries
            let bgColorClass = colors[index % colors.length] // Default color

            if (showStep === "mergedRects") {
              const mergedColorClass = cellToGroupColorMap.get(cellId)
              if (mergedColorClass) {
                bgColorClass = mergedColorClass
              }
            }

            return (
              <div
                key={index}
                className={`absolute ${bgColorClass} rounded-lg shadow-lg border-2 border-white flex items-center justify-center text-white font-bold text-lg opacity-80 ${draggingCellIndex === null ? "cursor-grab" : draggingCellIndex === index ? "cursor-grabbing" : "cursor-default"}`}
                style={{
                  left: `${cell.x}px`,
                  top: `${cell.y}px`,
                  width: `${cell.width}px`,
                  height: `${cell.height}px`,
                  userSelect: "none", // Prevent text selection during drag
                }}
                onMouseDown={(e) => handleCellMouseDown(index, e)}
              >
                {index + 1}
              </div>
            )
          })}
        </div>

        {/* Info Panel */}
        <div className="w-80 bg-white p-4 rounded-lg border border-gray-300">
          <h3 className="text-lg font-bold mb-3">Algorithm Information</h3>

          <div className="space-y-3 text-sm">
            <div>
              <strong>Cells:</strong> {cellContents.length}
            </div>
            <div>
              <strong>Midlines:</strong> {results.midlines.length}
            </div>
            <div>
              <strong>All Segments:</strong> {results.allSegments.length}
            </div>
            <div>
              <strong>Valid Segments:</strong> {results.validSegments.length}
            </div>
            <div>
              <strong>Pre-merge Rects (Stage 5):</strong>{" "}
              {results.gridRects.length}
            </div>
            <div>
              <strong>Merged Rect Groups (Stage 6):</strong>{" "}
              {results.mergedRectGroups?.length || 0}
              {/* <pre>{JSON.stringify(results.mergedRectGroups, null, 2)}</pre> */}
            </div>
            <div>
              <strong>Outline Lines (Stage 7):</strong>{" "}
              {results.outlineLines?.length || 0}
            </div>
            {/* Polygon counts removed */}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="font-semibold mb-2">Step Description:</h4>
            <div className="text-sm text-gray-600">
              {showStep === "cells" &&
                "Input cells (rectangles) that need boundaries calculated between them."}
              {showStep === "midlines" &&
                "Midlines drawn between all cell pairs with gaps, extending to container bounds."}
              {showStep === "allSegments" &&
                "All segments created between midline intersections. Distance values show minimum distance from segment to any cell."}
              {showStep === "validSegments" &&
                "Segments that don't intersect any cell content (invalid segments removed)."}
              {showStep === RECT_STAGE_ID &&
                "Stage 5: All individual rects prior to any merging. Each rect has its own colour."}
              {showStep === "mergedRects" &&
                "Stage 6: Merged Rects. Displays groups of cells that are considered merged. Rects in the same group share a color."}
              {showStep === OUTLINE_STAGE_ID &&
                "Stage 7: Draw Outlines. External boundaries of the merged rectangle groups, excluding lines on the global container border."}
              {/* Polygon step descriptions removed */}
              {showDistanceDebug &&
                (showStep === "allSegments" ||
                  showStep === "validSegments") && ( // Adjusted condition
                  <div className="mt-2 text-red-600">
                    <strong>Debug Mode:</strong> For segment-based views, red
                    dots show closest point to cells.
                  </div>
                )}
              {colorByDistance &&
                (showStep === "allSegments" ||
                  showStep === "validSegments") && ( // Adjusted condition
                  <div className="mt-2 text-sm">
                    <strong>Color Scale:</strong>
                    <span className="text-blue-600">
                      {" "}
                      Blue = Close to cells
                    </span>{" "}
                    →<span className="text-red-600"> Red = Far from cells</span>
                    <div className="text-xs text-gray-500 mt-1">
                      Max distance: {maxDistance.toFixed(1)}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CellBoundariesVisualization
