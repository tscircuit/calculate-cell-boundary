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
	// TODO
};
