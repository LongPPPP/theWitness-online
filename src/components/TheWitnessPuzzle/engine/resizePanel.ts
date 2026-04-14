// ============================================================
// 用此函数替换 TheWitnessPuzzle.tsx 中的 resizePuzzle 函数。
//
// ⚠️  重要：dx / dy 的语义与原 resizePuzzle 完全相同：
//     它们是 **puzzle 内部坐标增量**（= Panel 坐标增量），
//     即每次传入 xScale=2 表示 Panel 宽增加 2（新增 1 列格子）。
//     resizePanel 内部 **不再** 乘以 2。
//
// 调用处修改（dragMove 内部两处 while 循环）：
//
//   原：
//     if (!resizePuzzle(xScale * Math.sign(dx), 0, drag, puzzle)) break;
//     width.current += xScale * Math.sign(dx) / 2;
//
//   改：
//     if (!resizePanel(xScale * Math.sign(dx), 0, drag, panel.current)) break;
//     setPuzzle(phasePuzzle(panel.current));
//     width.current += xScale * Math.sign(dx) / 2;
//     dx -= Math.sign(dx) * xLim;
//     dragging.current.x = newDragging.x;
//
//   同理 dy 方向：
//     if (!resizePanel(0, yScale * Math.sign(dy), drag, panel.current)) break;
//     setPuzzle(phasePuzzle(panel.current));
//     height.current += yScale * Math.sign(dy) / 2;
//     dy -= Math.sign(dy) * yLim;
//     dragging.current.y = newDragging.y;
//
// dragStart 的 useCallback 依赖数组改为 [] （panel.current 是 ref 无需列入）。
// ============================================================

import { Endpoint, IntersectionFlags, Panel, Point } from "./generator/Panel.ts";

// ---- 辅助函数 ----

/** 判断 Panel grid 坐标是否在界内 */
function panelSafe(w: number, h: number, x: number, y: number): boolean {
	return x >= 0 && x < w && y >= 0 && y < h;
}

/**
 * 根据 Panel.Symmetry 推断 hasSymX（左右对称）、hasSymY（上下对称）。
 *
 * Panel.Symmetry 语义：
 *   Vertical   → 沿垂直中线镜像（左右对称）→ hasSymX = true
 *   Horizontal → 沿水平中线镜像（上下对称）→ hasSymY = true
 *   Rotational → 旋转 180°              → 两者都有
 */
function symFlags(symmetry: Panel.Symmetry): { hasSymX: boolean; hasSymY: boolean } {
	switch (symmetry) {
		case Panel.Symmetry.Vertical:
		case Panel.Symmetry.PillarVertical:
			return { hasSymX: true,  hasSymY: false };
		case Panel.Symmetry.Horizontal:
		case Panel.Symmetry.PillarHorizontal:
			return { hasSymX: false, hasSymY: true };
		case Panel.Symmetry.Rotational:
		case Panel.Symmetry.PillarRotational:
			return { hasSymX: true,  hasSymY: true };
		default:
			return { hasSymX: false, hasSymY: false };
	}
}

/** 在新尺寸坐标系下计算对称位置 */
function symPos(
	x: number, y: number,
	newW: number, newH: number,
	hasSymX: boolean, hasSymY: boolean
): { x: number; y: number } {
	return {
		x: hasSymX ? (newW - 1 - x) : x,
		y: hasSymY ? (newH - 1 - y) : y,
	};
}

/** 根据 Endpoint 的坐标推断其应朝向的出口方向 */
function inferDir(x: number, y: number, _w: number, h: number): Endpoint.Direction {
	if (y === 0)     return Endpoint.Direction.UP;
	if (y === h - 1) return Endpoint.Direction.DOWN;
	if (x === 0)     return Endpoint.Direction.LEFT;
	return Endpoint.Direction.RIGHT;
}

/**
 * 检查新 Panel 尺寸合法性。
 * Panel.Width/Height 总是奇数（= puzzleCells * 2 + 1）。
 * 最小 5×5（= 2×2 puzzle cells），最大 21×21（= 10×10 puzzle cells）。
 */
function sizeError(newW: number, newH: number): string | null {
	if ((newW & 1) === 0 || (newH & 1) === 0) return 'Panel dimensions must be odd';
	if (newW < 5 || newH < 5)                  return 'Panel too small (min 2×2 puzzle cells)';
	if (newW > 21 || newH > 21)                return 'Panel too large (max 10×10 puzzle cells)';
	return null;
}

// ---- 主函数 ----

/**
 * 通过修改 Panel 来 resize 谜题，替代原先直接操作 Puzzle 的 resizePuzzle。
 *
 * ⚠️  坐标约定：
 *   dx / dy 是 **Panel 坐标增量**（与原 resizePuzzle 的 dx/dy 语义相同）。
 *   调用者传入 xScale=2 表示 Panel.Width 增加 2（即新增 1 列 puzzle 格子）。
 *   本函数内部 **不再** 乘以 2，与原 resizePuzzle 保持一致。
 *
 * @param dx    Panel 宽度变化量（正数增加列，如 +2 = 新增 1 列格子）
 * @param dy    Panel 高度变化量
 * @param drag  拖拽方向，决定旧内容的偏移方向
 * @param panel 要原地修改的 Panel 实例
 * @returns     成功 true；新尺寸非法 false（Panel 不变）
 */
export function resizePanel(
	dx: number,
	dy: number,
	drag: 'left' | 'top' | 'right' | 'bottom',
	panel: Panel
): boolean {
	// dx/dy 已经是 Panel 坐标增量，无需再乘 2
	const newW = panel.Width  + dx;
	const newH = panel.Height + dy;

	console.log(`resizePanel: ${panel.Width}×${panel.Height} -> ${newW}×${newH} (drag=${drag})`);

	if (sizeError(newW, newH)) {
		console.log('resizePanel rejected:', sizeError(newW, newH));
		return false;
	}

	// 旧内容在新 grid 中的位置偏移（Panel 坐标）
	// 从 left/top 边拖动时，旧内容整体向右/下偏移
	const xOff = drag === 'left' ? dx : 0;
	const yOff = drag === 'top'  ? dy : 0;

	// ---- 快照旧数据 ----
	const oldW       = panel.Width;
	const oldH       = panel.Height;
	const oldGrid    = panel.Grid.map(col => col.slice());
	const oldStarts  = panel.Startpoints.map(p => new Point(p.first, p.second));
	const oldEnds    = panel.Endpoints.map(
		e => new Endpoint(e.GetX(), e.GetY(), e.GetDir(), e.GetFlags())
	);

	// ---- PERSIST / COPY / CLEAR 策略 ----
	const { hasSymX, hasSymY } = symFlags(panel.symmetry);
	const noSym = !hasSymX && !hasSymY;

	const PERSIST = 0, COPY = 1, CLEAR = 2;

	function cellAction(x: number, y: number): number {
		if (noSym) return PERSIST;

		// 格子（奇×奇）始终 PERSIST：从旧位置直接搬过来
		if ((x & 1) === 1 && (y & 1) === 1) return PERSIST;

		if (hasSymX) {
			if (dx > 0 && x === (newW - 1) / 2) return CLEAR;
			if (drag === 'right' && x >= (newW + 1) / 2) return COPY;
			if (drag === 'left'  && x <= (newW - 1) / 2) return COPY;
		}
		if (hasSymY) {
			if (dy > 0 && y === (newH - 1) / 2) return CLEAR;
			if (drag === 'bottom' && y >= (newH + 1) / 2) return COPY;
			if (drag === 'top'    && y <= (newH - 1) / 2) return COPY;
		}
		return PERSIST;
	}

	// ---- 构建新 grid ----
	const newGrid: number[][] = Array.from({ length: newW }, () =>
		new Array(newH).fill(0)
	);
	// 初始化所有交点（偶×偶）的 INTERSECTION 标志
	for (let x = 0; x < newW; x += 2) {
		for (let y = 0; y < newH; y += 2) {
			newGrid[x][y] = IntersectionFlags.INTERSECTION;
		}
	}

	const dbg: string[] = Array.from({ length: newH }, () => '');

	for (let x = 0; x < newW; x++) {
		for (let y = 0; y < newH; y++) {
			const isCorner = (x & 1) === 0 && (y & 1) === 0;
			const action   = cellAction(x, y);

			switch (action) {
				case PERSIST: {
					dbg[y] += 'P';
					const sx = x - xOff, sy = y - yOff;
					if (panelSafe(oldW, oldH, sx, sy)) {
						let v = oldGrid[sx][sy];
						// 补全交点标志（防止旧交点值为 0）
						if (isCorner && v === 0) v = IntersectionFlags.INTERSECTION;
						newGrid[x][y] = v;
					}
					// 若源在界外：交点已由初始化设为 INTERSECTION，线段/格子保持 0
					break;
				}
				case COPY: {
					dbg[y] += 'O';
					// 从新坐标系中的对称位置对应的旧坐标处复制
					const { x: sx2, y: sy2 } = symPos(x, y, newW, newH, hasSymX, hasSymY);
					const srcX = sx2 - xOff, srcY = sy2 - yOff;
					if (panelSafe(oldW, oldH, srcX, srcY)) {
						let v = oldGrid[srcX][srcY];
						if (isCorner && v === 0) v = IntersectionFlags.INTERSECTION;
						newGrid[x][y] = v;
					}
					break;
				}
				case CLEAR: {
					dbg[y] += 'X';
					// 交点已初始化为 INTERSECTION，线段/格子保持 0
					break;
				}
			}
		}
	}

	console.log('Panel resize grid actions (each row, top→bottom):');
	dbg.forEach((row, i) => console.log(`y=${i}: ${row}`));

	// ---- 重建 startpoints（按 offset 平移，成对过滤） ----
	//
	// 策略：在旧坐标系下调用 get_sym_point（panel 尺寸未变），
	// 判断自身及对称伙伴在新界内是否都合法。
	// 任意一个失效则两者都丢弃，用 droppedStartKeys 防止伙伴被重复加入。
	const newStarts: Point[] = [];
	const droppedStartKeys = new Set<string>();

	for (const sp of oldStarts) {
		const key = `${sp.first},${sp.second}`;
		if (droppedStartKeys.has(key)) continue;

		const nx = sp.first  + xOff;
		const ny = sp.second + yOff;

		// 自身越界 → 标记对称伙伴也丢弃，然后跳过
		if (!panelSafe(newW, newH, nx, ny)) {
			console.log(`Startpoint (${sp.first},${sp.second}) out of bounds, dropped`);
			if (hasSymX || hasSymY) {
				const symOld = panel.get_sym_point(sp.first, sp.second);
				droppedStartKeys.add(`${symOld.first},${symOld.second}`);
				console.log(`Startpoint sym partner (${symOld.first},${symOld.second}) also dropped`);
			}
			continue;
		}

		// 有对称时：对称伙伴也必须在新界内，否则两者都丢弃
		if (hasSymX || hasSymY) {
			const symOld = panel.get_sym_point(sp.first, sp.second);
			const symNx = symOld.first  + xOff;
			const symNy = symOld.second + yOff;
			if (!panelSafe(newW, newH, symNx, symNy)) {
				console.log(`Startpoint (${sp.first},${sp.second}) sym partner (${symOld.first},${symOld.second}) out of bounds, both dropped`);
				droppedStartKeys.add(`${symOld.first},${symOld.second}`);
				continue;
			}
		}

		newStarts.push(new Point(nx, ny));
		console.log(`Startpoint (${sp.first},${sp.second}) -> (${nx},${ny})`);
	}

	// ---- 重建 endpoints（按 offset 平移，成对过滤） ----
	const newEnds: Endpoint[] = [];
	const droppedEndKeys = new Set<string>();

	for (const ep of oldEnds) {
		const key = `${ep.GetX()},${ep.GetY()}`;
		if (droppedEndKeys.has(key)) continue;

		const nx = ep.GetX() + xOff;
		const ny = ep.GetY() + yOff;

		// 自身越界 → 标记对称伙伴也丢弃
		if (!panelSafe(newW, newH, nx, ny)) {
			console.log(`Endpoint (${ep.GetX()},${ep.GetY()}) out of bounds, dropped`);
			if (hasSymX || hasSymY) {
				const symOld = panel.get_sym_point(ep.GetX(), ep.GetY());
				droppedEndKeys.add(`${symOld.first},${symOld.second}`);
				console.log(`Endpoint sym partner (${symOld.first},${symOld.second}) also dropped`);
			}
			continue;
		}

		// 终点必须在新边界上
		const isOnNewBoundary = (nx === 0 || nx === newW - 1 || ny === 0 || ny === newH - 1);
		if (!isOnNewBoundary) {
			console.log(`Endpoint (${nx},${ny}) is no longer on boundary after resize, dropped`);
			if (hasSymX || hasSymY) {
				const symOld = panel.get_sym_point(ep.GetX(), ep.GetY());
				droppedEndKeys.add(`${symOld.first},${symOld.second}`);
				console.log(`Endpoint sym partner (${symOld.first},${symOld.second}) also dropped`);
			}
			continue;
		}

		// 有对称时：对称伙伴必须也在新界内且在边界上
		if (hasSymX || hasSymY) {
			const symOld = panel.get_sym_point(ep.GetX(), ep.GetY());
			const symNx = symOld.first  + xOff;
			const symNy = symOld.second + yOff;
			const symOnBoundary = (symNx === 0 || symNx === newW - 1 || symNy === 0 || symNy === newH - 1);
			if (!panelSafe(newW, newH, symNx, symNy) || !symOnBoundary) {
				console.log(`Endpoint (${ep.GetX()},${ep.GetY()}) sym partner (${symOld.first},${symOld.second}) invalid, both dropped`);
				droppedEndKeys.add(`${symOld.first},${symOld.second}`);
				continue;
			}
		}

		const newDir = inferDir(nx, ny, newW, newH);
		const newFlags =
			IntersectionFlags.ENDPOINT |
			(newDir === Endpoint.Direction.UP || newDir === Endpoint.Direction.DOWN
				? IntersectionFlags.COLUMN
				: IntersectionFlags.ROW);

		newEnds.push(new Endpoint(nx, ny, newDir, newFlags));
		console.log(`Endpoint (${ep.GetX()},${ep.GetY()}) -> (${nx},${ny}) dir=${newDir}`);
	}

	// ---- 更新 Panel 内部状态 ----
	// 先清空再 Resize，避免 Panel.Resize() 里的旧逻辑干扰已计算好的列表
	panel.Startpoints = [];
	panel.Endpoints   = [];
	// Panel.Resize 更新内部 _width/_height，并将 _grid 清空
	panel.Resize(newW, newH);
	// 用我们计算好的 newGrid 覆盖 Resize 清空的 grid
	panel.Grid = newGrid;

	// 写入过滤后的 startpoints / endpoints
	panel.Startpoints = newStarts;
	panel.Endpoints   = newEnds;

	return true;
}