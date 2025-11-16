// This is 2^20, whereas all the other bits fall into 2^(0-15)
import type {PolyCell} from "./cell.ts";
import type Puzzle from "./puzzle.ts";

/**
 * 初始化 Puzzle 的掩码网格用于 polyomino 放置算法
 */
function initMaskGrid(puzzle: Puzzle): void {
    puzzle.maskGrid = [];
    for (let x = 0; x < puzzle.width; x++) {
        puzzle.maskGrid[x] = [];
        for (let y = 0; y < puzzle.height; y++) {
            puzzle.maskGrid[x][y] = 0;
        }
    }
}

/**
 * 标记区域内的单元格为 -1（需要被 polyomino 覆盖）
 */
function markRegion(puzzle: Puzzle, region: { x: number, y: number }[]): void {
    for (const pos of region) {
        if (pos.x >= 0 && pos.x < puzzle.width && pos.y >= 0 && pos.y < puzzle.height) {
            puzzle.maskGrid[pos.x][pos.y] = -1;
        }
    }
}

export const ROTATION_BIT = mask(5, 0)

export function isRotated(polyshape: number) {
    return (polyshape & ROTATION_BIT) !== 0
}

export function rotatePolyshape(polyshape: number, count = 1) {
    const rotations = getRotations(polyshape | ROTATION_BIT)
    return rotations[count % 4]
}

export function polyominoFromPolyshape(polyshape: number, ylop = false, precise = true) {
    let topLeft = null
    for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
            if (isSet(polyshape, x, y)) {
                topLeft = {'x': x, 'y': y}
                break
            }
        }
        if (topLeft != null) break
    }
    if (topLeft == null) return [] // Empty polyomino

    const polyomino = []
    for (let x = 0; x < 4; x++) {
        for (let y = 0; y < 4; y++) {
            if (!isSet(polyshape, x, y)) continue
            polyomino.push({'x': 2 * (x - topLeft.x), 'y': 2 * (y - topLeft.y)})

            // "Precise" polyominos adds cells in between the apparent squares in the polyomino.
            // This prevents the solution line from going through polyominos in the solution.
            if (precise) {
                if (ylop) {
                    // Ylops fill up/left if no adjacent cell, and always fill bottom/right
                    if (!isSet(polyshape, x - 1, y)) {
                        polyomino.push({'x': 2 * (x - topLeft.x) - 1, 'y': 2 * (y - topLeft.y)})
                    }
                    if (!isSet(polyshape, x, y - 1)) {
                        polyomino.push({'x': 2 * (x - topLeft.x), 'y': 2 * (y - topLeft.y) - 1})
                    }
                    polyomino.push({'x': 2 * (x - topLeft.x) + 1, 'y': 2 * (y - topLeft.y)})
                    polyomino.push({'x': 2 * (x - topLeft.x), 'y': 2 * (y - topLeft.y) + 1})
                } else {
                    // Normal polys only fill bottom/right if there is an adjacent cell.
                    if (isSet(polyshape, x + 1, y)) {
                        polyomino.push({'x': 2 * (x - topLeft.x) + 1, 'y': 2 * (y - topLeft.y)})
                    }
                    if (isSet(polyshape, x, y + 1)) {
                        polyomino.push({'x': 2 * (x - topLeft.x), 'y': 2 * (y - topLeft.y) + 1})
                    }
                }
            }
        }
    }
    return polyomino
}

function getPolySize(polyshape: number) {
    let size = 0;
    for (let x = 0; x < 4; x++) {
        for (let y = 0; y < 4; y++) {
            if (isSet(polyshape, x, y)) size++
        }
    }
    return size
}

function mask(x: number, y: number) {
    return 1 << (x * 4 + y)
}

function isSet(polyshape: number, x: number, y: number) {
    if (x < 0 || y < 0) return false
    if (x >= 4 || y >= 4) return false
    return (polyshape & mask(x, y)) !== 0
}

function getRotations(polyshape: number) {
    if (!isRotated(polyshape)) return [polyshape]

    const rotations = [0, 0, 0, 0];
    for (let x = 0; x < 4; x++) {
        for (let y = 0; y < 4; y++) {
            if (isSet(polyshape, x, y)) {
                rotations[0] ^= mask(x, y)
                rotations[1] ^= mask(y, 3 - x)
                rotations[2] ^= mask(3 - x, 3 - y)
                rotations[3] ^= mask(3 - y, x)
            }
        }
    }

    return rotations
}

// If false, poly doesn't fit and grid is unmodified
// If true, poly fits and grid is modified (with the placement)
function tryPlacePolyshape(cells: {
    x: number,
    y: number,
    value?: number | null
}[], x: number, y: number, puzzle: Puzzle, sign: number) {
    let cell;
    let i;
    console.debug('Placing at', x, y, 'with sign', sign)
    const numCells = cells.length;
    
    // 检查是否可以放置
    for (i = 0; i < numCells; i++) {
        cell = cells[i];
        const cellX = cell.x + x;
        const cellY = cell.y + y;
        if (cellX < 0 || cellX >= puzzle.width || cellY < 0 || cellY >= puzzle.height) {
            return false;
        }
        const maskValue = puzzle.maskGrid[cellX][cellY];
        if (maskValue == null) return false
        cell.value = maskValue
    }
    
    // 执行放置
    for (i = 0; i < numCells; i++) {
        cell = cells[i];
        const cellX = cell.x + x;
        const cellY = cell.y + y;
        puzzle.maskGrid[cellX][cellY] = (cell.value || 0) + sign
    }
    return true
}

const knownCancellations: Record<any, any> = {};

export function polyshapeFromPolyomino(polyomino: Array<{ x: number, y: number }>) {
    const topLeft = {x: 9999, y: 9999}
    for (const pos of polyomino) {
        if (pos.x % 2 != 1 || pos.y % 2 != 1) continue
        if (pos.x < topLeft.x) topLeft.x = pos.x
        if (pos.y < topLeft.y) topLeft.y = pos.y
    }
    if (topLeft.x === 9999) return 0
    let polyshape = 0
    for (const pos of polyomino) {
        if (pos.x % 2 != 1 || pos.y % 2 != 1) continue
        const x = (pos.x - topLeft.x) / 2
        const y = (pos.y - topLeft.y) / 2
        polyshape |= mask(x, y)
    }
    return polyshape
}

export function polyFit(region: { x: number, y: number }[], puzzle: Puzzle) {
    let ret;
    let pos;
    const polys = [];
    const ylops = []
    let polyCount = 0;
    let regionSize = 0;
    for (pos of region) {
        if (pos.x % 2 === 1 && pos.y % 2 === 1) regionSize++
        const cell = puzzle.grid[pos.x][pos.y] as PolyCell;
        if (cell == null) continue
        if (cell.polyshape === 0) continue
        if (cell.type === 'poly') {
            polys.push(cell)
            polyCount += getPolySize(cell.polyshape)
        } else if (cell.type === 'ylop') {
            ylops.push(cell)
            polyCount -= getPolySize(cell.polyshape)
        }
    }
    if (polys.length + ylops.length === 0) {
        console.log('No polyominos or onimoylops inside the region, vacuously true')
        return true
    }
    if (polyCount > 0 && polyCount !== regionSize) {
        console.log('Combined size of polyominos and onimoylops', polyCount, 'does not match region size', regionSize)
        return false
    }
    if (polyCount < 0) {
        console.log('Combined size of onimoylops is greater than polyominos by', -polyCount)
        return false
    }
    let key: string | null = null;
    if (polyCount === 0) {
        if (puzzle.settings.SHAPELESS_ZERO_POLY) {
            console.log('Combined size of polyominos and onimoylops is zero')
            return true
        }
        // These will be ordered by the order of cells in the region, which isn't exactly consistent.
        // In practice, it seems to be good enough.
        key = ''
        for (const ylop of ylops) key += ' ' + ylop.polyshape
        key += '|'
        for (const poly of polys) key += ' ' + poly.polyshape
        if (key !== null) {
            ret = knownCancellations[key];
            if (ret != null) return ret
        }
    }

    // 初始化掩码网格用于 polyomino 放置算法
    initMaskGrid(puzzle);
    
    // In the normal case, we mark every cell as -1: It needs to be covered by one poly
    if (polyCount > 0) {
        markRegion(puzzle, region);
    }
    // In the exact match case, we leave every cell marked 0: Polys and ylops need to cancel.

    ret = placeYlops(ylops, 0, polys, puzzle);
    if (polyCount === 0 && key !== null) knownCancellations[key] = ret
    return ret
}

// Places the ylops such that they are inside of the grid, then checks if the polys
// zero the region.
export function placeYlops(ylops: PolyCell[], i: number, polys: PolyCell[], puzzle: Puzzle) {
    // Base case: No more ylops to place, start placing polys
    if (i === ylops.length) return placePolys(polys, puzzle)

    const ylop = ylops[i];
    const ylopRotations = getRotations(ylop.polyshape);
    for (let x = 1; x < puzzle.width; x += 2) {
        for (let y = 1; y < puzzle.height; y += 2) {
            console.log('Placing ylop', ylop, 'at', x, y)
            for (const polyshape of ylopRotations) {
                const cells: {
                    x: number,
                    y: number
                }[] = polyominoFromPolyshape(polyshape, true, true); // 使用默认设置
                if (!tryPlacePolyshape(cells, x, y, puzzle, -1)) continue
                console.group('')
                if (placeYlops(ylops, i + 1, polys, puzzle)) return true
                console.groupEnd()
                if (!tryPlacePolyshape(cells, x, y, puzzle, +1)) continue
            }
        }
    }
    console.log('Tried all ylop placements with no success.')
    return false
}

// Returns whether a set of polyominos fit into a region.
// Solves via recursive backtracking: Some piece must fill the top left square,
// so try every piece to fill it, then recurse.
export function placePolys(polys: PolyCell[], puzzle: Puzzle) {
    let y;
    let x;
// Check for overlapping polyominos, and handle exit cases for all polyominos placed.
    const allPolysPlaced = (polys.length === 0);
    for (x = 0; x < puzzle.width; x++) {
        for (y = 0; y < puzzle.height; y++) {
            const cell = puzzle.maskGrid[x][y];
            if (cell > 0 && (x&1) && (y&1)) { //TODO: 这里经过了修改
                console.log('Cell', x, y, 'has been overfilled and no ylops left to place')
                return false
            }
            if (allPolysPlaced && cell < 0 && x % 2 === 1 && y % 2 === 1) {
                // Normal, center cell with a negative value & no polys remaining.
                console.log('All polys placed, but grid not full')
                return false
            }
        }
    }
    if (allPolysPlaced) {
        console.log('All polys placed, and grid full')
        return true
    }

    // The top-left (first open cell) must be filled by a polyomino.
    // However in the case of pillars, there is no top-left, so we try all open cells in the
    // top-most open row
    const openCells = [];
    for (y = 1; y < puzzle.height; y += 2) {
        for (x = 1; x < puzzle.width; x += 2) {
            if ((puzzle.maskGrid[x][y] || 0) >= 0) continue
            openCells.push({'x': x, 'y': y})
            // 简化：不使用 pillar 逻辑，直接 break
            break
        }
        if (openCells.length > 0) break
    }

    if (openCells.length === 0) {
        console.log('Polys remaining but grid full')
        return false
    }

    for (const openCell of openCells) {
        const attemptedPolyshapes: number[] = [];
        for (let i = 0; i < polys.length; i++) {
            const poly = polys[i];
            console.debug('Selected poly', poly)
            if (attemptedPolyshapes.includes(poly.polyshape)) {
                console.debug('Polyshape', poly.polyshape, 'has already been attempted')
                continue
            }
            attemptedPolyshapes.push(poly.polyshape)
            polys.splice(i, 1)
            for (const polyshape of getRotations(poly.polyshape)) {
                console.debug('Selected polyshape', polyshape)
                const cells = polyominoFromPolyshape(polyshape, false, true); // 使用默认设置
                if (!tryPlacePolyshape(cells, openCell.x, openCell.y, puzzle, +1)) {
                    console.debug('Polyshape', polyshape, 'does not fit into', openCell.x, openCell.y)
                    continue
                }
                console.group('')
                if (placePolys(polys, puzzle)) return true
                console.groupEnd()
                // Should not fail, as it's an inversion of the above tryPlacePolyshape
                tryPlacePolyshape(cells, openCell.x, openCell.y, puzzle, -1)
            }
            polys.splice(i, 0, poly)
        }
    }
    console.log('Grid non-empty with >0 polys, but no valid recursion.')
    return false
}

