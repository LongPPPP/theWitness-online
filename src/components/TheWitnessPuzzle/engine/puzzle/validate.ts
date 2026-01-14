import Puzzle from "./puzzle.ts";
import type {Cell, LineCell} from "./cell.ts";
import {DOT_BLUE, DOT_NONE, DOT_YELLOW, GAP_NONE, LINE_BLUE, LINE_NONE, LINE_YELLOW} from "./constants.ts";
import {polyFit} from "./polyominos.ts";

export class RegionData {
    invalidElements: Array<{ x: number, y: number, cell?:Cell }>
    veryInvalidElements: Array<{ x: number, y: number,cell?:Cell }>
    negations: Array<any>

    constructor() {
        this.invalidElements = []
        this.veryInvalidElements = []
        this.negations = []
    }

    addInvalid(elem) {
        this.invalidElements.push(elem)
    }

    addVeryInvalid(elem) {
        this.veryInvalidElements.push(elem)
    }

    valid() {
        return (this.invalidElements.length === 0 && this.veryInvalidElements.length === 0)
    }
}

// Sanity checks for data which comes from the user. Now that people have learned that /publish is an open endpoint,
// we have to make sure they don't submit data which passes validation but is untrustworthy.
// These checks should always pass for puzzles created by the built-in editor.
export function validateUserData(puzzle, path) {
    let symCell: LineCell;
    if (path == null) throw Error('Path cannot be null')

    const sizeError = puzzle.getSizeError(puzzle.width, puzzle.height);
    if (sizeError != null) throw Error(sizeError)

    let puzzleHasStart = false;
    let puzzleHasEnd = false;

    if (puzzle.grid.length !== puzzle.width) throw Error('Puzzle width does not match grid size')
    for (let x = 0; x < puzzle.width; x++) {
        if (puzzle.grid[x].length !== puzzle.height) throw Error('Puzzle height does not match grid size')
        for (let y = 0; y < puzzle.height; y++) {
            const cell = puzzle.grid[x][y];
            if (cell == null) continue

            if (cell.start === true) {
                puzzleHasStart = true
                if (puzzle.symmetry != null) {
                    symCell = puzzle.getSymmetricalCell(x, y);
                    if (symCell == null || symCell.start !== true) {
                        throw Error('Startpoint at ' + x + ' ' + y + ' does not have a symmetrical startpoint')
                    }
                }
            }
            if (cell.end != null) {
                puzzleHasEnd = true
                if (puzzle.symmetry != null) {
                    symCell = puzzle.getSymmetricalCell(x, y);
                    if (symCell == null || symCell.end == null || symCell.end != puzzle.getSymmetricalDir(cell.end)) {
                        throw Error('Endpoint at ' + x + ' ' + y + ' does not have a symmetrical endpoint')
                    }
                }
            }
        }
    }
    if (!puzzleHasStart) throw Error('Puzzle does not have a startpoint')
    if (!puzzleHasEnd) throw Error('Puzzle does not have an endpoint')

    const expectedSettings = new Puzzle(0, 0).settings;
    for (const setting in expectedSettings) {
        if (puzzle.settings[setting] != null && puzzle.settings[setting] !== expectedSettings[setting]) {
            throw Error('Puzzle has a nonstandard value for setting: ' + setting)
        }
    }
}

// Determines if the current grid state is solvable. Modifies the puzzle element with:
// valid: Whether or not the puzzle is valid
// invalidElements: Symbols which are invalid (for the purpose of negating / flashing)
// negations: Negation pairs (for the purpose of darkening)
export function validate(puzzle: Puzzle, quick: boolean) {
    let region: { x: number; y: number; }[];
    let regions: string | any[];
    let y: number;
    let x: number;
    console.log('Validating', puzzle)
    const puzzleData = new RegionData(); // Assumed valid until we find an invalid element

    let needsRegions = false;
    // These two are both used by validateRegion, so they are saved on the puzzle itself.
    puzzle.hasNegations = false
    puzzle.hasPolyominos = false

    // Validate gap failures as an early exit.
    for (x = 0; x < puzzle.width; x++) {
        for (y = 0; y < puzzle.height; y++) {
            const cell = puzzle.grid[x][y];
            if (cell == null) continue
            if (!needsRegions && cell.type != 'line' && cell.type != 'triangle') needsRegions = true
            if (cell.type == 'nega') puzzle.hasNegations = true
            if (cell.type == 'poly' || cell.type == 'ylop') puzzle.hasPolyominos = true
            if ((cell as LineCell).line > LINE_NONE) {
                if ((cell as LineCell).gap > GAP_NONE) {
                    console.log('Solution line goes over a gap at', x, y)
                    puzzleData.invalidElements.push({'x': x, 'y': y})
                    if (quick) return puzzleData
                }
                if (((cell as LineCell).dot === DOT_BLUE && (cell as LineCell).line === LINE_YELLOW) ||
                    ((cell as LineCell).dot === DOT_YELLOW && (cell as LineCell).line === LINE_BLUE)) {
                    console.log('Incorrectly covered dot: Dot is', (cell as LineCell).dot, 'but line is', (cell as LineCell).line)
                    puzzleData.invalidElements.push({'x': x, 'y': y})
                    if (quick) return puzzleData
                }
            }
        }
    }

    if (needsRegions) {
        regions = puzzle.getRegions();
    } else {
        const monoRegion = [];
        for (x = 0; x < puzzle.width; x++) {
            for (y = 0; y < puzzle.height; y++) {
                if (x % 2 === 1 && y % 2 === 1) {
                    monoRegion.push({'x': x, 'y': y})
                } else if ((puzzle.grid[x][y] as LineCell).line === LINE_NONE) {
                    monoRegion.push({'x': x, 'y': y})
                }
            }
        }
        regions = [monoRegion];
    }
    console.log('Found', regions.length, 'region(s)')
    console.debug(regions)

    if (puzzle.settings.CUSTOM_MECHANICS) {
        for (region of regions) {
            const regionData = validateRegion(puzzle, region, quick)
            puzzleData.negations = puzzleData.negations.concat(regionData.negations)
            puzzleData.invalidElements = puzzleData.invalidElements.concat(regionData.invalidElements)
            puzzleData.invalidElements = puzzleData.invalidElements.concat(regionData.veryInvalidElements)
        }

        // When using custom mechanics, we have to handle negations slightly differently.
        // Negations need to be applied after all regions are validated, so that we can evaluate negations for
        // all regions simultaneously. This is because certain custom mechanics are cross-region.
        // ... I guess this is working. Not sure why I wrote this comment.

    } else {
        for (region of regions) {
            const regionData = validateRegion(puzzle, region, quick)
            console.log('Region valid:', regionData.valid())
            puzzleData.negations = puzzleData.negations.concat(regionData.negations)
            puzzleData.invalidElements = puzzleData.invalidElements.concat(regionData.invalidElements)
            // Note: Not using veryInvalid because I don't need to do logic on these elements, just flash them.
            puzzleData.invalidElements = puzzleData.invalidElements.concat(regionData.veryInvalidElements)
            if (quick && !puzzleData.valid()) break
        }
    }
    console.log('Puzzle has', puzzleData.invalidElements.length, 'invalid elements')
    return puzzleData
}

// Determines whether or not a particular region is valid or not, including negation symbols.
// If quick is true, exits after the first invalid element is found (small performance gain)
// This function applies negations to all "very invalid elements", i.e. elements which cannot become
// valid by another element being negated. Then, it passes off to regionCheckNegations2,
// which attempts to apply any remaining negations to any other invalid elements.
export function validateRegion(puzzle: Puzzle, region: Array<{ x: number, y: number }>, quick?: boolean): RegionData {
    let i;
    let pos;
    if (!puzzle.hasNegations) return regionCheck(puzzle, region, quick)

    // Get a list of negation symbols in the grid, and set them to 'nonce'
    const negationSymbols = [];
    for (pos of region) {
        const cell = puzzle.grid[pos.x][pos.y];
        if (cell != null && cell.type === 'nega') {
            pos.cell = cell
            negationSymbols.push(pos)
            puzzle.updateCell2(pos.x, pos.y, 'type', 'nonce')
        }
    }
    console.debug('Found', negationSymbols.length, 'negation symbols')
    if (negationSymbols.length === 0) {
        // No negation symbols in this region. Note that there must be negation symbols elsewhere
        // in the puzzle, since puzzle.hasNegations was true.
        return regionCheck(puzzle, region, quick)
    }

    // Get a list of elements that are currently invalid (before any negations are applied)
    // This cannot be quick, as we need a full list (for the purposes of negation).
    let regionData = regionCheck(puzzle, region, false);
    console.debug('Negation-less regioncheck valid:', regionData.valid())

    // Set 'nonce' back to 'nega' for the negation symbols
    for (pos of negationSymbols) {
        puzzle.updateCell2(pos.x, pos.y, 'type', 'nega')
    }

    const invalidElements = regionData.invalidElements;
    const veryInvalidElements = regionData.veryInvalidElements;

    for (i = 0; i < invalidElements.length; i++) {
        invalidElements[i].cell = puzzle.getCell(invalidElements[i].x, invalidElements[i].y)
    }
    for (i = 0; i < veryInvalidElements.length; i++) {
        veryInvalidElements[i].cell = puzzle.getCell(veryInvalidElements[i].x, veryInvalidElements[i].y)
    }

    console.debug('Forcibly negating', veryInvalidElements.length, 'symbols')
    const baseCombination = [];
    while (negationSymbols.length > 0 && veryInvalidElements.length > 0) {
        const source = negationSymbols.pop();
        const target = veryInvalidElements.pop();
        puzzle.setCell(source.x, source.y, null)
        puzzle.setCell(target.x, target.y, null)
        baseCombination.push({'source': source, 'target': target})
    }

    regionData = regionCheckNegations2(puzzle, region, negationSymbols, invalidElements);

    // Restore required negations
    for (const combination of baseCombination) {
        puzzle.setCell(combination.source.x, combination.source.y, combination.source.cell)
        puzzle.setCell(combination.target.x, combination.target.y, combination.target.cell)
        regionData.negations.push(combination)
    }
    return regionData
}

// Recursively matches negations and invalid elements from the grid. Note that this function
// doesn't actually modify the two lists, it just iterates through them with index/index2.
function regionCheckNegations2(puzzle, region, negationSymbols, invalidElements, index = 0, index2 = 0) {
    let regionData;
    let target;
    let source;
    let i;
    if (index2 >= negationSymbols.length) {
        console.debug('0 negation symbols left, returning negation-less regionCheck')
        return regionCheck(puzzle, region, false) // @Performance: We could pass quick here.
    }

    if (index >= invalidElements.length) {
        i = index2;
        // pair off all negation symbols, 2 at a time
        if (puzzle.settings.NEGATIONS_CANCEL_NEGATIONS) {
            for (; i < negationSymbols.length - 1; i += 2) {
                source = negationSymbols[i];
                target = negationSymbols[i + 1];
                puzzle.setCell(source.x, source.y, null)
                puzzle.setCell(target.x, target.y, null)
            }
        }

        console.debug(negationSymbols.length - i, 'negation symbol(s) left over with nothing to negate')
        for (; i < negationSymbols.length; i++) {
            puzzle.updateCell2(negationSymbols[i].x, negationSymbols[i].y, 'type', 'nonce')
        }
        // Cannot be quick, as we need the full list of invalid symbols.
        regionData = regionCheck(puzzle, region, false);

        i = index2
        if (puzzle.settings.NEGATIONS_CANCEL_NEGATIONS) {
            for (; i < negationSymbols.length - 1; i += 2) {
                source = negationSymbols[i];
                target = negationSymbols[i + 1];
                puzzle.setCell(source.x, source.y, source.cell)
                puzzle.setCell(target.x, target.y, target.cell)
                regionData.negations.push({'source': source, 'target': target})
            }
        }
        for (; i < negationSymbols.length; i++) {
            puzzle.updateCell2(negationSymbols[i].x, negationSymbols[i].y, 'type', 'nega')
            regionData.addInvalid(negationSymbols[i])
        }
        return regionData
    }

    source = negationSymbols[index2++];
    puzzle.setCell(source.x, source.y, null)

    let firstRegionData = null;
    for (i = index; i < invalidElements.length; i++) {
        target = invalidElements[i];
        console.debug('Attempting negation pair', source, target)

        console.group()
        puzzle.setCell(target.x, target.y, null)
        regionData = regionCheckNegations2(puzzle, region, negationSymbols, invalidElements, i + 1, index2);
        puzzle.setCell(target.x, target.y, target.cell)
        console.groupEnd()

        if (!firstRegionData) {
            firstRegionData = regionData
            firstRegionData.negations.push({'source': source, 'target': target})
        }
        if (regionData.valid()) {
            regionData.negations.push({'source': source, 'target': target})
            break
        }
    }

    puzzle.setCell(source.x, source.y, source.cell)
    // For display purposes only. The first attempt will always pair off the most negation symbols,
    // so it's the best choice to display (if we're going to fail).
    return (regionData.valid() ? regionData : firstRegionData)
}

// Checks if a region is valid. This does not handle negations -- we assume that there are none.
// Note that this function needs to always ask the puzzle for the current contents of the cell,
// since the region is only coordinate locations, and might be modified by regionCheckNegations2
// @Performance: This is a pretty core function to the solve loop.
function regionCheck(puzzle, region, quick) {
    let count;
    let cell;
    let pos;
    console.log('Validating region of size', region.length, region)
    const regionData = new RegionData();

    const squares = [];
    const stars = [];
    const coloredObjects = {};
    let squareColor = null;

    for (pos of region) {
        cell = puzzle.grid[pos.x][pos.y];
        if (cell == null) continue

        // Check for uncovered dots
        if (cell.dot > DOT_NONE) {
            console.log('Dot at', pos.x, pos.y, 'is not covered')
            regionData.addVeryInvalid(pos)
            if (quick) return regionData
        }

        // Check for triangles
        if (cell.type === 'triangle') {
            count = 0;
            if (puzzle.getLine(pos.x - 1, pos.y) > LINE_NONE) count++
            if (puzzle.getLine(pos.x + 1, pos.y) > LINE_NONE) count++
            if (puzzle.getLine(pos.x, pos.y - 1) > LINE_NONE) count++
            if (puzzle.getLine(pos.x, pos.y + 1) > LINE_NONE) count++
            if (cell.count !== count) {
                console.log('Triangle at grid[' + pos.x + '][' + pos.y + '] has', count, 'borders')
                regionData.addVeryInvalid(pos)
                if (quick) return regionData
            }
        }

        // Count color-based elements
        if (cell.color != null) {
            count = coloredObjects[cell.color];
            if (count == null) {
                count = 0
            }
            coloredObjects[cell.color] = count + 1

            if (cell.type === 'square') {
                squares.push(pos)
                if (squareColor == null) {
                    squareColor = cell.color
                } else if (squareColor != cell.color) {
                    squareColor = -1 // Signal value which indicates square color collision
                }
            }

            if (cell.type === 'star') {
                pos.color = cell.color
                stars.push(pos)
            }
        }
    }

    if (squareColor === -1) {
        regionData.invalidElements = regionData.invalidElements.concat(squares)
        if (quick) return regionData
    }

    for (const star of stars) {
        count = coloredObjects[star.color];
        if (count === 1) {
            console.log('Found a', star.color, 'star in a region with 1', star.color, 'object')
            regionData.addVeryInvalid(star)
            if (quick) return regionData
        } else if (count > 2) {
            console.log('Found a', star.color, 'star in a region with', count, star.color, 'objects')
            regionData.addInvalid(star)
            if (quick) return regionData
        }
    }

    if (puzzle.hasPolyominos) {
        if (!polyFit(region, puzzle)) {
            for (pos of region) {
                cell = puzzle.grid[pos.x][pos.y];
                if (cell == null) continue
                if (cell.type === 'poly' || cell.type === 'ylop') {
                    regionData.addInvalid(pos)
                    if (quick) return regionData
                }
            }
        }
    }

    if (puzzle.settings.CUSTOM_MECHANICS) {
        // window.validateBridges(puzzle, region, regionData)
        // window.validateArrows(puzzle, region, regionData)
        // window.validateSizers(puzzle, region, regionData)
    }

    console.debug('Region has', regionData.veryInvalidElements.length, 'very invalid elements')
    console.debug('Region has', regionData.invalidElements.length, 'invalid elements')
    return regionData
}



