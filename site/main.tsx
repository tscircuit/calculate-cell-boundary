import React, { useState, useEffect, useRef, useCallback } from "react"
import { createRoot } from "react-dom/client"
import { calculateCellBoundaries, type CellContent, type Line } from "../lib"

const SVG_WIDTH = 600
const SVG_HEIGHT = 400
const GRID_SIZE = 25
const RECT_FILL_COLOR = "rgba(255, 165, 0, 0.7)"
const RECT_DRAG_FILL_COLOR = "rgba(255, 69, 0, 0.9)"
const LINE_STROKE_COLOR = "black"

const initialCellContents: CellContent[] = [
  { minX: 50, minY: 50, maxX: 150, maxY: 150 },
  { minX: 200, minY: 100, maxX: 300, maxY: 200 },
  { minX: 50, minY: 250, maxX: 150, maxY: 350 },
]

const App: React.FC = () => {
  const [cellContents, setCellContents] =
    useState<CellContent[]>(initialCellContents)
  const [cellContentsJsonInput, setCellContentsJsonInput] = useState<string>(
    JSON.stringify(initialCellContents, null, 2),
  )
  const [calculatedBoundaries, setCalculatedBoundaries] = useState<Line[]>([])
  const [boundariesJsonOutput, setBoundariesJsonOutput] = useState<string>("")
  const [pastedBoundariesJsonInput, setPastedBoundariesJsonInput] =
    useState<string>("")
  const [pastedBoundaries, setPastedBoundaries] = useState<Line[]>([])

  const [draggingCell, setDraggingCell] = useState<{
    index: number
    offsetX: number
    offsetY: number
  } | null>(null)
  const [mousePosition, setMousePosition] = useState<{
    x: number
    y: number
  } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    // When cellContents changes (e.g., after dragging or successful load via button),
    // update the JSON input textarea to reflect the current state.
    setCellContentsJsonInput(JSON.stringify(cellContents, null, 2))

    // Also, recalculate and update boundaries.
    const boundaries = calculateCellBoundaries(cellContents)
    setCalculatedBoundaries(boundaries)
    setBoundariesJsonOutput(JSON.stringify(boundaries, null, 2))
  }, [cellContents])

  const getSVGCoordinates = (
    event: React.MouseEvent | MouseEvent,
  ): { x: number; y: number } => {
    if (svgRef.current) {
      const svgRect = svgRef.current.getBoundingClientRect()
      return {
        x: event.clientX - svgRect.left,
        y: SVG_HEIGHT - (event.clientY - svgRect.top), // Invert Y for Cartesian
      }
    }
    return { x: 0, y: 0 }
  }

  const handleCellMouseDown = (index: number, event: React.MouseEvent) => {
    event.preventDefault()
    const clickPos = getSVGCoordinates(event)
    const cell = cellContents[index]
    setDraggingCell({
      index,
      offsetX: clickPos.x - cell.minX,
      offsetY: clickPos.y - cell.minY, // For Cartesian, this is clickPos.y - cell.minY
    })
  }

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!draggingCell || !svgRef.current) return

      const mousePos = getSVGCoordinates(event)
      let newMinX = mousePos.x - draggingCell.offsetX
      let newMinY = mousePos.y - draggingCell.offsetY

      // Snap to grid
      newMinX = Math.round(newMinX / GRID_SIZE) * GRID_SIZE
      newMinY = Math.round(newMinY / GRID_SIZE) * GRID_SIZE

      const cell = cellContents[draggingCell.index]
      const width = cell.maxX - cell.minX
      const height = cell.maxY - cell.minY

      // Ensure cells stay within SVG bounds
      newMinX = Math.max(0, Math.min(SVG_WIDTH - width, newMinX))
      newMinY = Math.max(0, Math.min(SVG_HEIGHT - height, newMinY))

      const newMaxX = newMinX + width
      const newMaxY = newMinY + height

      setCellContents((prevCells) =>
        prevCells.map((c, i) =>
          i === draggingCell.index
            ? {
                ...c,
                minX: newMinX,
                minY: newMinY,
                maxX: newMaxX,
                maxY: newMaxY,
              }
            : c,
        ),
      )
    },
    [draggingCell, cellContents],
  ) // cellContents is needed here

  const handleMouseUp = useCallback(() => {
    setDraggingCell(null)
  }, [])

  useEffect(() => {
    if (draggingCell) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    } else {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [draggingCell, handleMouseMove, handleMouseUp])

  const handleSvgMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (svgRef.current) {
      const svgRect = svgRef.current.getBoundingClientRect()
      const xSvg = event.clientX - svgRect.left
      const ySvg = event.clientY - svgRect.top // Raw SVG Y, 0 at top, increases downwards

      setMousePosition({
        x: Math.round(xSvg / GRID_SIZE) * GRID_SIZE,
        y: Math.round(ySvg / GRID_SIZE) * GRID_SIZE,
      })
    }
  }

  const handleSvgMouseLeave = () => {
    setMousePosition(null)
  }

  const handleLoadSceneFromJson = () => {
    try {
      // This will trigger the first useEffect to parse and update cellContents
      // No need to call setCellContents directly here.
      // The cellContentsJsonInput is already bound to the textarea.
      // We just need to ensure the useEffect for cellContentsJsonInput runs.
      // Forcing a re-evaluation by setting it to itself if it's already valid,
      // or letting the user's typed value be processed.
      // The useEffect [cellContentsJsonInput] handles the actual parsing and state update.

      // IMPORTANT: Using eval can be a security risk if the input is from an untrusted source.
      // Here, we assume the user is pasting their own, known object literals.
      // Wrap with parentheses to ensure it's evaluated as an expression.
      const parsedCells = eval(`(${cellContentsJsonInput})`) // Attempt to parse using eval

      // If it parses, the useEffect for cellContentsJsonInput will handle it.
      // If it doesn't parse, an alert will be shown.
      // To ensure the useEffect runs if the JSON is valid but hasn't changed textually
      // (e.g. loaded programmatically), we can call setCellContents directly here
      // after validation.
      if (
        Array.isArray(parsedCells) &&
        parsedCells.every(
          (c: any) =>
            typeof c.minX === "number" &&
            typeof c.minY === "number" &&
            typeof c.maxX === "number" &&
            typeof c.maxY === "number" &&
            c.minX < c.maxX &&
            c.minY < c.maxY,
        )
      ) {
        setCellContents(parsedCells)
      } else {
        alert(
          "Invalid CellContents JSON structure. Expected an array of objects with minX, minY, maxX, maxY properties, where minX < maxX and minY < maxY.",
        )
      }
    } catch (error) {
      alert("Error parsing CellContents JSON: " + (error as Error).message)
    }
  }

  const handleLoadPastedBoundariesFromJson = () => {
    if (pastedBoundariesJsonInput.trim() === "") {
      setPastedBoundaries([])
      return
    }
    try {
      // IMPORTANT: Using eval can be a security risk if the input is from an untrusted source.
      // Here, we assume the user is pasting their own, known object literals.
      // Wrap with parentheses to ensure it's evaluated as an expression.
      const parsedLines = eval(`(${pastedBoundariesJsonInput})`) // Attempt to parse using eval
      if (
        Array.isArray(parsedLines) &&
        parsedLines.every(
          (l: any) =>
            typeof l.start === "object" &&
            l.start !== null &&
            typeof l.start.x === "number" &&
            typeof l.start.y === "number" &&
            typeof l.end === "object" &&
            l.end !== null &&
            typeof l.end.x === "number" &&
            typeof l.end.y === "number",
        )
      ) {
        setPastedBoundaries(parsedLines)
      } else {
        alert(
          "Invalid Pasted Boundaries JSON structure. Expected an array of Line objects (e.g., [{ \"start\": { \"x\": 0, \"y\": 0 }, \"end\": { \"x\": 10, \"y\": 10 } }]).",
        )
        // Optionally clear or keep previous valid state:
        // setPastedBoundaries([]);
      }
    } catch (error) {
      alert("Error parsing Pasted Boundaries JSON: " + (error as Error).message)
      // Optionally clear or keep previous valid state:
      // setPastedBoundaries([]);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "20px",
      }}
    >
      <div style={{ position: "relative", width: SVG_WIDTH, height: SVG_HEIGHT }}>
        <svg
          ref={svgRef}
          width={SVG_WIDTH}
          height={SVG_HEIGHT}
        onMouseMove={handleSvgMouseMove}
        onMouseLeave={handleSvgMouseLeave}
      >
        {/* SVG transform for Cartesian coordinates (y-axis points up) */}
        <g transform={`translate(0, ${SVG_HEIGHT}) scale(1, -1)`}>
          {/* Grid Lines */}
          {Array.from({ length: Math.floor(SVG_WIDTH / GRID_SIZE) + 1 }).map(
            (_, i) => (
              <line
                key={`v-grid-line-${i}`}
                x1={i * GRID_SIZE}
                y1="0"
                x2={i * GRID_SIZE}
                y2={SVG_HEIGHT}
                stroke="#e0e0e0"
                strokeWidth="0.5"
              />
            ),
          )}
          {Array.from({ length: Math.floor(SVG_HEIGHT / GRID_SIZE) + 1 }).map(
            (_, i) => (
              <line
                key={`h-grid-line-${i}`}
                x1="0"
                y1={i * GRID_SIZE}
                x2={SVG_WIDTH}
                y2={i * GRID_SIZE}
                stroke="#e0e0e0"
                strokeWidth="0.5"
              />
            ),
          )}

          {/* Cell Rectangles */}
          {cellContents.map((cell, index) => (
            <rect
              key={index}
              x={cell.minX}
              // In SVG with Cartesian transform, y is still min_y for bottom-left corner
              y={cell.minY}
              width={cell.maxX - cell.minX}
              height={cell.maxY - cell.minY}
              fill={
                draggingCell?.index === index
                  ? RECT_DRAG_FILL_COLOR
                  : RECT_FILL_COLOR
              }
              stroke="black"
              strokeWidth="1"
              onMouseDown={(e) => handleCellMouseDown(index, e)}
              style={{ cursor: "grab" }}
            />
          ))}

          {/* Calculated Boundaries */}
          {calculatedBoundaries.map((line, index) => (
            <line
              key={`boundary-${index}`}
              x1={line.start.x}
              y1={line.start.y}
              x2={line.end.x}
              y2={line.end.y}
              stroke={LINE_STROKE_COLOR}
              strokeWidth="2"
            />
          ))}

          {/* Pasted Boundaries */}
          {pastedBoundaries.map((line, index) => (
            <line
              key={`pasted-boundary-${index}`}
              x1={line.start.x}
              y1={line.start.y}
              x2={line.end.x}
              y2={line.end.y}
              stroke="red"
              strokeWidth="2"
              strokeDasharray="5,5" // Dashed red line
            />
          ))}
        </g>
      </svg>
      {mousePosition && (
        <div
          style={{
            position: "absolute",
            bottom: "5px",
            right: "5px",
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            padding: "2px 5px",
            fontSize: "12px",
            fontFamily: "sans-serif",
            pointerEvents: "none", // Ensure it doesn't interfere with SVG mouse events
            color: "black", // Explicitly set text color
          }}
        >
          {`(${mousePosition.x}, ${SVG_HEIGHT - mousePosition.y})`}
        </div>
      )}
    </div>

      <div className="json-io-container">
        <div className="json-io-column">
          <label htmlFor="cell-contents-json">Cell Contents (JSON):</label>
          <textarea
            id="cell-contents-json"
            value={cellContentsJsonInput}
            onChange={(e) => setCellContentsJsonInput(e.target.value)}
            rows={10}
          />
          <button
            onClick={handleLoadSceneFromJson}
            style={{ alignSelf: "flex-start", marginTop: "5px" }}
          >
            Load/Update Scene from JSON
          </button>
        </div>
        <div className="json-io-column">
          <label htmlFor="boundaries-output-json">
            Calculated Boundaries (JSON):
          </label>
          <textarea
            id="boundaries-output-json"
            value={boundariesJsonOutput}
            readOnly
            rows={10}
          />
        </div>
      </div>

      <div className="json-io-column" style={{ marginTop: "20px", width: "100%", maxWidth: "600px" }}>
        <details>
          <summary style={{ fontWeight: "bold", cursor: "pointer", userSelect: "none" }}>
            Pasted Boundaries (JSON)
          </summary>
          <div style={{ marginTop: "10px" }}>
            <label
              htmlFor="pasted-boundaries-json"
              style={{ display: "block", marginBottom: "5px" }}
            >
              Paste Line[] JSON here:
            </label>
            <textarea
              id="pasted-boundaries-json"
              value={pastedBoundariesJsonInput}
              onChange={(e) => setPastedBoundariesJsonInput(e.target.value)}
              rows={5}
              placeholder='[{start:{x:10,y:10},end:{x:100,y:100}}, {start:{x:20,y:20},end:{x:120,y:120}}]'
              style={{ width: "100%", boxSizing: "border-box", padding: "5px", border: "1px solid #ccc", fontFamily: "monospace", fontSize: "12px" }}
            />
            <button
              onClick={handleLoadPastedBoundariesFromJson}
              style={{ marginTop: "10px", padding: "8px 15px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#0056b3")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#007bff")}
            >
              Load/Update Pasted Boundaries
            </button>
          </div>
        </details>
      </div>
    </div>
  )
}

const container = document.getElementById("root")
if (container) {
  const root = createRoot(container)
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}
