import {ROTATION_BIT} from "./polyominos.ts";
import {DOT_BLACK, DOT_NONE, GAP_BREAK, GAP_FULL, LINE_NONE} from "./constants.ts";
import type {Cell, DotType, EndDirection, GapType, GridCell, LineCell, LineType} from "./cell.ts";

export type PuzzleConfig = {
    volume: number,
    sensitivity: number,
    enableEndHints: boolean,
    wittleTracing: boolean,
    onSuccess: (x: number, y: number) => void,
}

// A 2x2 grid is internally a 5x5:
// corner, edge, corner, edge, corner
// edge,   cell, edge,   cell, edge
// corner, edge, corner, edge, corner
// edge,   cell, edge,   cell, edge
// corner, edge, corner, edge, corner
//
// Corners and edges will have a value of true if the line passes through them
// Cells will contain an object if there is an element in them
export default class Puzzle {
    grid!: (Cell | null)[][];
    maskGrid!: (number | null)[][];
    width!: number;
    height!: number;
    pillar: boolean;
    settings: Record<string, boolean>;
    name?: string;
    autoSolved?: boolean;
    private largezero!: number;
    symmetry?: { x: boolean, y: boolean };
    // private hints?: { x: number, y: number }[];
    startPoint: { x: number, y: number };
    endPoint: { x: number, y: number };
    hasNegations: boolean;
    hasPolyominos: boolean;

    // ==========================================
    config: PuzzleConfig;

    constructor(width: number, height: number, pillar = false) {
        if (pillar) {
            this.newGrid(2 * width, 2 * height + 1)
        } else {
            this.newGrid(2 * width + 1, 2 * height + 1)
        }
        this.pillar = pillar
        this.settings = {
            // If true, negation symbols are allowed to cancel other negation symbols.
            NEGATIONS_CANCEL_NEGATIONS: true,

            // If true, and the count of polyominos and onimoylops is zero, they cancel regardless of shape.
            SHAPELESS_ZERO_POLY: false,

            // If true, the traced line cannot go through the placement of a polyomino.
            PRECISE_POLYOMINOS: true,

            // If false, incorrect elements will not flash when failing the puzzle.
            FLASH_FOR_ERRORS: true,

            // If true, mid-segment startpoints will constitute solid lines, and form boundaries for the region.
            FAT_STARTPOINTS: false,

            // If true, custom mechanics are displayed (and validated) in this puzzle.
            CUSTOM_MECHANICS: false,

            // If true, polyominos may be placed partially off of the grid as an intermediate solution step.
            // OUT_OF_BOUNDS_POLY: false,
        }
        // 初始化其他属性
        this.startPoint = {x: 0, y: 0};
        this.endPoint = {x: 0, y: 0};
        this.hasNegations = false;
        this.hasPolyominos = false;
    }

    /**
     * 从 JSON 字符串重建谜题对象
     *
     * 处理旧版本数据的兼容性转换
     *
     * 修复遗留的数据格式问题（如颜色字段重命名、旋转表示等）
     * */
    static deserialize(json: string) {
        const parsed = JSON.parse(json);
        // Claim that it's not a pillar (for consistent grid sizing), then double-check ourselves later.
        const puzzle = new Puzzle((parsed.grid.length - 1) / 2, (parsed.grid[0].length - 1) / 2);
        puzzle.name = parsed.name
        puzzle.autoSolved = parsed.autoSolved
        puzzle.grid = parsed.grid
        // Legacy: Grid squares used to use 'false' to indicate emptiness.
        // Legacy: Cells may use {} to represent emptiness
        // Now, we use:
        // Cells default to null
        // During onTraceStart, empty cells that are still inbounds are changed to {'type': 'nonce'} for tracing purposes.
        // Lines default to {'type':'line', 'line':0}
        for (let x = 0; x < puzzle.width; x++) {
            for (let y = 0; y < puzzle.height; y++) {
                const cell = puzzle.grid[x][y] as any;
                if (cell == null || cell.type == null) {
                    if (x % 2 === 1 && y % 2 === 1) puzzle.grid[x][y] = null
                    else puzzle.grid[x][y] = {'type': 'line', 'line': LINE_NONE}
                } else {
                    if (cell.type === 'poly' || cell.type === 'ylop') {
                        if (cell.rot === 'all') {
                            // Legacy: Polys and ylops used to have a rot value (before I started using polyshape).
                            // rot=all is a holdover that was used to represent rotation polyominos.
                            cell.polyshape |= ROTATION_BIT
                            delete cell.rot
                        }
                        // Fixup: Sometimes we have a polyshape which is empty. Just ignore these objects.
                        if ((cell.polyshape & ~ROTATION_BIT) === 0) puzzle.grid[x][y] = null
                    } else if ((x % 2 !== 1 || y % 2 !== 1) && (cell as any).color != null) {
                        // Legacy: Lines used to use 'color' instead of 'line', but that was redundant with actual colors
                        ;(cell as any).line = (cell as any).color
                        delete (cell as any).color
                    } else if ((cell as any).gap === true) {
                        // Legacy: Gaps used to be null/true, are now null/1/2
                        ;(cell as any).gap = GAP_BREAK
                    }
                }
            }
        }
        // Legacy: Startpoints used to be only parsed.start
        if (parsed.start) {
            parsed.startPoints = [parsed.start]
        }
        // Legacy: Startpoints used to be a separate array, now they are flags
        if (parsed.startPoints) {
            for (const startPoint of parsed.startPoints) {
                const startCell = puzzle.getLineCell(startPoint.x, startPoint.y)
                if (startCell) startCell.start = true
            }
        }
        // Legacy: Endpoints used to be only parsed.end
        if (parsed.end) {
            parsed.endPoints = [parsed.end]
        }
        // Legacy: Endpoints used to be a separate array, now they are flags
        if (parsed.endPoints) {
            for (const endPoint of parsed.endPoints) {
                const endCell = puzzle.getLineCell(endPoint.x, endPoint.y)
                if (endCell) endCell.end = endPoint.dir
            }
        }
        // Legacy: Dots and gaps used to be separate arrays
        // Now, they are flags on the individual lines.
        if (parsed.dots) {
            for (const dot of parsed.dots) {
                const dotCell = puzzle.getLineCell(dot.x, dot.y)
                if (dotCell) dotCell.dot = DOT_BLACK as any
            }
        }
        if (parsed.gaps) {
            for (const gap of parsed.gaps) {
                const gapCell = puzzle.getLineCell(gap.x, gap.y)
                if (gapCell) gapCell.gap = GAP_BREAK
            }
        }
        if (parsed.settings) {
            for (const key of Object.keys(parsed.settings)) {
                puzzle.settings[key] = parsed.settings[key]
            }
        }
        puzzle.pillar = parsed.pillar
        puzzle.symmetry = parsed.symmetry
        puzzle.largezero = puzzle.width * puzzle.height
        return puzzle
    }

    serialize() {
        return JSON.stringify(this)
    }

    clone() {
        return Puzzle.deserialize(this.serialize())
    }

    newGrid(width?: number, height?: number) {
        if (width == null) { // Called by someone who just wants to clear the grid.
            width = this.width
            height = this.height
        }
        if (height == null) {
            height = this.height
        }
        this.grid = []
        for (let x = 0; x < width; x++) {
            this.grid[x] = []
            for (let y = 0; y < height; y++) {
                if (x % 2 === 1 && y % 2 === 1) this.grid[x][y] = null
                else this.grid[x][y] = {'type': 'line', 'line': LINE_NONE} as LineCell
            }
        }
        // Performance: A large value which is === 0 to be used for pillar wrapping.
        // Performance: Getting the size of the grid has a nonzero cost.
        // Definitely getting the length of the first element isn't optimized.
        this.largezero = width * height * 2
        this.width = this.grid.length
        this.height = this.grid[0].length
    }

    // Wrap a value around at the width of the grid. No-op if not in pillar mode.
    /**
     * 在柱状模式下处理坐标环绕
     * */
    _mod(val: number) {
        if (!this.pillar) return val
        return (val + this.largezero!) % this.width
    }

    // Determine if an x, y pair is a safe reference inside the grid. This should be invoked at the start of every
    // function, but then functions can access the grid directly.
    /**
     * 检查坐标是否在有效范围内
     * */
    _safeCell(x: number, y: number) {
        if (x < 0 || x >= this.width) return false
        if (y < 0 || y >= this.height) return false
        return true
    }

    /**
     * 安全地获取cell
     * */
    getCell(x: number, y: number) {
        x = this._mod(x)
        if (!this._safeCell(x, y)) return null
        return this.grid[x][y]
    }

    /**
     * 类型守卫：是否为线段单元格
     */
    static isLineCell(cell: Cell | null): cell is LineCell {
        return !!cell && cell.type === 'line'
    }

    /**
     * 类型守卫：是否为网格元素单元格
     */
    static isGridCell(cell: Cell | null): cell is GridCell {
        return !!cell && cell.type !== 'line'
    }

    /**
     * 获取线段单元格（若非线段或越界则返回 null）
     */
    getLineCell(x: number, y: number): LineCell | null {
        const cell = this.getCell(x, y)
        return Puzzle.isLineCell(cell) ? cell : null
    }

    /**
     * 安全地设置cell
     * */
    setCell(x: number, y: number, value: Cell | null) {
        x = this._mod(x)
        if (!this._safeCell(x, y)) return
        this.grid[x][y] = value
    }

    /**
     * 设置线段值（安全封装）
     */
    setLineValue(x: number, y: number, lineValue: LineType) {
        const cell = this.getLineCell(x, y)
        if (!cell) return
        cell.line = lineValue
    }

    /**
     * 设置线段方向（安全封装）
     */
    setLineDir(x: number, y: number, dir: EndDirection | null) { // TODO
        const cell = this.getLineCell(x, y)
        if (!cell) return
            // 使用任意字段以兼容旧代码里读取 cell.dir
            ;
        (cell as any).dir = dir
    }

    /**
     * 设置 gap（安全封装）
     */
    setGap(x: number, y: number, gap: GapType) {
        const cell = this.getLineCell(x, y)
        if (!cell) return
        cell.gap = gap
    }

    /**
     * 设置 dot（安全封装）
     */
    setDot(x: number, y: number, dot: DotType) {
        const cell = this.getLineCell(x, y)
        if (!cell) return
        cell.dot = dot
    }

    /**
     * 标记起点（安全封装）
     */
    markStart(x: number, y: number): boolean {
        const cell = this.getLineCell(x, y)
        if (!cell) return false
        cell.start = true
    }

    /**
     * 标记终点（安全封装）
     */
    markEnd(x: number, y: number, dir: EndDirection): boolean {
        const cell = this.getLineCell(x, y)
        if (!cell) return false
        cell.end = dir
    }

    /**
     * 根据对称设置获取对称方向
     * */
    getSymmetricalDir(dir: EndDirection) {
        if (this.symmetry != null) {
            if (this.symmetry.x) {
                if (dir === 'left') return 'right'
                if (dir === 'right') return 'left'
            }
            if (this.symmetry.y) {
                if (dir === 'top') return 'bottom'
                if (dir === 'bottom') return 'top'
            }
        }
        return dir
    }

    // The resulting position is guaranteed to be gridsafe.
    /**
     * 计算对称位置坐标
     * */
    getSymmetricalPos(x: number, y: number) {
        if (this.symmetry != null) {
            if (this.pillar) {
                x += this.width / 2
                if (this.symmetry.x) {
                    x = this.width - x
                }
            } else {
                if (this.symmetry.x) {
                    x = (this.width - 1) - x
                }
            }
            if (this.symmetry.y) {
                y = (this.height - 1) - y
            }
        }
        return {'x': this._mod(x), 'y': y}
    }

    /**
     * 获取对称位置的单元格
     * */
    getSymmetricalCell(x: number, y: number) {
        const pos = this.getSymmetricalPos(x, y)
        return this.getCell(pos.x, pos.y)
    }

    /**
     * 检查两个位置是否对称
     * */
    matchesSymmetricalPos(x1: number, y1: number, x2: number, y2: number) {
        return (y1 === y2 && this._mod(x1) === x2)
    }

    // A variant of getCell which specifically returns line values,
    // and treats objects as being out-of-bounds
    /**
     * 获取指定位置的line，若不是line返回null
     * */
    getLine(x: number, y: number) {
        const cell = this.getLineCell(x, y)
        if (cell == null) return null
        return cell.line
    }

    /**
     * 更新单元格的特定属性
     * */
    updateCell2(x: number, y: number, key: any, value: any) {
        x = this._mod(x)
        if (!this._safeCell(x, y)) return
        const cell = this.grid[x][y];
        if (cell == null) return
            ;
        (cell as any)[key] = value
    }

    /**
     * 获取有效的终点方向（避开缺口）
     * */
    getValidEndDirs(x: number, y: number) {
        x = this._mod(x)
        if (!this._safeCell(x, y)) return []

        const dirs = [];
        const leftCell = this.getCell(x - 1, y) as LineCell;
        if (leftCell == null || leftCell.gap === GAP_FULL) dirs.push('left')
        const topCell = this.getCell(x, y - 1) as LineCell;
        if (topCell == null || topCell.gap === GAP_FULL) dirs.push('top')
        const rightCell = this.getCell(x + 1, y) as LineCell;
        if (rightCell == null || rightCell.gap === GAP_FULL) dirs.push('right')
        const bottomCell = this.getCell(x, y + 1) as LineCell;
        if (bottomCell == null || bottomCell.gap === GAP_FULL) dirs.push('bottom')
        return dirs
    }

    // Note: Does not use this.width/this.height, so that it may be used to ask about resizing.
    getSizeError(width: number, height: number) {
        if (this.pillar && width < 4) return 'Pillars may not have a width of 1'
        if (width * height < 25) return 'Puzzles may not be smaller than 2x2 or 1x4'
        if (width > 21 || height > 21) return 'Puzzles may not be larger than 10 in either dimension'
        if (this.symmetry != null) {
            if (this.symmetry.x && width <= 2) return 'Symmetrical puzzles must be sufficiently wide for both lines'
            if (this.symmetry.y && height <= 2) return 'Symmetrical puzzles must be sufficiently wide for both lines'
            if (this.pillar && this.symmetry.x && width % 4 !== 0) return 'X + Pillar symmetry must be an even number of rows, to keep both startpoints at the same parity'
        }

        return null
    }

    /**
     // Called on a solution. Computes a list of gaps to show as hints which *do not*
     // break the path.
     loadHints() {
     this.hints = []
     for (let x = 0; x < this.width; x++) {
     for (let y = 0; y < this.height; y++) {
     const line = this.getLine(x, y) || 0;
     if (x % 2 + y % 2 === 1 && line > LINE_NONE) {
     this.hints.push({'x': x, 'y': y})
     }
     }
     }
     }

     // Show a hint on the grid.
     // If no hint is provided, will select the best one it can find,
     // prioritizing breaking current lines on the grid.
     // Returns the shown hint.
     showHint(hint1: { x: number, y: number }) {
     if (hint1 != null) {
     const Cell = this.grid[hint1.x][hint1.y] as LineCell;
     Cell.gap = GAP_BREAK
     return
     }

     const goodHints = [];
     const badHints = [];

     for (const hint of (this.hints ?? [])) {
     if (this.getLine(hint.x, hint.y) ?? 0 > LINE_NONE) {
     // Solution will be broken by this hint
     goodHints.push(hint)
     } else {
     badHints.push(hint)
     }
     }
     let hint = null;
     if (goodHints.length > 0) {
     hint = goodHints.splice(window.randInt(goodHints.length), 1)[0]
     } else if (badHints.length > 0) {
     hint = badHints.splice(window.randInt(badHints.length), 1)[0]
     } else {
     return
     }
     const cell = this.grid[hint.x][hint.y] as LineCell;
     cell.gap = GAP_BREAK
     this.hints = badHints.concat(goodHints)
     return hint
     }
     */

    clearLines() {
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                this.updateCell2(x, y, 'line', 0)
                this.updateCell2(x, y, 'dir', null)
            }
        }
    }

    /**
     * 洪水填充算法，用于识别连通区域
     * */
    _floodFill(x: number, y: number, region: { x: number, y: number }[], col: (number | null)[]) {
        const cell = col[y];
        if (cell === MASKED_PROCESSED) return
        if (cell !== MASKED_INB_NONCOUNT) {
            region.push({'x': x, 'y': y})
        }
        col[y] = MASKED_PROCESSED

        if (y < this.height - 1) this._floodFill(x, y + 1, region, col)
        if (y > 0) this._floodFill(x, y - 1, region, col)
        if (x < this.width - 1) this._floodFill(x + 1, y, region, this.maskGrid[x + 1])
        else if (this.pillar !== false) this._floodFill(0, y, region, this.maskGrid[0])
        if (x > 0) this._floodFill(x - 1, y, region, this.maskGrid[x - 1])
        else if (this.pillar !== false) this._floodFill(this.width - 1, y, region, this.maskGrid[this.width - 1])
    }

    // Re-uses the same grid, but only called on edges which border the outside
    // Called first to mark cells that are connected to the outside, i.e. should not be part of any region.
    /**
     * 从边界开始填充，标记外部区域
     * */
    _floodFillOutside(x: number, y: number, col: (number | null)[]) {
        const cell = col[y];
        if (cell === MASKED_PROCESSED) return
        if (x % 2 !== y % 2 && cell !== MASKED_GAP2) return // Only flood-fill through gap-2
        if (x % 2 === 0 && y % 2 === 0 && cell === MASKED_DOT) return // Don't flood-fill through dots
        col[y] = MASKED_PROCESSED

        if (x % 2 === 0 && y % 2 === 0) return // Don't flood fill through corners (what? Clarify.)

        if (y < this.height - 1) this._floodFillOutside(x, y + 1, col)
        if (y > 0) this._floodFillOutside(x, y - 1, col)
        if (x < this.width - 1) this._floodFillOutside(x + 1, y, this.maskGrid[x + 1])
        else if (this.pillar !== false) this._floodFillOutside(0, y, this.maskGrid[0])
        if (x > 0) this._floodFillOutside(x - 1, y, this.maskGrid[x - 1])
        else if (this.pillar !== false) this._floodFillOutside(this.width - 1, y, this.maskGrid[this.width - 1])
    }

    // Returns the original grid (pre-masking). You will need to switch back once you are done flood filling.
    /**
     * 切换到掩码网格用于区域分析
     *
     * 将不同类型的单元格转换为掩码值
     * */
    switchToMaskedGrid() {
        let y;
        let x;
        // Make a copy of the grid -- we will be overwriting it
        const savedGrid = this.grid;
        this.maskGrid = new Array(this.width)
        // Override all elements with empty lines -- this means that flood fill is just
        // looking for lines with line=0.
        for (x = 0; x < this.width; x++) {
            const savedRow = savedGrid[x];
            const row: (number | null)[] = new Array(this.height);
            let skip = 1;
            if (x % 2 === 1) { // Cells are always part of the region
                for (y = 1; y < this.height; y += 2) row[y] = MASKED_INB_COUNT
                skip = 2 // Skip these cells during iteration
            }
            for (y = 0; y < this.height; y += skip) {
                const cell = savedRow[y] as LineCell;
                if ((cell.line ?? 0) > LINE_NONE) {
                    row[y] = MASKED_PROCESSED // Traced lines should not be a part of the region
                } else if ((cell.gap ?? 0) === GAP_FULL) {
                    row[y] = MASKED_GAP2
                } else if ((cell.dot ?? 0) > DOT_NONE) {
                    row[y] = MASKED_DOT
                } else {
                    row[y] = MASKED_INB_COUNT
                }
            }
            this.maskGrid[x] = row
        }

        // Starting at a mid-segment startpoint
        if (this.startPoint != null && this.startPoint.x % 2 !== this.startPoint.y % 2) {
            if (this.settings.FAT_STARTPOINTS) {
                // This segment is not in any region (acts as a barrier)
                this.maskGrid[this.startPoint.x][this.startPoint.y] = MASKED_OOB
            } else {
                // This segment is part of this region (acts as an empty cell)
                this.maskGrid[this.startPoint.x][this.startPoint.y] = MASKED_INB_NONCOUNT
            }
        }

        // Ending at a mid-segment endpoint
        if (this.endPoint != null && this.endPoint.x % 2 !== this.endPoint.y % 2) {
            // This segment is part of this region (acts as an empty cell)
            this.maskGrid[this.endPoint.x][this.endPoint.y] = MASKED_INB_NONCOUNT
        }

        // Mark all outside cells as 'not in any region' (aka null)

        // Top and bottom edges
        for (x = 1; x < this.width; x += 2) {
            this._floodFillOutside(x, 0, this.maskGrid[x])
            this._floodFillOutside(x, this.height - 1, this.maskGrid[x])
        }

        // Left and right edges (only applies to non-pillars)
        if (this.pillar === false) {
            for (y = 1; y < this.height; y += 2) {
                this._floodFillOutside(0, y, this.maskGrid[0])
                this._floodFillOutside(this.width - 1, y, this.maskGrid[this.width - 1])
            }
        }

        return savedGrid
    }

    getRegions() {
        const regions = [];
        // const savedGrid = this.switchToMaskedGrid();
        this.switchToMaskedGrid();

        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                if (this.grid[x][y] == MASKED_PROCESSED) continue

                // If this cell is empty (aka hasn't already been used by a region), then create a new one
                // This will also mark all lines inside the new region as used.
                const region: { x: number, y: number }[] = [];
                this._floodFill(x, y, region, this.maskGrid[x])
                regions.push(region)
            }
        }
        // this.grid = savedGrid
        return regions
    }

    getRegion(x: number, y: number) {
        x = this._mod(x)
        if (!this._safeCell(x, y)) return

        const savedGrid = this.switchToMaskedGrid();
        if (this.grid[x][y] == MASKED_PROCESSED) {
            this.grid = savedGrid
            return null
        }

        // If the masked grid hasn't been used at this point, then create a new region.
        // This will also mark all lines inside the new region as used.
        const region: { x: number, y: number }[] = [];
        this._floodFill(x, y, region, this.maskGrid[x])

        this.grid = savedGrid
        return region
    }

    logGrid() {
        let output = '';
        for (let y = 0; y < this.height; y++) {
            const row = [];
            for (let x = 0; x < this.width; x++) {
                const cell = this.getCell(x, y) as any;
                if (cell == null) row[x] = ' '
                else if (cell.type === 'nonce') row[x] = ' '
                else if (cell.start === true) row[x] = 'S'
                else if (cell.end != null) row[x] = 'E'
                else if (cell.type === 'line') {
                    if ((cell.gap ?? 0) > 0) row[x] = ' '
                    if ((cell.dot ?? 0) > 0) row[x] = 'X'
                    if (cell.line === 0) row[x] = '.'
                    if (cell.line === 1) row[x] = '#'
                    if (cell.line === 2) row[x] = '#'
                    if (cell.line === 3) row[x] = 'o'
                } else row[x] = '?'
            }
            output += row.join('') + '\n'
        }
        console.info(output)
    }

}

// The grid contains 5 colors:
// null: Out of bounds or already processed
const MASKED_OOB = null
const MASKED_PROCESSED = null
// 0: In bounds, awaiting processing, but should not be part of the final region.
const MASKED_INB_NONCOUNT = 0
// 1: In bounds, awaiting processing
const MASKED_INB_COUNT = 1
// 2: Gap-2. After _floodFillOutside, this means "treat normally" (it will be null if oob)
const MASKED_GAP2 = 2
// 3: Dot (of any kind), otherwise identical to 1. Should not be flood-filled through (why the f do we need this)
const MASKED_DOT = 3