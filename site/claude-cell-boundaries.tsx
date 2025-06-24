import React, { useState, useMemo } from 'react';

// Type definitions
interface PolygonType extends Array<Point> {}

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

const POINT_COMPARISON_TOLERANCE = 0.001; // Used for comparing float coordinates

const pointsEqual = (p1: Point, p2: Point, tolerance: number = POINT_COMPARISON_TOLERANCE): boolean => {
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

// Helper function to convert a Point to a string key
// Precision should be related to POINT_COMPARISON_TOLERANCE
const pointToKey = (p: Point): string => `${p.x.toFixed(4)},${p.y.toFixed(4)}`; 

const getAngle = (p1: Point, p2: Point): number => {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
};

// Helper function: Check if a point is inside a polygon (ray casting algorithm)
const isPointInPolygon = (point: Point, polygon: Point[]): boolean => {
  let intersections = 0;
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % n];

    if (p1.y === p2.y) continue; // Skip horizontal segments
    if (point.y < Math.min(p1.y, p2.y)) continue; // Point below segment
    if (point.y >= Math.max(p1.y, p2.y)) continue; // Point above segment

    // Calculate x-intersection of ray from point
    const xIntersection = (point.y - p1.y) * (p2.x - p1.x) / (p2.y - p1.y) + p1.x;
    if (xIntersection > point.x) { // Point is to the left of intersection
      intersections++;
    }
  }
  return intersections % 2 === 1;
};

// Helper function: Find a path between two points using BFS
const findPathBetweenPoints = (startPoint: Point, endPoint: Point, segments: Line[]): Point[] | null => {
  const adj = new Map<string, Point[]>();
  const allPoints = new Map<string, Point>();

  const addPoint = (p: Point) => {
    const key = pointToKey(p);
    if (!allPoints.has(key)) {
      allPoints.set(key, p);
      adj.set(key, []);
    }
    return key;
  };

  segments.forEach(segment => {
    const keyStart = addPoint(segment.start);
    const keyEnd = addPoint(segment.end);
    adj.get(keyStart)!.push(segment.end);
    adj.get(keyEnd)!.push(segment.start);
  });

  const startKey = pointToKey(startPoint);
  const endKey = pointToKey(endPoint);

  if (!allPoints.has(startKey) || !allPoints.has(endKey)) {
    return null; // Start or end point not in segments
  }

  const queue: Point[][] = [[startPoint]];
  const visited = new Set<string>([startKey]);

  while (queue.length > 0) {
    const currentPath = queue.shift()!;
    const lastPointInPath = currentPath[currentPath.length - 1];
    const lastPointKey = pointToKey(lastPointInPath);

    if (pointsEqual(lastPointInPath, endPoint)) {
      return currentPath; // Path found
    }

    const neighbors = adj.get(lastPointKey) || [];
    for (const neighbor of neighbors) {
      const neighborKey = pointToKey(neighbor);
      if (!visited.has(neighborKey)) {
        visited.add(neighborKey);
        const newPath = [...currentPath, neighbor];
        queue.push(newPath);
      }
    }
  }
  return null; // Path not found
};

// Helper function: Count cells inside a polygon
const countCellsInPolygon = (polygon: Point[], cells: CellContent[]): number => {
  let count = 0;
  cells.forEach(cell => {
    const cellCenter = {
      x: cell.x + cell.width / 2,
      y: cell.y + cell.height / 2,
    };
    if (isPointInPolygon(cellCenter, polygon)) {
      count++;
    }
  });
  return count;
};

export const calculateCellBoundaries = (
  inputCellContents: Omit<CellContent, "cellId">[],
  containerWidth: number = 800,
  containerHeight: number = 600
): {
  midlines: Midline[];
  allSegments: Array<Line>;
  validSegments: Array<Line>;
  polygons: Array<PolygonType>;
  mergedPolygons: Array<PolygonType>;
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

  // Step 5: Construct Polygons from validSegments and container boundaries
  const polygons: PolygonType[] = [];
  let boundarySegmentIdCounter = 0;

  // 5.1: Augment with Boundary Segments
  const boundaryClosureSegments: Line[] = [];
  const containerCorners = {
    TL: { x: 0, y: 0 },
    TR: { x: containerWidth, y: 0 },
    BR: { x: containerWidth, y: containerHeight },
    BL: { x: 0, y: containerHeight },
  };

  const addBoundarySegmentsForEdge = (
    edgePoints: Point[],
    fixedCoord: 'x' | 'y',
    fixedValue: number,
    sortCoord: 'x' | 'y'
  ) => {
    const uniquePoints = Array.from(new Map(edgePoints.map(p => [pointToKey(p), p])).values())
      .sort((a, b) => a[sortCoord] - b[sortCoord]);

    for (let i = 0; i < uniquePoints.length - 1; i++) {
      const p1 = uniquePoints[i];
      const p2 = uniquePoints[i + 1];
      // Ensure segment has length
      if (!pointsEqual(p1, p2)) {
        boundaryClosureSegments.push({
          id: `boundary-${boundarySegmentIdCounter++}`,
          start: p1,
          end: p2,
          distanceToAnyCell: 0, // Boundary segments are on the edge
        });
      }
    }
  };

  const pointsOnTop = validSegments.flatMap(s => [s.start, s.end]).filter(p => Math.abs(p.y - 0) < POINT_COMPARISON_TOLERANCE);
  pointsOnTop.push(containerCorners.TL, containerCorners.TR);
  addBoundarySegmentsForEdge(pointsOnTop, 'y', 0, 'x');

  const pointsOnBottom = validSegments.flatMap(s => [s.start, s.end]).filter(p => Math.abs(p.y - containerHeight) < POINT_COMPARISON_TOLERANCE);
  pointsOnBottom.push(containerCorners.BL, containerCorners.BR);
  addBoundarySegmentsForEdge(pointsOnBottom, 'y', containerHeight, 'x');
  
  const pointsOnLeft = validSegments.flatMap(s => [s.start, s.end]).filter(p => Math.abs(p.x - 0) < POINT_COMPARISON_TOLERANCE);
  pointsOnLeft.push(containerCorners.TL, containerCorners.BL);
  addBoundarySegmentsForEdge(pointsOnLeft, 'x', 0, 'y');

  const pointsOnRight = validSegments.flatMap(s => [s.start, s.end]).filter(p => Math.abs(p.x - containerWidth) < POINT_COMPARISON_TOLERANCE);
  pointsOnRight.push(containerCorners.TR, containerCorners.BR);
  addBoundarySegmentsForEdge(pointsOnRight, 'x', containerWidth, 'y');
  
  const allSegmentsForCycles = [...validSegments, ...boundaryClosureSegments];

  // 5.2: Build Adjacency List with Angles
  const adj = new Map<string, { toPoint: Point, segmentId: string, angle: number }[]>();
  allSegmentsForCycles.forEach(seg => {
    const keyStart = pointToKey(seg.start);
    const keyEnd = pointToKey(seg.end);

    if (!adj.has(keyStart)) adj.set(keyStart, []);
    adj.get(keyStart)!.push({ toPoint: seg.end, segmentId: seg.id, angle: getAngle(seg.start, seg.end) });

    if (!adj.has(keyEnd)) adj.set(keyEnd, []);
    adj.get(keyEnd)!.push({ toPoint: seg.start, segmentId: seg.id, angle: getAngle(seg.end, seg.start) });
  });

  adj.forEach(neighbors => neighbors.sort((a, b) => a.angle - b.angle));

  // 5.3: Find Cycles (Polygons)
  const visitedDirectedEdges = new Set<string>(); // "key(fromPoint)->key(toPoint)"

  for (const segment of allSegmentsForCycles) {
    const processDirectedEdge = (cycleStartNode: Point, firstPathNode: Point) => {
      const initialEdgeKey = pointToKey(cycleStartNode) + "->" + pointToKey(firstPathNode);
      if (visitedDirectedEdges.has(initialEdgeKey)) return;

      const currentPathPoints: Point[] = [cycleStartNode];
      let currentNode = firstPathNode;
      let prevNode = cycleStartNode;
      let iteration = 0;
      const maxIterations = allSegmentsForCycles.length + 5; // Safety break

      while (iteration++ < maxIterations) {
        currentPathPoints.push(currentNode);
        visitedDirectedEdges.add(pointToKey(prevNode) + "->" + pointToKey(currentNode));

        if (pointsEqual(currentNode, cycleStartNode)) { // Cycle closed
          // Path is [S, P1, P2, ..., S]. We want [S, P1, P2, ...]
                  const finalPolygonPoints = currentPathPoints.slice(0, -1);
          if (finalPolygonPoints.length >= 3) { // Valid polygon
            polygons.push(finalPolygonPoints);
          }
          break;
        }

        const neighbors = adj.get(pointToKey(currentNode));
        if (!neighbors || neighbors.length === 0) break; // Should not happen in a connected graph

        const angleFromPrevToCurrent = getAngle(currentNode, prevNode); // Angle of (currentNode -> prevNode)
        
        let indexOfIncomingEdge = -1;
        for(let i=0; i<neighbors.length; ++i) {
            if(Math.abs(neighbors[i].angle - angleFromPrevToCurrent) < POINT_COMPARISON_TOLERANCE) {
                indexOfIncomingEdge = i;
                break;
            }
        }

        if (indexOfIncomingEdge === -1) break; // Should find the incoming edge

        const nextNeighborData = neighbors[(indexOfIncomingEdge + 1) % neighbors.length];
        
        prevNode = currentNode;
        currentNode = nextNeighborData.toPoint;

        // Check if next edge has already been visited in this direction
        if (visitedDirectedEdges.has(pointToKey(prevNode) + "->" + pointToKey(currentNode))) {
             // This can happen if we hit a path already explored from another starting segment of the same face
             // or if it's a bridge segment. If it leads back to start, it's fine.
             // If it leads elsewhere, it might mean the face is already captured or it's complex.
             // For simple polygons, this might indicate completion or an issue.
             // If this edge leads back to startNodeCycle, the main check `pointsEqual(currentNode, cycleStartNode)` will handle it.
             // Otherwise, breaking here prevents re-tracing parts of other faces or complex structures.
            if (!pointsEqual(currentNode, cycleStartNode)) {
                 break;
            }
        }
      }
    };
    // Process both directions for each segment as a potential starting edge of a face traversal
    processDirectedEdge(segment.start, segment.end);
    processDirectedEdge(segment.end, segment.start);
  }
  
  // Deduplicate polygons (important if multiple start edges trace the same face)
  const uniquePolygonsMap = new Map<string, PolygonType>();
  polygons.forEach(poly => {
      // Normalize polygon representation for consistent keying (e.g., sort points by angle from centroid, or just use sorted point keys)
      const keyPoints = [...poly].sort((a,b) => a.x === b.x ? a.y - b.y : a.x - b.x).map(p => pointToKey(p)).join('|');
      if (!uniquePolygonsMap.has(keyPoints)) {
          uniquePolygonsMap.set(keyPoints, poly);
      }
  });

  return {
    midlines,
    allSegments,
    validSegments,
    polygons: Array.from(uniquePolygonsMap.values()),
    mergedPolygons: calculateMergedPolygons(Array.from(uniquePolygonsMap.values()), allSegmentsForCycles, cellContents),
  };
};

const getPolygonSegments = (polygon: PolygonType): { start: Point, end: Point }[] => {
  const segments = [];
  for (let i = 0; i < polygon.length; i++) {
    segments.push({ start: polygon[i], end: polygon[(i + 1) % polygon.length] });
  }
  return segments;
};

const getCanonicalSegmentKey = (p1: Point, p2: Point): string => {
  const key1 = pointToKey(p1);
  const key2 = pointToKey(p2);
  return key1 < key2 ? `${key1}_${key2}` : `${key2}_${key1}`;
};

// Stage 6: Merge Polygons
const calculateMergedPolygons = (
  initialPolygons: PolygonType[],
  sourceSegments: Line[], // Segments with distanceToAnyCell info
  cellContents: CellContent[]
): PolygonType[] => {
  let currentPolygons = initialPolygons.map((poly, index) => ({ id: `poly-${index}`, points: poly }));

  // Create a map of all source segments for quick lookup of distanceToAnyCell
  const sourceSegmentMap = new Map<string, Line>();
  sourceSegments.forEach(seg => {
    sourceSegmentMap.set(getCanonicalSegmentKey(seg.start, seg.end), seg);
  });

  // Identify shared internal segments and sort them
  const sharedSegmentsToConsider: { segment: Line, polyIds: [string, string] }[] = [];
  const segmentToPolygonsMap = new Map<string, { segmentLine: Line, polygonIds: string[] }>();

  currentPolygons.forEach(poly => {
    const polygonSegments = getPolygonSegments(poly.points);
    polygonSegments.forEach(seg => {
      const canonicalKey = getCanonicalSegmentKey(seg.start, seg.end);
      const originalSegment = sourceSegmentMap.get(canonicalKey);
      if (!originalSegment) {
        // This might be a segment from a previously merged polygon, or an issue.
        // For now, we only consider segments that were in the original set.
        // console.warn("Segment not found in source map:", canonicalKey);
        return; 
      }

      if (!segmentToPolygonsMap.has(canonicalKey)) {
        segmentToPolygonsMap.set(canonicalKey, { segmentLine: originalSegment, polygonIds: [] });
      }
      segmentToPolygonsMap.get(canonicalKey)!.polygonIds.push(poly.id);
    });
  });

  segmentToPolygonsMap.forEach(({ segmentLine, polygonIds }) => {
    if (polygonIds.length === 2) { // Shared by exactly two polygons
      // Ensure it's not a boundary segment (distanceToAnyCell > 0 or not on container edge)
      // For simplicity, we rely on distanceToAnyCell. Boundary segments from closure have 0.
      // If a validSegment happens to have distance 0 and is internal, it could be merged.
      // This seems fine by the rule "lowest distanceToAnyCell".
      sharedSegmentsToConsider.push({ segment: segmentLine, polyIds: [polygonIds[0], polygonIds[1]] });
    }
  });

  sharedSegmentsToConsider.sort((a, b) => (a.segment.distanceToAnyCell || 0) - (b.segment.distanceToAnyCell || 0));

  for (const { segment: sharedSeg, polyIds } of sharedSegmentsToConsider) {
    const poly1Obj = currentPolygons.find(p => p.id === polyIds[0]);
    const poly2Obj = currentPolygons.find(p => p.id === polyIds[1]);

    if (!poly1Obj || !poly2Obj) continue; // One or both polygons already merged

    const poly1 = poly1Obj.points;
    const poly2 = poly2Obj.points;

    // Attempt to merge poly1 and poly2 by removing sharedSeg
    const s1 = sharedSeg.start;
    const s2 = sharedSeg.end;

    const findPath = (polygon: Point[], startNode: Point, endNode: Point): Point[] | null => {
      const startIndex = polygon.findIndex(p => pointsEqual(p, startNode));
      if (startIndex === -1) return null;
      
      const path: Point[] = [];
      let currentIndex = startIndex;
      for (let i = 0; i < polygon.length; i++) {
          path.push(polygon[currentIndex]);
          if (pointsEqual(polygon[currentIndex], endNode)) break;
          currentIndex = (currentIndex + 1) % polygon.length;
      }
      // Ensure endNode was actually reached and forms a path
      if (!pointsEqual(path[path.length-1], endNode)) return null; 
      return path;
    };
    
    // Path from poly1, s1 -> ... -> s2 (this is the shared segment part)
    // Path from poly2, s2 -> ... -> s1 (this is the shared segment part in other poly)

    // We need the parts *not* including the shared segment.
    // In poly1: path from s2 -> ... -> s1
    // In poly2: path from s1 -> ... -> s2
    
    let path1 = findPath(poly1, s2, s1); // Path in poly1 from s2 around to s1
    let path2 = findPath(poly2, s1, s2); // Path in poly2 from s1 around to s2

    if (!path1 || !path2) continue; // Should not happen if logic is correct

    // The merged polygon points are s1, (points from path2 excluding s1 and s2), s2, (points from path1 excluding s2 and s1)
    // More simply: path2 (which is s1...s2) followed by path1 (s2...s1) excluding duplicate s2 and s1.
    const mergedPoints: Point[] = [];
    path2.forEach(p => mergedPoints.push(p)); // Adds s1...s2 from poly2
    // Add points from path1, skipping the first (s2, already added) and last (s1, will close loop)
    for (let i = 1; i < path1.length -1; i++) {
        mergedPoints.push(path1[i]);
    }
    
    if (mergedPoints.length < 3) continue; // Not a valid polygon

    const numCells = countCellsInPolygon(mergedPoints, cellContents);

    if (numCells <= 1) {
      // Merge is valid
      const newPolyId = `${poly1Obj.id}-${poly2Obj.id}-merged`;
      currentPolygons = currentPolygons.filter(p => p.id !== poly1Obj.id && p.id !== poly2Obj.id);
      currentPolygons.push({ id: newPolyId, points: mergedPoints });
    }
  }
  return currentPolygons.map(p => p.points);
};


const CellBoundariesVisualization = () => {
  const [cellContents, setCellContents] = useState([
    { x: 100, y: 100, width: 120, height: 80 },
    { x: 300, y: 150, width: 100, height: 100 },
    { x: 150, y: 300, width: 140, height: 90 }
  ]);
  const [draggingCellIndex, setDraggingCellIndex] = useState<number | null>(null);
  const [dragStartOffset, setDragStartOffset] = useState<Point | null>(null);

  const [showStep, setShowStep] = useState('final');
  const [nextId, setNextId] = useState(4);
  // const [highlightReusedSegments, setHighlightReusedSegments] = useState(false); // Removed
  const [showDistanceDebug, setShowDistanceDebug] = useState(false);
  const [showFilteredSegments, setShowFilteredSegments] = useState(false); // This seems unused, consider removing later if confirmed
  const [colorByDistance, setColorByDistance] = useState(false);
  const [hiddenPathIndices, setHiddenPathIndices] = useState<Set<number>>(new Set());

  const results = useMemo(() => {
    return calculateCellBoundaries(cellContents);
  }, [cellContents]);

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

  const handleCellMouseDown = (index: number, event: React.MouseEvent) => {
    event.preventDefault();
    const cellElement = event.currentTarget as HTMLElement;
    const containerElement = cellElement.offsetParent as HTMLElement;

    if (!containerElement) {
      console.error("Draggable item's container not found. Cannot start drag.");
      return;
    }

    const containerRect = containerElement.getBoundingClientRect();
    const cell = cellContents[index]; // cell is {x, y, width, height} relative to container

    setDraggingCellIndex(index);
    setDragStartOffset({
      x: (event.clientX - containerRect.left) - cell.x,
      y: (event.clientY - containerRect.top) - cell.y,
    });
    document.body.style.cursor = 'grabbing';
  };

  const handleContainerMouseMove = (event: React.MouseEvent) => {
    if (draggingCellIndex === null || !dragStartOffset) return;
    event.preventDefault();

    const containerRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    
    let newX = event.clientX - dragStartOffset.x - containerRect.left;
    let newY = event.clientY - dragStartOffset.y - containerRect.top;

    newX = snapToGrid(newX);
    newY = snapToGrid(newY);
    
    // Prevent dragging outside container boundaries (optional, adjust as needed)
    // newX = Math.max(0, Math.min(newX, 800 - cellContents[draggingCellIndex].width));
    // newY = Math.max(0, Math.min(newY, 600 - cellContents[draggingCellIndex].height));


    setCellContents(prev =>
      prev.map((cell, index) =>
        index === draggingCellIndex
          ? { ...cell, x: newX, y: newY }
          : cell
      )
    );
  };

  const handleContainerMouseUp = () => {
    if (draggingCellIndex !== null) {
      setDraggingCellIndex(null);
      setDragStartOffset(null);
      document.body.style.cursor = 'default';
    }
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
            <option value="final">5. Constructed Polygons</option>
            <option value="merged">6. Merged Polygons</option>
          </select>
        </div>
        
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

            {/* Final Cell Boundaries (now Constructed Polygons) */}
            {showStep === 'final' && results.polygons.map((polygon, index) => {
              const polygonColors = [
                "rgba(59, 130, 246, 0.3)", // blue-500
                "rgba(239, 68, 68, 0.3)",  // red-500
                "rgba(16, 185, 129, 0.3)", // green-500
                "rgba(168, 85, 247, 0.3)", // purple-500
                "rgba(245, 158, 11, 0.3)", // yellow-500 (amber-500)
                "rgba(236, 72, 153, 0.3)", // pink-500
                "rgba(20, 184, 166, 0.3)", // teal-500
                "rgba(249, 115, 22, 0.3)", // orange-500
              ];
              const fillColor = polygonColors[index % polygonColors.length];
              return (
                <polygon
                  key={`polygon-${index}`}
                  points={polygon.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
                  fill={fillColor}
                  stroke="#4B5563" // gray-600 for border
                  strokeWidth="1"
                />
              );
            })}
            {/* Optionally, draw segments of polygons if needed for debug, colored by distance */}
            {showStep === 'final' && colorByDistance && results.polygons.flatMap((poly, polyIndex) => {
              const segments: Line[] = [];
              for (let i = 0; i < poly.length; i++) {
                const p1 = poly[i];
                const p2 = poly[(i + 1) % poly.length];
                // Find original segment or create a temporary one for distance calculation
                const dist = segmentDistanceToAnyCell(p1, p2, cellContents);
                segments.push({ id: `poly-${polyIndex}-seg-${i}`, start: p1, end: p2, distanceToAnyCell: dist });
              }
              return segments.map(segment => (
                 <g key={segment.id}>
                  <line
                    x1={segment.start.x}
                    y1={segment.start.y}
                    x2={segment.end.x}
                    y2={segment.end.y}
                    stroke={getDistanceColor(segment.distanceToAnyCell || 0) || '#333'}
                    strokeWidth="2"
                    opacity="0.7"
                  />
                  {showDistanceDebug && (
                     <text
                        x={(segment.start.x + segment.end.x) / 2}
                        y={(segment.start.y + segment.end.y) / 2 - 5}
                        fontSize="9" fill={getDistanceColor(segment.distanceToAnyCell || 0) || '#333'} textAnchor="middle">
                        {segment.distanceToAnyCell?.toFixed(0)}
                      </text>
                  )}
                </g>
              ));
            })}

            {/* Merged Polygons */}
            {showStep === 'merged' && results.mergedPolygons.map((polygon, index) => {
              const polygonColors = [ // Slightly different set or more opaque for merged
                "rgba(59, 130, 246, 0.5)", // blue-500
                "rgba(239, 68, 68, 0.5)",  // red-500
                "rgba(16, 185, 129, 0.5)", // green-500
                "rgba(168, 85, 247, 0.5)", // purple-500
                "rgba(245, 158, 11, 0.5)", // yellow-500 (amber-500)
                "rgba(236, 72, 153, 0.5)", // pink-500
                "rgba(20, 184, 166, 0.5)", // teal-500
                "rgba(249, 115, 22, 0.5)", // orange-500
              ];
              const fillColor = polygonColors[index % polygonColors.length];
              return (
                <polygon
                  key={`merged-polygon-${index}`}
                  points={polygon.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
                  fill={fillColor}
                  stroke="#374151" // gray-700 for border
                  strokeWidth="1.5"
                />
              );
            })}
            {/* Optionally, draw segments of merged polygons if needed for debug, colored by distance */}
            {showStep === 'merged' && colorByDistance && results.mergedPolygons.flatMap((poly, polyIndex) => {
              const segments: Line[] = [];
              for (let i = 0; i < poly.length; i++) {
                const p1 = poly[i];
                const p2 = poly[(i + 1) % poly.length];
                const dist = segmentDistanceToAnyCell(p1, p2, cellContents);
                segments.push({ id: `merged-poly-${polyIndex}-seg-${i}`, start: p1, end: p2, distanceToAnyCell: dist });
              }
              return segments.map(segment => (
                 <g key={segment.id}>
                  <line
                    x1={segment.start.x}
                    y1={segment.start.y}
                    x2={segment.end.x}
                    y2={segment.end.y}
                    stroke={getDistanceColor(segment.distanceToAnyCell || 0) || '#333'}
                    strokeWidth="2"
                    opacity="0.7"
                  />
                  {showDistanceDebug && (
                     <text
                        x={(segment.start.x + segment.end.x) / 2}
                        y={(segment.start.y + segment.end.y) / 2 - 5}
                        fontSize="9" fill={getDistanceColor(segment.distanceToAnyCell || 0) || '#333'} textAnchor="middle">
                        {segment.distanceToAnyCell?.toFixed(0)}
                      </text>
                  )}
                </g>
              ));
            })}
          </svg>

          {/* Cell contents */}
          {cellContents.map((cell, index) => (
            <div
              key={index}
              className={`absolute ${colors[index % colors.length]} rounded-lg shadow-lg border-2 border-white flex items-center justify-center text-white font-bold text-lg opacity-80 ${draggingCellIndex === null ? 'cursor-grab' : (draggingCellIndex === index ? 'cursor-grabbing' : 'cursor-default')}`}
              style={{
                left: `${cell.x}px`,
                top: `${cell.y}px`,
                width: `${cell.width}px`,
                height: `${cell.height}px`,
                userSelect: 'none', // Prevent text selection during drag
              }}
              onMouseDown={(e) => handleCellMouseDown(index, e)}
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
              <strong>Constructed Polygons:</strong> {results.polygons.length}
            </div>
            <div>
              <strong>Merged Polygons:</strong> {results.mergedPolygons.length}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="font-semibold mb-2">Step Description:</h4>
            <div className="text-sm text-gray-600">
              {showStep === 'cells' && "Input cells (rectangles) that need boundaries calculated between them."}
              {showStep === 'midlines' && "Midlines drawn between all cell pairs with gaps, extending to container bounds."}
              {showStep === 'allSegments' && "All segments created between midline intersections. Distance values show minimum distance from segment to any cell."}
              {showStep === 'validSegments' && "Segments that don't intersect any cell content (invalid segments removed)."}
              {showStep === 'final' && (
                <>
                  Constructed Polygons - Output of Stage 5.
                  These are the fundamental faces formed by valid segments and the container boundary.
                  The algorithm traces paths along segments, always taking the 'next' angular segment at intersections to define polygon boundaries.
                </>
              )}
              {showStep === 'merged' && (
                <>
                  Merged Polygons - Output of Stage 6.
                  Starting with 'Constructed Polygons', shared internal segments are considered for removal, from lowest to highest `distanceToAnyCell`.
                  If removing a segment merges two polygons, and the new merged polygon contains 0 or 1 cell centers, the merge is kept. Otherwise, the segment remains.
                </>
              )}
              {showDistanceDebug && showStep !== 'cells' && showStep !== 'midlines' && (
                <div className="mt-2 text-red-600">
                  <strong>Debug Mode:</strong> For segment-based views, red dots show closest point to cells. For polygon views, segment distances (if shown) are calculated on-the-fly for polygon edges.
                </div>
              )}
              {colorByDistance && (showStep === 'allSegments' || showStep === 'validSegments' || showStep === 'final') && (
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
        </div>
      </div>
    </div>
  );
};

export default CellBoundariesVisualization;
