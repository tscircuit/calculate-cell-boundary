import React, { useState, useMemo } from 'react';

// Type definitions
interface CellContent {
  cellId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
}

interface Midline {
  id: string;
  start: Point;
  end: Point;
  cellIds: [string, string];
  type: 'horizontal' | 'vertical';
}

interface Line {
  id: string;
  start: Point;
  end: Point;
  fromCellIds?: string[];
  distanceToAnyCell?: number;
}

interface Intersection {
  point: Point;
  midlineIds: string[];
}

// Utility functions
const snapToGrid = (value: number, gridSize: number = 25) => Math.round(value / gridSize) * gridSize;

const pointsEqual = (p1: Point, p2: Point, tolerance: number = 0.1): boolean => {
  return Math.abs(p1.x - p2.x) < tolerance && Math.abs(p1.y - p2.y) < tolerance;
};

const lineIntersection = (line1: Midline, line2: Midline): Point | null => {
  const x1 = line1.start.x, y1 = line1.start.y;
  const x2 = line1.end.x, y2 = line1.end.y;
  const x3 = line2.start.x, y3 = line2.start.y;
  const x4 = line2.end.x, y4 = line2.end.y;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 0.0001) return null; // Parallel lines

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1)
    };
  }
  return null;
};

const lineIntersectsRectangle = (lineStart: Point, lineEnd: Point, rect: CellContent): boolean => {
  // Check if line segment intersects with rectangle
  const { x, y, width, height } = rect;
  
  // Check if either endpoint is inside the rectangle
  const startInside = lineStart.x >= x && lineStart.x <= x + width && 
                     lineStart.y >= y && lineStart.y <= y + height;
  const endInside = lineEnd.x >= x && lineEnd.x <= x + width && 
                   lineEnd.y >= y && lineEnd.y <= y + height;
  
  if (startInside || endInside) return true;
  
  // Check intersection with each edge of the rectangle
  const rectEdges = [
    { start: { x, y }, end: { x: x + width, y } }, // top
    { start: { x: x + width, y }, end: { x: x + width, y: y + height } }, // right
    { start: { x: x + width, y: y + height }, end: { x, y: y + height } }, // bottom
    { start: { x, y: y + height }, end: { x, y } } // left
  ];
  
  for (const edge of rectEdges) {
    if (lineSegmentIntersection(lineStart, lineEnd, edge.start, edge.end)) {
      return true;
    }
  }
  
  return false;
};

const lineSegmentIntersection = (p1: Point, p2: Point, p3: Point, p4: Point): boolean => {
  const x1 = p1.x, y1 = p1.y;
  const x2 = p2.x, y2 = p2.y;
  const x3 = p3.x, y3 = p3.y;
  const x4 = p4.x, y4 = p4.y;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 0.0001) return false; // Parallel lines

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
};

const distanceToCell = (point: Point, cell: CellContent): number => {
  // Find the closest point on the rectangle to the given point
  const closestX = Math.max(cell.x, Math.min(point.x, cell.x + cell.width));
  const closestY = Math.max(cell.y, Math.min(point.y, cell.y + cell.height));
  
  // Calculate distance from the point to the closest point on the rectangle
  const dx = point.x - closestX;
  const dy = point.y - closestY;
  
  return Math.sqrt(dx * dx + dy * dy);
};

const distanceFromSegmentToCell = (start: Point, end: Point, cell: CellContent): number => {
  // Check multiple points along the segment to find minimum distance
  const numSamples = 10;
  let minDistance = Infinity;
  
  for (let i = 0; i <= numSamples; i++) {
    const t = i / numSamples;
    const point = {
      x: start.x + t * (end.x - start.x),
      y: start.y + t * (end.y - start.y)
    };
    const distance = distanceToCell(point, cell);
    minDistance = Math.min(minDistance, distance);
  }
  
  return minDistance;
};

const distanceToAnyCell = (point: Point, cells: CellContent[]): number => {
  return Math.min(...cells.map(cell => distanceToCell(point, cell)));
};

const segmentDistanceToAnyCell = (start: Point, end: Point, cells: CellContent[]): number => {
  return Math.min(...cells.map(cell => distanceFromSegmentToCell(start, end, cell)));
};

const findClosestPointOnSegmentToCell = (start: Point, end: Point, cell: CellContent): { point: Point; distance: number } => {
  // Sample multiple points along the segment
  const numSamples = 20;
  let closestPoint = start;
  let minDistance = Infinity;
  
  for (let i = 0; i <= numSamples; i++) {
    const t = i / numSamples;
    const point = {
      x: start.x + t * (end.x - start.x),
      y: start.y + t * (end.y - start.y)
    };
    const distance = distanceToCell(point, cell);
    if (distance < minDistance) {
      minDistance = distance;
      closestPoint = point;
    }
  }
  
  return { point: closestPoint, distance: minDistance };
};

const findClosestPointOnSegmentToAnyCells = (start: Point, end: Point, cells: CellContent[]): { point: Point; distance: number; cellIndex: number } => {
  let globalClosest = { point: start, distance: Infinity, cellIndex: -1 };
  
  cells.forEach((cell, index) => {
    const { point, distance } = findClosestPointOnSegmentToCell(start, end, cell);
    if (distance < globalClosest.distance) {
      globalClosest = { point, distance, cellIndex: index };
    }
  });
  
  return globalClosest;
};

export const calculateCellBoundaries = (
  inputCellContents: Omit<CellContent, "cellId">[],
  containerWidth: number = 800,
  containerHeight: number = 600
): {
  midlines: Midline[];
  allSegments: Array<Line>;
  validSegments: Array<Line>;
  boundarySegments: Array<Line>;
  remainingBoundarySegments: Array<Line>;
  paths: Array<Array<Line>>;
  cellBoundaries: Array<Line>;
} => {
  const cellContents = inputCellContents.map((cellContent, index) => ({
    ...cellContent,
    cellId: `cell-${index}`,
  }));

  // Step 1: Calculate midlines between all cells
  const midlines: Midline[] = [];
  let midlineId = 0;

  for (let i = 0; i < cellContents.length; i++) {
    for (let j = i + 1; j < cellContents.length; j++) {
      const cell1 = cellContents[i];
      const cell2 = cellContents[j];

      const cell1Right = cell1.x + cell1.width;
      const cell2Right = cell2.x + cell2.width;
      const cell1Bottom = cell1.y + cell1.height;
      const cell2Bottom = cell2.y + cell2.height;

      // Vertical midline (horizontal gap)
      const hasHorizontalGap = (cell1Right < cell2.x) || (cell2Right < cell1.x);
      if (hasHorizontalGap) {
        let midX;
        if (cell1Right < cell2.x) {
          midX = (cell1Right + cell2.x) / 2;
        } else {
          midX = (cell2Right + cell1.x) / 2;
        }
        
        midlines.push({
          id: `midline-${midlineId++}`,
          start: { x: midX, y: 0 },
          end: { x: midX, y: containerHeight },
          cellIds: [cell1.cellId, cell2.cellId],
          type: 'vertical'
        });
      }

      // Horizontal midline (vertical gap)
      const hasVerticalGap = (cell1Bottom < cell2.y) || (cell2Bottom < cell1.y);
      if (hasVerticalGap) {
        let midY;
        if (cell1Bottom < cell2.y) {
          midY = (cell1Bottom + cell2.y) / 2;
        } else {
          midY = (cell2Bottom + cell1.y) / 2;
        }
        
        midlines.push({
          id: `midline-${midlineId++}`,
          start: { x: 0, y: midY },
          end: { x: containerWidth, y: midY },
          cellIds: [cell1.cellId, cell2.cellId],
          type: 'horizontal'
        });
      }
    }
  }

  // Step 2: Calculate intersections between midlines
  const intersections: Intersection[] = [];
  for (let i = 0; i < midlines.length; i++) {
    for (let j = i + 1; j < midlines.length; j++) {
      const intersection = lineIntersection(midlines[i], midlines[j]);
      if (intersection) {
        intersections.push({
          point: intersection,
          midlineIds: [midlines[i].id, midlines[j].id]
        });
      }
    }
  }

  // Step 3: Calculate segments between intersections
  const allSegments: Line[] = [];
  let segmentId = 0;

  midlines.forEach(midline => {
    // Find all intersections on this midline
    const midlineIntersections = intersections
      .filter(int => int.midlineIds.includes(midline.id))
      .map(int => int.point)
      .sort((a, b) => {
        if (midline.type === 'vertical') {
          return a.y - b.y;
        } else {
          return a.x - b.x;
        }
      });

    // Add start and end points
    const allPoints = [midline.start, ...midlineIntersections, midline.end];

    // Create segments between consecutive points
    for (let i = 0; i < allPoints.length - 1; i++) {
      const segment: Line = {
        id: `segment-${segmentId++}`,
        start: allPoints[i],
        end: allPoints[i + 1],
        fromCellIds: midline.cellIds,
        distanceToAnyCell: segmentDistanceToAnyCell(
          allPoints[i],
          allPoints[i + 1],
          cellContents
        )
      };
      allSegments.push(segment);
    }
  });

  // Step 4: Remove segments that intersect cell content (invalid segments)
  const validSegments = allSegments.filter(segment => {
    // Check if the entire segment intersects any cell
    return !cellContents.some(cell => {
      return lineIntersectsRectangle(segment.start, segment.end, cell);
    });
  });

  // Step 5: Determine boundary segments (segments that intersect global boundary)
  const boundarySegments = validSegments.filter(segment => {
    // Check if segment intersects any of the container boundaries
    const touchesLeft = segment.start.x <= 0.1 || segment.end.x <= 0.1;
    const touchesRight = segment.start.x >= containerWidth - 0.1 || segment.end.x >= containerWidth - 0.1;
    const touchesTop = segment.start.y <= 0.1 || segment.end.y <= 0.1;
    const touchesBottom = segment.start.y >= containerHeight - 0.1 || segment.end.y >= containerHeight - 0.1;
    
    return touchesLeft || touchesRight || touchesTop || touchesBottom;
  });

  // Step 6: Eliminate segments that don't have highest distanceToAnyCell among same fromCellIds
  const remainingBoundarySegments = [...boundarySegments];
  const groupedByFromCells = remainingBoundarySegments.reduce((acc, segment) => {
    const key = segment.fromCellIds?.sort().join(',') || '';
    if (!acc[key]) acc[key] = [];
    acc[key].push(segment);
    return acc;
  }, {} as Record<string, Line[]>);

  Object.values(groupedByFromCells).forEach(group => {
    if (group.length > 1) {
      const maxDistance = Math.max(...group.map(s => s.distanceToAnyCell || 0));
      group.forEach(segment => {
        if ((segment.distanceToAnyCell || 0) < maxDistance) {
          const index = remainingBoundarySegments.indexOf(segment);
          if (index > -1) remainingBoundarySegments.splice(index, 1);
        }
      });
    }
  });

  // Step 7 & 8: Build paths using greedy search (UPDATED to stop when hitting previously used segments)
  const paths: Array<Array<Line>> = [];
  const globalUsedStartSegments = new Set<string>(); // Track which boundary segments have been used as starting points
  const globalUsedSegments = new Set<string>(); // Track ALL segments that have been used in any path
  
  // Create a set of boundary segment IDs that were filtered out
  const filteredOutBoundarySegmentIds = new Set<string>();
  boundarySegments.forEach(seg => {
    if (!remainingBoundarySegments.find(remaining => remaining.id === seg.id)) {
      filteredOutBoundarySegmentIds.add(seg.id);
    }
  });
  
  // Valid segments that can be used in paths (excluding filtered boundary segments)
  const pathUsableSegments = validSegments.filter(seg => !filteredOutBoundarySegmentIds.has(seg.id));

  while (remainingBoundarySegments.some(s => !globalUsedStartSegments.has(s.id))) {
    // Find segment with highest distanceToAnyCell that hasn't been used as a starting point
    const availableStarts = remainingBoundarySegments.filter(s => !globalUsedStartSegments.has(s.id));
    let startSegment = availableStarts[0];
    let maxStartDistance = startSegment.distanceToAnyCell || 0;
    
    for (let i = 1; i < availableStarts.length; i++) {
      const segment = availableStarts[i];
      const distance = segment.distanceToAnyCell || 0;
      if (distance > maxStartDistance) {
        maxStartDistance = distance;
        startSegment = segment;
      }
    }

    const currentPath: Line[] = [startSegment];
    const pathUsedSegments = new Set<string>(); // Local to this path only!
    pathUsedSegments.add(startSegment.id);
    globalUsedStartSegments.add(startSegment.id);
    globalUsedSegments.add(startSegment.id); // Add to global used segments

    let currentSegment = startSegment;
    let foundConnection = true;

    while (foundConnection) {
      foundConnection = false;
      
      // Find connected segments from pathUsableSegments
      const connectedSegments = pathUsableSegments.filter(segment => {
        if (pathUsedSegments.has(segment.id)) return false; // Can't use same segment twice in THIS path
        
        return pointsEqual(currentSegment.end, segment.start) ||
               pointsEqual(currentSegment.end, segment.end) ||
               pointsEqual(currentSegment.start, segment.start) ||
               pointsEqual(currentSegment.start, segment.end);
      });

      if (connectedSegments.length > 0) {
        // Pick the one with highest distanceToAnyCell
        let nextSegment = connectedSegments[0];
        let maxDistance = nextSegment.distanceToAnyCell || 0;
        
        for (let i = 1; i < connectedSegments.length; i++) {
          const segment = connectedSegments[i];
          const distance = segment.distanceToAnyCell || 0;
          if (distance > maxDistance) {
            maxDistance = distance;
            nextSegment = segment;
          }
        }
        
        currentPath.push(nextSegment);
        pathUsedSegments.add(nextSegment.id);
        
        // Check if this segment was already used in a previous path
        if (globalUsedSegments.has(nextSegment.id)) {
          // End the path here since we've connected to a previously traversed segment
          break;
        }
        
        globalUsedSegments.add(nextSegment.id); // Add to global used segments
        currentSegment = nextSegment;
        foundConnection = true;
      }
    }

    paths.push(currentPath);
  }

  // Step 9: Create final cell boundaries (may include duplicates if segments are reused)
  const cellBoundaries: Line[] = [];
  const addedSegmentIds = new Set<string>();

  paths.forEach(path => {
    path.forEach(segment => {
      if (!addedSegmentIds.has(segment.id)) {
        cellBoundaries.push(segment);
        addedSegmentIds.add(segment.id);
      }
    });
  });

  return {
    midlines,
    allSegments,
    validSegments,
    boundarySegments,
    remainingBoundarySegments,
    paths,
    cellBoundaries
  };
};

const CellBoundariesVisualization = () => {
  const [cellContents, setCellContents] = useState([
    { x: 100, y: 100, width: 120, height: 80 },
    { x: 300, y: 150, width: 100, height: 100 },
    { x: 150, y: 300, width: 140, height: 90 }
  ]);

  const [showStep, setShowStep] = useState('final');
  const [nextId, setNextId] = useState(4);
  const [highlightReusedSegments, setHighlightReusedSegments] = useState(false);
  const [showDistanceDebug, setShowDistanceDebug] = useState(false);
  const [showFilteredSegments, setShowFilteredSegments] = useState(false);
  const [colorByDistance, setColorByDistance] = useState(false);

  const results = useMemo(() => {
    return calculateCellBoundaries(cellContents);
  }, [cellContents]);

  // Find segments that are connection points between paths
  const connectionSegments = useMemo(() => {
    const segmentUsage = new Map<string, number>();
    results.paths.forEach(path => {
      path.forEach(segment => {
        segmentUsage.set(segment.id, (segmentUsage.get(segment.id) || 0) + 1);
      });
    });
    return new Set(Array.from(segmentUsage.entries())
      .filter(([_, count]) => count > 1)
      .map(([id, _]) => id));
  }, [results.paths]);

  // Find max distance for color scaling
  const maxDistance = useMemo(() => {
    return Math.max(...results.validSegments.map(s => s.distanceToAnyCell || 0));
  }, [results.validSegments]);

  const getDistanceColor = (distance: number) => {
    if (!colorByDistance) return null;
    const normalized = Math.min(distance / maxDistance, 1);
    // Blue (close) to Red (far)
    const hue = (1 - normalized) * 240; // 240 (blue) to 0 (red)
    return `hsl(${hue}, 70%, 50%)`;
  };

  const addCell = () => {
    const newCell = {
      x: snapToGrid(Math.random() * 600),
      y: snapToGrid(Math.random() * 400),
      width: snapToGrid(80 + Math.random() * 80),
      height: snapToGrid(60 + Math.random() * 80)
    };
    setCellContents(prev => [...prev, newCell]);
    setNextId(prev => prev + 1);
  };

  const colors = ['bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-pink-500'];

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-gray-800">Cell Boundaries Algorithm (Reusable Segments)</h2>
          <button 
            onClick={addCell}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
          >
            Add Cell
          </button>
        </div>
        <p className="text-gray-600">Visualizing the cell boundary calculation algorithm. Segments can be reused across paths!</p>
      </div>

      <div className="mb-4 flex gap-4 items-center">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">Visualization Step:</label>
          <select 
            value={showStep} 
            onChange={(e) => setShowStep(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 bg-white"
          >
            <option value="cells">1. Input Cells Only</option>
            <option value="midlines">2. Midlines</option>
            <option value="allSegments">3. All Segments</option>
            <option value="validSegments">4. Valid Segments (No Cell Intersections)</option>
            <option value="boundarySegments">5. Boundary Segments (Touch Global Boundary)</option>
            <option value="remainingBoundary">6. Remaining Boundary Segments (After Distance Filter)</option>
            <option value="paths">7. Paths (Segments Can Be Reused)</option>
            <option value="final">8. Final Cell Boundaries</option>
          </select>
        </div>
        
        {(showStep === 'paths' || showStep === 'final') && (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={highlightReusedSegments}
              onChange={(e) => setHighlightReusedSegments(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm font-medium text-gray-700">Highlight Connection Points</span>
          </label>
        )}
        
        {(showStep !== 'cells' && showStep !== 'midlines') && (
          <>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showDistanceDebug}
                onChange={(e) => setShowDistanceDebug(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">Show Distance Debug</span>
            </label>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={colorByDistance}
                onChange={(e) => setColorByDistance(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">Color by Distance</span>
            </label>
          </>
        )}
      </div>

      <div className="flex gap-6">
        <div 
          className="relative bg-white border-2 border-gray-300"
          style={{ width: '800px', height: '600px' }}
        >
          {/* Grid pattern */}
          <svg 
            className="absolute inset-0 pointer-events-none opacity-10"
            width="800" 
            height="600"
          >
            <defs>
              <pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse">
                <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#666" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Render based on selected step */}
          <svg className="absolute inset-0 pointer-events-none" width="800" height="600">
            {/* Midlines */}
            {(showStep === 'midlines' || showStep === 'allSegments') && results.midlines.map(midline => (
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
            {showStep === 'allSegments' && results.allSegments.map(segment => {
              const closestInfo = showDistanceDebug ? 
                findClosestPointOnSegmentToAnyCells(segment.start, segment.end, cellContents) : null;
              
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
              );
            })}

            {/* Valid Segments */}
            {showStep === 'validSegments' && results.validSegments.map(segment => {
              const closestInfo = showDistanceDebug ? 
                findClosestPointOnSegmentToAnyCells(segment.start, segment.end, cellContents) : null;
              
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
              );
            })}

            {/* Boundary Segments */}
            {showStep === 'boundarySegments' && results.boundarySegments.map(segment => {
              const closestInfo = showDistanceDebug ? 
                findClosestPointOnSegmentToAnyCells(segment.start, segment.end, cellContents) : null;
              const willBeFiltered = !results.remainingBoundarySegments.find(s => s.id === segment.id);
              
              return (
                <g key={segment.id}>
                  <line
                    x1={segment.start.x}
                    y1={segment.start.y}
                    x2={segment.end.x}
                    y2={segment.end.y}
                    stroke={willBeFiltered ? "#9ca3af" : "#10b981"}
                    strokeWidth="2"
                    opacity={willBeFiltered ? "0.4" : "0.8"}
                    strokeDasharray={willBeFiltered ? "3,3" : "none"}
                  />
                  <text
                    x={(segment.start.x + segment.end.x) / 2}
                    y={(segment.start.y + segment.end.y) / 2 - 5}
                    fontSize="10"
                    fill={willBeFiltered ? "#9ca3af" : "#000"}
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
              );
            })}

            {/* Remaining Boundary Segments */}
            {showStep === 'remainingBoundary' && results.remainingBoundarySegments.map(segment => (
              <g key={segment.id}>
                <line
                  x1={segment.start.x}
                  y1={segment.start.y}
                  x2={segment.end.x}
                  y2={segment.end.y}
                  stroke="#8b5cf6"
                  strokeWidth="3"
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
              </g>
            ))}

            {/* Paths */}
            {showStep === 'paths' && results.paths.map((path, pathIndex) => {
              const pathColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];
              const pathColor = pathColors[pathIndex % pathColors.length];
              
              return (
                <g key={`path-${pathIndex}`}>
                  {path.map((segment, segmentIndex) => {
                    const segmentColor = getDistanceColor(segment.distanceToAnyCell || 0) || 
                      (highlightReusedSegments && reusedSegments.has(segment.id) ? '#000000' : pathColor);
                    
                    return (
                      <g key={`${segment.id}-path${pathIndex}`}>
                        <line
                          x1={segment.start.x}
                          y1={segment.start.y}
                          x2={segment.end.x}
                          y2={segment.end.y}
                          stroke={segmentColor}
                          strokeWidth={highlightReusedSegments && reusedSegments.has(segment.id) ? "8" : "4"}
                          opacity="0.7"
                          strokeDasharray={highlightReusedSegments && reusedSegments.has(segment.id) ? "none" : "none"}
                        />
                        {highlightReusedSegments && reusedSegments.has(segment.id) && (
                          <>
                            <circle cx={segment.start.x} cy={segment.start.y} r="4" fill="#ff0000" />
                            <circle cx={segment.end.x} cy={segment.end.y} r="4" fill="#ff0000" />
                          </>
                        )}
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
                        {/* Show path order */}
                        {showDistanceDebug && (
                          <circle
                            cx={(segment.start.x + segment.end.x) / 2}
                            cy={(segment.start.y + segment.end.y) / 2}
                            r="8"
                            fill="white"
                            stroke={colorByDistance ? "#333" : pathColor}
                            strokeWidth="2"
                          />
                        )}
                        {showDistanceDebug && (
                          <text
                            x={(segment.start.x + segment.end.x) / 2}
                            y={(segment.start.y + segment.end.y) / 2 + 3}
                            fontSize="8"
                            fill={colorByDistance ? "#333" : pathColor}
                            textAnchor="middle"
                            fontWeight="bold"
                          >
                            {segmentIndex + 1}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              );
            })}

            {/* Final Cell Boundaries */}
            {showStep === 'final' && results.cellBoundaries.map(segment => (
              <g key={segment.id}>
                <line
                  x1={segment.start.x}
                  y1={segment.start.y}
                  x2={segment.end.x}
                  y2={segment.end.y}
                  stroke={highlightReusedSegments && reusedSegments.has(segment.id) ? '#8b5cf6' : '#dc2626'}
                  strokeWidth={highlightReusedSegments && reusedSegments.has(segment.id) ? "5" : "3"}
                  opacity="0.9"
                />
                {highlightReusedSegments && reusedSegments.has(segment.id) && (
                  <>
                    <circle cx={segment.start.x} cy={segment.start.y} r="3" fill="#8b5cf6" />
                    <circle cx={segment.end.x} cy={segment.end.y} r="3" fill="#8b5cf6" />
                  </>
                )}
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
              </g>
            ))}
          </svg>

          {/* Cell contents */}
          {cellContents.map((cell, index) => (
            <div
              key={index}
              className={`absolute ${colors[index % colors.length]} rounded-lg shadow-lg border-2 border-white flex items-center justify-center text-white font-bold text-lg opacity-80`}
              style={{
                left: `${cell.x}px`,
                top: `${cell.y}px`,
                width: `${cell.width}px`,
                height: `${cell.height}px`,
              }}
            >
              {index + 1}
            </div>
          ))}
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
              <strong>Boundary Segments:</strong> {results.boundarySegments.length}
            </div>
            <div>
              <strong>Remaining After Filter:</strong> {results.remainingBoundarySegments.length}
              <span className="text-gray-500"> ({results.boundarySegments.length - results.remainingBoundarySegments.length} filtered)</span>
            </div>
            <div>
              <strong>Paths:</strong> {results.paths.length}
            </div>
            <div>
              <strong>Final Boundaries:</strong> {results.cellBoundaries.length}
            </div>
            {(showStep === 'paths' || showStep === 'final') && (
              <div className="text-purple-600">
                <strong>Connection Points:</strong> {reusedSegments.size}
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="font-semibold mb-2">Step Description:</h4>
            <div className="text-sm text-gray-600">
              {showStep === 'cells' && "Input cells (rectangles) that need boundaries calculated between them."}
              {showStep === 'midlines' && "Midlines drawn between all cell pairs with gaps, extending to container bounds."}
              {showStep === 'allSegments' && "All segments created between midline intersections. Distance values show minimum distance from segment to any cell."}
              {showStep === 'validSegments' && "Segments that don't intersect any cell content (invalid segments removed)."}
              {showStep === 'boundarySegments' && "Valid segments that touch the global boundary (container edges). Gray dashed segments will be filtered out in the next step."}
              {showStep === 'remainingBoundary' && "Boundary segments after filtering by highest distance to cells. Only segments with the maximum distance among those sharing the same fromCellIds are kept."}
              {showStep === 'paths' && (
                <>
                  Connected paths built using greedy search. <strong>Key behaviors:</strong> 
                  <br/>• Paths start from remaining boundary segments (highest distance first)
                  <br/>• At each step, selects the connected segment with highest distance
                  <br/>• <strong>Paths end when they contact any previously traversed segment</strong>
                  <br/>• Segments cannot be reused within the same path (no backtracking)
                  {highlightReusedSegments && reusedSegments.size > 0 && <><br/>• <strong>Connection points:</strong> Segments where paths meet are highlighted (thicker lines with red endpoints)</>}
                  {showDistanceDebug && <><br/>• Path order shown with numbered circles</>}
                </>
              )}
              {showStep === 'final' && (
                <>
                  Final cell boundaries - the output of the algorithm. These are all unique segments from all paths combined.
                  Paths terminate when they contact previously traversed segments, creating a connected boundary network.
                  {highlightReusedSegments && reusedSegments.size > 0 && <><br/><strong>Connection points</strong> (where paths meet) are highlighted.</>}
                </>
              )}
              {showDistanceDebug && showStep !== 'cells' && showStep !== 'midlines' && (
                <div className="mt-2 text-red-600">
                  <strong>Debug Mode:</strong> Red dots show the closest point on each segment to any cell, with the actual distance displayed.
                </div>
              )}
              {colorByDistance && showStep === 'paths' && (
                <div className="mt-2 text-sm">
                  <strong>Color Scale:</strong> 
                  <span className="text-blue-600"> Blue = Close to cells</span> → 
                  <span className="text-red-600"> Red = Far from cells</span>
                  <div className="text-xs text-gray-500 mt-1">
                    Max distance: {maxDistance.toFixed(1)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {showStep === 'paths' && results.paths.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="font-semibold mb-2">Path Details:</h4>
              <div className="text-sm space-y-2">
                {results.paths.map((path, index) => {
                  const pathColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];
                  const pathColor = pathColors[index % pathColors.length];
                  const avgDistance = path.reduce((sum, seg) => sum + (seg.distanceToAnyCell || 0), 0) / path.length;
                  return (
                    <div key={index} className="text-gray-600">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: pathColor }}
                        />
                        <span className="font-medium">Path {index + 1}:</span> {path.length} segments
                      </div>
                      <div className="ml-6 text-xs text-gray-500">
                        Avg distance: {avgDistance.toFixed(1)}
                        {showDistanceDebug && (
                          <div>Distances: {path.map(s => s.distanceToAnyCell?.toFixed(1)).join(' → ')}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {showDistanceDebug && (
                <div className="mt-2 text-xs text-gray-500">
                  <strong>Debug:</strong> Numbers in circles show segment order in path. 
                  Paths terminate when they contact previously used segments.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CellBoundariesVisualization;