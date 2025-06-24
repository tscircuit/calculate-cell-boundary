import type { Line } from "./types"

// Normalizes a segment so that for horizontal lines, start.x <= end.x,
// and for vertical lines, start.y <= end.y.
const normalizeSegment = (segment: Line): Line => {
  let { start, end } = segment
  // For horizontal lines (start.y === end.y), ensure start.x <= end.x
  if (start.y === end.y && start.x > end.x) {
    ;[start, end] = [
      { x: end.x, y: start.y },
      { x: start.x, y: end.y },
    ]
  }
  // For vertical lines (start.x === end.x), ensure start.y <= end.y
  else if (start.x === end.x && start.y > end.y) {
    ;[start, end] = [
      { x: start.x, y: end.y },
      { x: end.x, y: start.y },
    ]
  }
  return { start, end }
}

export const mergeAlignedSegments = (segments: Line[]): Line[] => {
  if (!segments || segments.length === 0) {
    return []
  }

  const normalizedSegments = segments.map(normalizeSegment)

  const horizontalSegments: Line[] = []
  const verticalSegments: Line[] = []

  for (const seg of normalizedSegments) {
    if (seg.start.y === seg.end.y) {
      // Horizontal
      horizontalSegments.push(seg)
    } else if (seg.start.x === seg.end.x) {
      // Vertical
      verticalSegments.push(seg)
    }
    // Non-axis-aligned segments are ignored for merging
  }

  const mergedSegments: Line[] = []

  // Merge horizontal segments
  const horizontalByY = new Map<number, Line[]>()
  for (const seg of horizontalSegments) {
    if (!horizontalByY.has(seg.start.y)) {
      horizontalByY.set(seg.start.y, [])
    }
    horizontalByY.get(seg.start.y)!.push(seg)
  }

  for (const [, segs] of horizontalByY) {
    if (segs.length === 0) continue
    segs.sort((a, b) => a.start.x - b.start.x)

    let currentMerged = { ...segs[0] }
    for (let i = 1; i < segs.length; i++) {
      const nextSeg = segs[i]
      // Check for connection or overlap: next segment starts at or before current merged segment ends
      if (nextSeg.start.x <= currentMerged.end.x) {
        currentMerged.end.x = Math.max(currentMerged.end.x, nextSeg.end.x)
      } else {
        mergedSegments.push(currentMerged)
        currentMerged = { ...nextSeg }
      }
    }
    mergedSegments.push(currentMerged)
  }

  // Merge vertical segments
  const verticalByX = new Map<number, Line[]>()
  for (const seg of verticalSegments) {
    if (!verticalByX.has(seg.start.x)) {
      verticalByX.set(seg.start.x, [])
    }
    verticalByX.get(seg.start.x)!.push(seg)
  }

  for (const [, segs] of verticalByX) {
    if (segs.length === 0) continue
    segs.sort((a, b) => a.start.y - b.start.y)

    let currentMerged = { ...segs[0] }
    for (let i = 1; i < segs.length; i++) {
      const nextSeg = segs[i]
      // Check for connection or overlap: next segment starts at or before current merged segment ends
      if (nextSeg.start.y <= currentMerged.end.y) {
        currentMerged.end.y = Math.max(currentMerged.end.y, nextSeg.end.y)
      } else {
        mergedSegments.push(currentMerged)
        currentMerged = { ...nextSeg }
      }
    }
    mergedSegments.push(currentMerged)
  }

  return mergedSegments
}
