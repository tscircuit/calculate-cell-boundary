export interface CellContent {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
}

export interface Line {
	start: { x: number; y: number };
	end: { x: number; y: number };
}

// Internal types based on the provided example
interface InternalBox {
	// Original CellContent properties mapped to example's Box structure
	x: number; // left (minX)
	y: number; // top (minY)
	w: number; // width (maxX - minX)
	h: number; // height (maxY - minY)
	// Pre-computed bounds for convenience, as in the example
	right: number; // x + w (maxX)
	bottom: number; // y + h (maxY)
}

interface Segment {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
}

/** Merge segments that sit on the same infinite line and touch/overlap */
function mergeCollinear(segments: Segment[], tol = 0.001): Segment[] {
	// Group by “orientation & coordinate” (vertical = same x; horizontal = same y)
	// If tol is 0, this means x1 must be exactly x2 (or y1 exactly y2).
	// If tol is > 0, allows for small floating point inaccuracies.
	const vertical = segments.filter((s) => Math.abs(s.x1 - s.x2) <= tol);
	const horizontal = segments.filter((s) => Math.abs(s.y1 - s.y2) <= tol);

	const merged: Segment[] = [];

	const merge1D = (
		segs: Segment[],
		coord: "x1" | "y1", // const for orientation
		a1: "y1" | "x1", // axis of segment start
		a2: "y2" | "x2", // axis of segment end
	) => {
		if (segs.length === 0) return;

		// group by coordinate value
		const groups = new Map<number, Segment[]>();
		segs.forEach((s) => {
			const key = Number.parseFloat(s[coord].toFixed(3)); // snap key to grid for float safety
			(groups.get(key) ?? groups.set(key, []).get(key)!).push(s);
		});

		groups.forEach((list) => {
			if (list.length === 0) return;
			// sort by segment start
			list.sort((s1, s2) => s1[a1] - s2[a1]);
			// merge touching
			let cur = { ...list[0] };
			for (let i = 1; i < list.length; ++i) {
				const nxt = list[i];
				if (nxt[a1] <= cur[a2] + tol) {
					// extend
					cur[a2] = Math.max(cur[a2], nxt[a2]);
				} else {
					merged.push(cur);
					cur = { ...nxt };
				}
			}
			merged.push(cur);
		});
	};

	merge1D(vertical, "x1", "y1", "y2");
	merge1D(horizontal, "y1", "x1", "x2");
	return merged;
}

/**
 * Internal computation based on the provided example algorithm.
 * @param boxes  Rectangles, axis-aligned, assumed never overlapping.
 * @param gap    Padding to leave between a line and the nearest box edge (px).
 */
function computeInnerLinesAlgorithm(
	boxes: InternalBox[],
	gap = 0,
): Segment[] {
	if (boxes.length < 2) return [];

	// No need to re-map `boxes` as they are already `InternalBox[]` which includes right/bottom.

	// ── Sweep by x to find horizontal neighbours (vertical lines) ──────────
	const byLeft = [...boxes].sort((a, b) => a.x - b.x);
	const vertical: Segment[] = [];

	for (let i = 0; i < byLeft.length; ++i) {
		const a = byLeft[i];

		// Walk rightward until we find the first box that is to the right of a and overlaps in Y
		for (let j = i + 1; j < byLeft.length; ++j) {
			const b = byLeft[j];
			// If b starts before a's right edge, it's not strictly to the right or touching the right edge.
			// This condition finds the first b whose left edge (b.x) is >= a's right edge (a.right).
			if (b.x < a.right) continue;

			// y-projection overlap?
			const top = Math.max(a.y, b.y);
			const bottom = Math.min(a.bottom, b.bottom);
			if (top < bottom) { // If they overlap vertically
				// Check if the line segment would have positive length after applying gap
				if (top + gap < bottom - gap) {
					const midX = (a.right + b.x) / 2;
					vertical.push({
						x1: midX,
						y1: top + gap,
						x2: midX,
						y2: bottom - gap,
					});
				}
			}
			break; // only the nearest right neighbour matters
		}
	}

	// ── Sweep by y to find vertical neighbours (horizontal lines) ───────────
	const byTop = [...boxes].sort((a, b) => a.y - b.y);
	const horizontal: Segment[] = [];

	for (let i = 0; i < byTop.length; ++i) {
		const a = byTop[i];

		// Walk downward until we find the first box that is below a and overlaps in X
		for (let j = i + 1; j < byTop.length; ++j) {
			const b = byTop[j];
			// If b starts before a's bottom edge, it's not strictly below or touching the bottom edge.
			// This condition finds the first b whose top edge (b.y) is >= a's bottom edge (a.bottom).
			if (b.y < a.bottom) continue;

			// x-projection overlap?
			const left = Math.max(a.x, b.x);
			const right = Math.min(a.right, b.right);
			if (left < right) { // If they overlap horizontally
				// Check if the line segment would have positive length after applying gap
				if (left + gap < right - gap) {
					const midY = (a.bottom + b.y) / 2;
					horizontal.push({
						x1: left + gap,
						y1: midY,
						x2: right - gap,
						y2: midY,
					});
				}
			}
			break; // only the nearest bottom neighbour matters
		}
	}
	return mergeCollinear([...vertical, ...horizontal], gap > 0 ? 0.001 : 0); // Use tolerance for gap, stricter if no gap
}

/**
 * Calculate the boundaries between the cells. Lines are drawn between (middle)
 * of cell content walls.
 */
export const calculateCellBoundaries = (
	cellContents: CellContent[],
	opts?: {
		gap?: number;
	},
): Array<Line> => {
	const gap = opts?.gap ?? 0;
	if (cellContents.length < 2) return [];

	// 1. Convert CellContent[] to InternalBox[]
	const internalBoxes: InternalBox[] = cellContents.map((c) => ({
		x: c.minX,
		y: c.minY,
		w: c.maxX - c.minX,
		h: c.maxY - c.minY,
		right: c.maxX,
		bottom: c.maxY,
	}));

	// 2. Call the core algorithm
	// Pass the gap value to the algorithm.
	// The algorithm itself handles the `gap` for padding.
	// The `mergeCollinear` tolerance is adjusted based on whether a gap is present.
	const segments = computeInnerLinesAlgorithm(internalBoxes, gap);

	// 3. Convert Segment[] to Line[]
	const lines: Line[] = segments.map((s) => ({
		start: { x: s.x1, y: s.y1 },
		end: { x: s.x2, y: s.y2 },
	}));

	return lines;
};
