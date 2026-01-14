import type Puzzle from "./puzzle.ts";
import {createElement, drawSymbolWithSvg, type Params} from "./svg.ts";
import {DOT_BLACK, DOT_BLUE, DOT_INVISIBLE, DOT_NONE, DOT_YELLOW, GAP_BREAK, GAP_FULL} from "./constants.ts";
import type {LineCell} from "./cell.ts";
import {trace} from "./trace2.ts";

export function draw(puzzle: Puzzle, target = 'puzzle') {
    let pixelWidth: number;
    if (puzzle == null) return
    const svg = document.getElementById(target);
    console.info('Drawing', puzzle, 'into', svg)
    while (svg.firstChild) svg.removeChild(svg.firstChild)

    // Prevent context menu popups within the puzzle
    svg.oncontextmenu = function (event) {
        event.preventDefault()
    }

    if (puzzle.pillar === true) {
        // 41*width + 30*2 (padding) + 10*2 (border)
        pixelWidth = 41 * puzzle.width + 80;
    } else {
        // 41*(width-1) + 24 (extra edge) + 30*2 (padding) + 10*2 (border)
        pixelWidth = 41 * puzzle.width + 63;
    }
    const pixelHeight = 41 * puzzle.height + 63;
    svg.setAttribute('viewbox', '0 0 ' + pixelWidth + ' ' + pixelHeight)
    svg.setAttribute('width', String(pixelWidth))
    svg.setAttribute('height', String(pixelHeight))

    const rect = createElement('rect');
    svg.appendChild(rect)
    rect.setAttribute('stroke-width', String(10))
    rect.setAttribute('stroke', 'var(--border)')
    rect.setAttribute('fill', 'var(--outer-background)')
    // Accounting for the border thickness
    rect.setAttribute('x', String(5))
    rect.setAttribute('y', String(5))
    rect.setAttribute('width', String(pixelWidth - 10)) // Removing border
    rect.setAttribute('height', String(pixelHeight - 10)) // Removing border

    drawCenters(puzzle, svg)
    drawGrid(puzzle, svg, target)
    drawStartAndEnd(puzzle, svg)
    // Draw cell symbols after so they overlap the lines, if necessary
    drawSymbols(puzzle, svg, target)

    // For pillar puzzles, add faders for the left and right sides
    if (puzzle.pillar === true) {
        const defs = createElement('defs');
        defs.id = 'cursorPos'
        defs.innerHTML = '' +
            '<linearGradient id="fadeInLeft">\n' +
            '  <stop offset="0%"   stop-opacity="1.0" stop-color="' + 'var(--outer-background)' + '"></stop>\n' +
            '  <stop offset="25%"  stop-opacity="1.0" stop-color="' + 'var(--outer-background)' + '"></stop>\n' +
            '  <stop offset="100%" stop-opacity="0.0" stop-color="' + 'var(--outer-background)' + '"></stop>\n' +
            '</linearGradient>\n' +
            '<linearGradient id="fadeOutRight">\n' +
            '  <stop offset="0%"   stop-opacity="0.0" stop-color="' + 'var(--outer-background)' + '"></stop>\n' +
            '  <stop offset="100%" stop-opacity="1.0" stop-color="' + 'var(--outer-background)' + '"></stop>\n' +
            '</linearGradient>\n'
        svg.appendChild(defs)

        const leftBox = createElement('rect');
        leftBox.setAttribute('x', String(16))
        leftBox.setAttribute('y', String(10))
        leftBox.setAttribute('width', String(48))
        leftBox.setAttribute('height', String(41 * puzzle.height + 43))
        leftBox.setAttribute('fill', 'url(#fadeInLeft)')
        leftBox.setAttribute('style', 'pointer-events: none')
        svg.appendChild(leftBox)

        const rightBox = createElement('rect');
        rightBox.setAttribute('x', String(41 * puzzle.width + 22))
        rightBox.setAttribute('y', String(10))
        rightBox.setAttribute('width', String(30))
        rightBox.setAttribute('height', String(41 * puzzle.height + 43))
        rightBox.setAttribute('fill', 'url(#fadeOutRight)')
        rightBox.setAttribute('style', 'pointer-events: none')
        svg.appendChild(rightBox)
    }
}

function drawCenters(puzzle: Puzzle, svg: HTMLElement) {
    // Cell borders the outside
    // @Hack that I am not fixing. This switches the puzzle's grid to a floodfilled grid
    // where null represents cells which are part of the outside
    let rect: SVGElement;
    let y: number;
    const savedGrid = puzzle.switchToMaskedGrid();
    if (puzzle.pillar === true) {
        for (y = 1; y < puzzle.height; y += 2) {
            if (puzzle.getCell(-1, y) == null) continue

            rect = createElement('rect');
            rect.setAttribute('x', String(28))
            rect.setAttribute('y', String(41 * y + 11))
            rect.setAttribute('width', String(24))
            rect.setAttribute('height', String(82))
            rect.setAttribute('fill', 'var(--background)')
            svg.appendChild(rect)
        }
    }

    for (let x = 1; x < puzzle.width; x += 2) {
        for (y = 1; y < puzzle.height; y += 2) {
            if (puzzle.grid[x][y] == null) continue // Cell borders the outside

            rect = createElement('rect');
            rect.setAttribute('x', String(41 * x + 11))
            rect.setAttribute('y', String(41 * y + 11))
            rect.setAttribute('width', String(82))
            rect.setAttribute('height', String(82))
            rect.setAttribute('fill', 'var(--background)')
            rect.setAttribute('shape-rendering', 'crispedges') // Otherwise they don't meet behind gaps
            svg.appendChild(rect)
        }
    }
    puzzle.grid = savedGrid
}

function drawGrid(puzzle: Puzzle, svg: HTMLElement, target: string) {
    let line: SVGElement;
    let cell: LineCell | null;
    let y: number;
    let x: number;
    for (x = 0; x < puzzle.width; x++) {
        for (y = 0; y < puzzle.height; y++) {
            cell = puzzle.grid[x][y] as LineCell | null;
            if (cell != null && cell.gap === GAP_FULL) continue
            if (cell != null && cell.gap === GAP_BREAK) {
                const params:Params = {
                    width: 58,
                    height: 58,
                    x: x * 41 + 23,
                    y: y * 41 + 23,
                    class: target + '_' + x + '_' + y,
                    type: 'gap',
                    rot: undefined,
                };
                if (x % 2 === 0 && y % 2 === 1) params.rot = 1
                drawSymbolWithSvg(svg, params)
                continue
            }

            line = createElement('line');
            line.setAttribute('stroke-width', String(24))
            line.setAttribute('stroke-linecap', 'round')
            line.setAttribute('stroke', 'var(--foreground)')
            if (x % 2 === 1 && y % 2 === 0) { // Horizontal
                if (cell.gap === GAP_BREAK) continue
                line.setAttribute('x1', String((x - 1) * 41 + 52))
                // Adjust the length if it's a pillar -- the grid is not as wide!
                if (puzzle.pillar === true && x === puzzle.width - 1) {
                    line.setAttribute('x2', String((x + 1) * 41 + 40))
                } else {
                    line.setAttribute('x2', String((x + 1) * 41 + 52))
                }
                line.setAttribute('y1', String(y * 41 + 52))
                line.setAttribute('y2', String(y * 41 + 52))
                svg.appendChild(line)
            } else if (x % 2 === 0 && y % 2 === 1) { // Vertical
                if (cell.gap === GAP_BREAK) continue
                line.setAttribute('x1', String(x * 41 + 52))
                line.setAttribute('x2', String(x * 41 + 52))
                line.setAttribute('y1', String((y - 1) * 41 + 52))
                line.setAttribute('y2', String((y + 1) * 41 + 52))
                svg.appendChild(line)
            } else if (x % 2 === 0 && y % 2 === 0) { // Intersection
                let surroundingLines = 0;
                if (cell.end != null) surroundingLines++
                const leftCell = puzzle.getLineCell(x - 1, y)
                if (leftCell != null && leftCell.gap !== GAP_FULL) surroundingLines++
                const rightCell = puzzle.getLineCell(x + 1, y)
                if (rightCell != null && rightCell.gap !== GAP_FULL) surroundingLines++
                const topCell = puzzle.getLineCell(x, y - 1)
                if (topCell != null && topCell.gap !== GAP_FULL) surroundingLines++
                const bottomCell = puzzle.getLineCell(x, y + 1)
                if (bottomCell != null && bottomCell.gap !== GAP_FULL) surroundingLines++

                if (surroundingLines === 1) {
                    // Add square caps for dead ends which are non-endpoints
                    const rect = createElement('rect');
                    rect.setAttribute('x', String(x * 41 + 40))
                    rect.setAttribute('y', String(y * 41 + 40))
                    rect.setAttribute('width', String(24))
                    rect.setAttribute('height', String(24))
                    rect.setAttribute('fill', 'var(--foreground)')
                    svg.appendChild(rect)
                } else if (surroundingLines > 1) {
                    // Add rounding for other intersections (handling gap-only corners)
                    const circ = createElement('circle');
                    circ.setAttribute('cx', String(x * 41 + 52))
                    circ.setAttribute('cy', String(y * 41 + 52))
                    circ.setAttribute('r', String(12))
                    circ.setAttribute('fill', 'var(--foreground)')
                    svg.appendChild(circ)
                }
            }
        }
    }
    // Determine if left-side needs a 'wrap indicator'
    if (puzzle.pillar === true) {
        x = 0;
        for (y = 0; y < puzzle.height; y += 2) {
            cell = puzzle.getCell(x - 1, y) as LineCell;
            if (cell == null || cell.gap === GAP_FULL) continue
            line = createElement('line');
            line.setAttribute('stroke-width', String(24))
            line.setAttribute('stroke-linecap', 'round')
            line.setAttribute('stroke', 'var(--foreground)')
            line.setAttribute('x1', String(x * 41 + 40))
            line.setAttribute('x2', String(x * 41 + 52))
            line.setAttribute('y1', String(y * 41 + 52))
            line.setAttribute('y2', String(y * 41 + 52))
            svg.appendChild(line)
        }
    }
}

function drawSymbols(puzzle: Puzzle, svg: SVGElement | HTMLElement, target: string) {
    for (let x = 0; x < puzzle.width; x++) {
        for (let y = 0; y < puzzle.height; y++) {
            const cell = puzzle.grid[x][y] as LineCell;
            if (cell == null) continue
            const params = {
                'width': 58,
                'height': 58,
                'x': x * 41 + 23,
                'y': y * 41 + 23,
                'class': target + '_' + x + '_' + y,
                type: undefined,
                color: undefined,
                stroke: undefined,
                strokeWidth: undefined,
            };
            if (cell.dot > DOT_NONE) {
                params.type = 'dot'
                if (cell.dot === DOT_BLACK) params.color = 'black'
                else if (cell.dot === DOT_BLUE) params.color = 'var(--line-primary)'
                else if (cell.dot === DOT_YELLOW) params.color = 'var(--line-secondary)'
                else if (cell.dot === DOT_INVISIBLE) {
                    params.color = 'var(--foreground)'
                    // This makes the invisible dots visible, but only while we're in the editor.
                    if (document.getElementById('metaButtons') != null) {
                        params.stroke = 'black'
                        params.strokeWidth = '2px'
                    }
                }
                drawSymbolWithSvg(svg, params)
            } else if (cell.gap === GAP_BREAK) {
                // Gaps were handled above, while drawing the grid.
            } else if (x % 2 === 1 && y % 2 === 1) {
                // Generic draw for all other elements
                Object.assign(params, cell)
                drawSymbolWithSvg(svg, params, puzzle.settings.CUSTOM_MECHANICS)
            }
        }
    }
}

function drawStartAndEnd(puzzle: Puzzle, svg: HTMLElement) {
    for (let x = 0; x < puzzle.width; x++) {
        for (let y = 0; y < puzzle.height; y++) {
            const cell = puzzle.grid[x][y] as LineCell;
            if (cell == null) continue
            if (cell.end != null) {
                drawSymbolWithSvg(svg, {
                    'type': 'end',
                    'width': 58,
                    'height': 58,
                    'dir': cell.end,
                    'x': x * 41 + 23,
                    'y': y * 41 + 23,
                })
                const end = svg.lastChild as SVGSVGElement;
                end.id = 'end_' + svg.id + '_' + x + '_' + y
            }

            if (cell.start === true) {
                let symStart = null;
                if (puzzle.symmetry != null) {
                    const sym = puzzle.getSymmetricalPos(x, y);
                    drawSymbolWithSvg(svg, {
                        'type': 'start',
                        'width': 58,
                        'height': 58,
                        'x': sym.x * 41 + 23,
                        'y': sym.y * 41 + 23,
                    })
                    symStart = svg.lastChild
                    symStart.style.display = 'none'
                    symStart.id = 'symStart_' + svg.id + '_' + x + '_' + y
                }

                drawSymbolWithSvg(svg, {
                    'type': 'start',
                    'width': 58,
                    'height': 58,
                    'x': x * 41 + 23,
                    'y': y * 41 + 23,
                })
                const start = svg.lastChild as SVGSVGElement;
                start.id = 'start_' + svg.id + '_' + x + '_' + y

                // ;(function(a){}(a))
                // This syntax is used to forcibly copy all the arguments
                ;(function (puzzle, x, y, start, symStart) {
                    start.onpointerdown = function (event) {
                        trace(event, puzzle, {'x': x, 'y': y}, start, symStart)
                    }
                }(puzzle, x, y, start, symStart))
            }
        }
    }
}
