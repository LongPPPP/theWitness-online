// @Volatile -- must match order of MOVE_* in trace2
// Move these, dummy.
import Puzzle from "./puzzle.ts";
import {GAP_NONE, LINE_BLACK, LINE_BLUE, LINE_NONE, LINE_YELLOW} from "./constants.ts";
import {validate, validateRegion} from "./validate.ts";
import * as Trace2 from "./trace2.ts";
import type {LineCell} from "./cell.ts";

const PATH_NONE = 0;
const PATH_LEFT = 1;
const PATH_RIGHT = 2;
const PATH_TOP = 3;
const PATH_BOTTOM = 4;

export default class PuzzleSolver {
    private static readonly NODE_DEPTH = 9;
    private static readonly SYNC_THRESHOLD = 9;// Depth at which we switch to a synchronous solver (for perf)
    private MAX_SOLUTIONS = 10000;
    private puzzle: Puzzle
    private task: any;
    private nodes = 0;
    private percentages = [];
    private doPruning = false;
    private SOLVE_SYNC = false;
    private path: Array<{ x: number, y: number } | number> = [];
    private asyncTimer = 0;
    private solutionPaths: Array<Array<{ x: number, y: number } | number>> = []; // 每条路径是 [起点, ...方向]

    constructor(puzzle: Puzzle) {
        this.puzzle = puzzle;
    }

    countNodes(x: number, y: number, depth: number, puzzle = this.puzzle) {
        // Check for collisions (outside, gap, self, other)
        const cell = puzzle.getLineCell(x, y);
        if (cell == null) return
        if ((cell.gap ?? 0) > GAP_NONE) return
        if (cell.line !== LINE_NONE) return

        if (puzzle.symmetry == null) {
            puzzle.updateCell2(x, y, 'line', LINE_BLACK)
        } else {
            const sym = puzzle.getSymmetricalPos(x, y);
            if (puzzle.matchesSymmetricalPos(x, y, sym.x, sym.y)) return // Would collide with our reflection

            const symCell = puzzle.getLineCell(sym.x, sym.y);
            if ((symCell?.gap ?? 0) > GAP_NONE) return

            puzzle.updateCell2(x, y, 'line', LINE_BLUE)
            puzzle.updateCell2(sym.x, sym.y, 'line', LINE_YELLOW)
        }

        if (depth < PuzzleSolver.NODE_DEPTH) {
            this.nodes++

            if (y % 2 === 0) {
                this.countNodes(x - 1, y, depth + 1)
                this.countNodes(x + 1, y, depth + 1)
            }

            if (x % 2 === 0) {
                this.countNodes(x, y - 1, depth + 1)
                this.countNodes(x, y + 1, depth + 1)
            }
        }

        this.tailRecurse(x, y)
    }

    tailRecurse(x: number, y: number, puzzle = this.puzzle) {
        // Tail recursion: Back out of this cell
        puzzle.updateCell2(x, y, 'line', LINE_NONE)
        if (puzzle.symmetry != null) {
            const sym = puzzle.getSymmetricalPos(x, y);
            puzzle.updateCell2(sym.x, sym.y, 'line', LINE_NONE)
        }
    }

    // Generates a solution via DFS recursive backtracking
    solve(partialCallback, finalCallback) {
        if (this.task != null) throw Error('Cannot start another solve() while one is already in progress')
        const puzzle = this.puzzle;
        const start = (new Date()).getTime();

        const startPoints = [];
        let numEndpoints = 0;
        puzzle.hasNegations = false
        puzzle.hasPolyominos = false
        for (let x = 0; x < puzzle.width; x++) {
            for (let y = 0; y < puzzle.height; y++) {
                const cell = puzzle.getLineCell(x, y);
                if (cell == null) continue
                if (cell.start === true) {
                    startPoints.push({'x': x, 'y': y})
                }
                if (cell.end != null) numEndpoints++
            }
        }

        // Puzzles which are small enough should be solved synchronously, since the cost of asynchronizing
        // is greater than the cost of the puzzle.
        this.SOLVE_SYNC = false
        if (puzzle.symmetry != null) { // 5x5 is the max for symmetry puzzles
            if (puzzle.width * puzzle.height <= 121) this.SOLVE_SYNC = true
        } else if (puzzle.pillar === true) { // 4x5 is the max for non-symmetry, pillar puzzles
            if (puzzle.width * puzzle.height <= 108) this.SOLVE_SYNC = true
        } else { // 5x5 is the max for non-symmetry, non-pillar puzzles
            if (puzzle.width * puzzle.height <= 121) this.SOLVE_SYNC = true
        }
        console.log('Puzzle is a', puzzle.width, 'by', puzzle.height, 'solving ' + (this.SOLVE_SYNC ? 'sync' : 'async'))

        // We pre-traverse the grid (only considering obvious failure states like going out of bounds),
        // and compute a total number of nodes that are reachable within some NODE_DEPTH steps.
        // Then, during actual traversal, we can compare the number of nodes reached to the precomputed count
        // to get a (fairly accurate) progress bar.
        for (const pos of startPoints) {
            this.countNodes(pos.x, pos.y, 0)
        }
        console.log('Pretraversal found', this.nodes, 'nodes')
        this.percentages = []
        for (let i = 0; i < 100; i++) {
            this.percentages.push(Math.floor(i * this.nodes / 100))
        }
        this.nodes = 0

        this.solutionPaths = []
        // Some reasonable default data, which will avoid crashes during the solveLoop.
        const earlyExitData = [false, {'isEdge': false}, {'isEdge': false}];


        // Large pruning optimization -- Attempt to early exit once we cut out a region.
        // Inspired by https://github.com/Overv/TheWitnessSolver
        // For non-pillar puzzles, every time we draw a line from one edge to another, we cut out two regions.
        // We can detect this by asking if we've ever left an edge, and determining if we've just touched an edge.
        // However, just touching the edge isn't sufficient, since we could still enter either region.
        // As such, we wait one additional step, to see which half we have moved in to, then we evaluate
        // whichever half you moved away from (since you can no longer re-enter it).
        //
        // Consider this pathway (tracing X-X-X-A-B-C).
        // ....X....
        // . . X . .
        // ....X....
        // . . A . .
        // ...CB....
        //
        // Note that, once we have reached B, the puzzle is divided in half. However, we could go either
        // left or right -- so we don't know which region is safe to validate.
        // Once we reach C, however, the region to the right is closed off.
        // As such, we can start a flood fill from the cell to the right of A, computed by A+(C-B).
        //
        // Unfortunately, this optimization doesn't work for pillars, since the two regions are still connected.
        // Additionally, this optimization doesn't work when custom mechanics are active, as many custom mechanics
        // depend on the path through the entire puzzle
        this.doPruning = (puzzle.pillar === false && !puzzle.settings.CUSTOM_MECHANICS)

        const self = this;
        this.task = {
            'code': function () {
                const newTasks = [];

                for (const pos of startPoints) {
                    // ;(function(a){}(a))
                    // This syntax is used to forcibly copy arguments which are otherwise part of the loop.
                    // Note that we don't need to copy objects, just value types.
                    ;(function (pos) {
                        newTasks.push(function () {
                            self.path = [pos]
                            puzzle.startPoint = pos
                            return self.solveLoop(pos.x, pos.y, numEndpoints, earlyExitData)
                        })
                    }(pos))
                }
                return newTasks
            }
        }

        this.taskLoop(partialCallback, () => {
            const end = (new Date()).getTime();
            console.log('Solved', puzzle, 'in', (end - start) / 1000, 'seconds')
            if (finalCallback) finalCallback(this.solutionPaths)
        })
        return this.solutionPaths
    }

    taskLoop(partialCallback, finalCallback) {
        if (this.task == null) {
            finalCallback()
            return
        }

        const newTasks = this.task.code();
        this.task = this.task.nextTask
        if (newTasks != null && newTasks.length > 0) {
            // Tasks are pushed in order. To do DFS, we need to enqueue them in reverse order.
            for (let i = newTasks.length - 1; i >= 0; i--) {
                this.task = {
                    'code': newTasks[i],
                    'nextTask': this.task,
                }
            }
        }

        // Asynchronizing is expensive. As such, we don't want to do it too often.
        // However, we would like 'cancel solving' to be responsive. So, we call setTimeout every so often.
        let doAsync = false;
        if (!this.SOLVE_SYNC) {
            doAsync = (this.asyncTimer++ % 100 === 0)
            while (this.nodes >= this.percentages[0]) {
                if (partialCallback) partialCallback(100 - this.percentages.length)
                this.percentages.shift()
                doAsync = true
            }
        }

        if (doAsync) {
            setTimeout(() => {
                this.taskLoop(partialCallback, finalCallback)
            }, 0)
        } else {
            this.taskLoop(partialCallback, finalCallback)
        }
    }

    // @Performance: This is the most central loop in this code.
    // Any performance efforts should be focused here.
    // Note: Most mechanics are NP (or harder), so don't feel bad about solving them by brute force.
    // https://arxiv.org/pdf/1804.10193.pdf
    solveLoop(x, y, numEndpoints, earlyExitData) {
        // Stop trying to solve once we reach our goal
        if (this.solutionPaths.length >= this.MAX_SOLUTIONS) return
        const puzzle = this.puzzle;

        // Check for collisions (outside, gap, self, other)
        const cell = puzzle.getLineCell(x, y);
        if (cell == null) return
        if ((cell.gap ?? 0) > GAP_NONE) return
        if (cell.line !== LINE_NONE) return

        if (puzzle.symmetry == null) {
            puzzle.updateCell2(x, y, 'line', LINE_BLACK)
        } else {
            const sym = puzzle.getSymmetricalPos(x, y);
            if (puzzle.matchesSymmetricalPos(x, y, sym.x, sym.y)) return // Would collide with our reflection

            const symCell = puzzle.getLineCell(sym.x, sym.y);
            if ((symCell?.gap ?? 0) > GAP_NONE) return

            puzzle.updateCell2(x, y, 'line', LINE_BLUE)
            puzzle.updateCell2(sym.x, sym.y, 'line', LINE_YELLOW)
        }

        if (this.path.length < PuzzleSolver.NODE_DEPTH) this.nodes++

        if (cell.end != null) {
            this.path.push(PATH_NONE)
            puzzle.endPoint = {'x': x, 'y': y}
            const puzzleData = validate(puzzle, true);
            if (puzzleData.valid()) this.solutionPaths.push(this.path.slice())
            this.path.pop()

            // If there are no further endpoints, tail recurse.
            // Otherwise, keep going -- we might be able to reach another endpoint.
            numEndpoints--
            if (numEndpoints === 0) return this.tailRecurse(x, y)
        }

        let newEarlyExitData = null;
        if (this.doPruning) {
            const isEdge = x <= 0 || y <= 0 || x >= puzzle.width - 1 || y >= puzzle.height - 1;
            newEarlyExitData = [
                earlyExitData[0] || (!isEdge && earlyExitData[2].isEdge), // Have we ever left an edge?
                earlyExitData[2],                                         // The position before our current one
                {'x': x, 'y': y, 'isEdge': isEdge}                           // Our current position.
            ]
            if (earlyExitData[0] && !earlyExitData[1].isEdge && earlyExitData[2].isEdge && isEdge) {
                // See the above comment for an explanation of this math.
                const floodX = earlyExitData[2].x + (earlyExitData[1].x - x);
                const floodY = earlyExitData[2].y + (earlyExitData[1].y - y)
                const region = puzzle.getRegion(floodX, floodY)
                if (region != null) {
                    const regionData = validateRegion(puzzle, region, true);
                    if (!regionData.valid()) return this.tailRecurse(x, y)

                    // Additionally, we might have left an endpoint in the enclosed region.
                    // If so, we should decrement the number of remaining endpoints (and possibly tail recurse).
                    for (const pos of region) {
                        const endCell = puzzle.getLineCell(pos.x, pos.y);
                        if (endCell != null && endCell.end != null) numEndpoints--
                    }

                    if (numEndpoints === 0) return this.tailRecurse(x, y)
                }
            }
        }

        if (this.SOLVE_SYNC || this.path.length > PuzzleSolver.SYNC_THRESHOLD) {
            this.path.push(PATH_NONE)

            // Recursion order (LRUD) is optimized for BL->TR and mid-start puzzles
            if (y % 2 === 0) {
                this.path[this.path.length - 1] = PATH_LEFT
                this.solveLoop(x - 1, y, numEndpoints, newEarlyExitData)

                this.path[this.path.length - 1] = PATH_RIGHT
                this.solveLoop(x + 1, y, numEndpoints, newEarlyExitData)
            }

            if (x % 2 === 0) {
                this.path[this.path.length - 1] = PATH_TOP
                this.solveLoop(x, y - 1, numEndpoints, newEarlyExitData)

                this.path[this.path.length - 1] = PATH_BOTTOM
                this.solveLoop(x, y + 1, numEndpoints, newEarlyExitData)
            }

            this.path.pop()
            this.tailRecurse(x, y)

        } else {
            // Push a dummy element on the end of the path, so that we can fill it correctly as we DFS.
            // This element is popped when we tail recurse (which always happens *after* all of our DFS!)
            this.path.push(PATH_NONE)

            // Recursion order (LRUD) is optimized for BL->TR and mid-start puzzles
            const newTasks = [];
            if (y % 2 === 0) {
                newTasks.push(() => {
                    this.path[this.path.length - 1] = PATH_LEFT
                    return this.solveLoop(x - 1, y, numEndpoints, newEarlyExitData)
                })
                newTasks.push(() => {
                    this.path[this.path.length - 1] = PATH_RIGHT
                    return this.solveLoop(x + 1, y, numEndpoints, newEarlyExitData)
                })
            }

            if (x % 2 === 0) {
                newTasks.push(() => {
                    this.path[this.path.length - 1] = PATH_TOP
                    return this.solveLoop(x, y - 1, numEndpoints, newEarlyExitData)
                })
                newTasks.push(() => {
                    this.path[this.path.length - 1] = PATH_BOTTOM
                    return this.solveLoop(x, y + 1, numEndpoints, newEarlyExitData)
                })
            }

            newTasks.push(() => {
                this.path.pop()
                this.tailRecurse(x, y)
            })

            return newTasks
        }
    }

    cancelSolving() {
        console.info('Cancelled solving')
        this.MAX_SOLUTIONS = 0 // Causes all new solveLoop calls to exit immediately.
        this.task = null
    }

    // Only modifies the puzzle object (does not do any graphics updates). Used by metapuzzle.js to determine subpuzzle polyshapes.
    drawPathNoUI(puzzle: Puzzle, path) {
        puzzle.clearLines()

        // Extract the start data from the first path element
        let x = path[0].x;
        let y = path[0].y;
        let cell = puzzle.getLineCell(x, y);
        if (cell == null || cell.start !== true) throw Error('Path does not begin with a startpoint: ' + JSON.stringify(cell))

        for (let i = 1; i < path.length; i++) {
            cell = puzzle.getLineCell(x, y);

            let dx = 0;
            let dy = 0;
            if (path[i] === PATH_NONE) { // Reached an endpoint, move into it
                console.debug('Reached endpoint')
                if (i != path.length - 1) throw Error('Path contains ' + (path.length - 1 - i) + ' trailing directions')
                break
            } else if (path[i] === PATH_LEFT) dx = -1
            else if (path[i] === PATH_RIGHT) dx = +1
            else if (path[i] === PATH_TOP) dy = -1
            else if (path[i] === PATH_BOTTOM) dy = +1
            else throw Error('Path element ' + (i - 1) + ' was not a valid path direction: ' + path[i])

            x += dx
            y += dy
            // Set the cell color
            if (puzzle.symmetry == null) {
                if (cell) cell.line = LINE_BLACK
            } else {
                if (cell) cell.line = LINE_BLUE
                const sym = puzzle.getSymmetricalPos(x, y);
                puzzle.updateCell2(sym.x, sym.y, 'line', LINE_YELLOW)
            }
        }

        cell = puzzle.getLineCell(x, y);
        if (cell == null || cell.end == null) throw Error('Path does not end at an endpoint: ' + JSON.stringify(cell))
    }

    // Uses trace2 to draw the path on the grid, logs a graphical representation of the solution,
    // and also modifies the puzzle to contain the solution path.
    static drawPath(puzzle: Puzzle, path: ({ x: number, y: number } | number)[], puzzleElem: SVGSVGElement) {
        const target = puzzleElem.id;
        // window.deleteElementsByClassName(puzzleElem, 'cursor')
        // window.deleteElementsByClassName(puzzleElem, 'line-1')
        // window.deleteElementsByClassName(puzzleElem, 'line-2')
        // window.deleteElementsByClassName(puzzleElem, 'line-3')
        puzzle.clearLines()

        if (path == null || path.length === 0) return // "drawing" an empty path is a shorthand for clearing the grid.

        // Extract the start data from the first path element
        let x: number = (path[0] as { x: number, y: number }).x;
        let y: number = (path[0] as { x: number, y: number }).y;
        let cell = puzzle.getCell(x, y) as LineCell;
        if (cell == null || cell.start !== true) throw Error('Path does not begin with a startpoint: ' + JSON.stringify(cell))

        const start = puzzleElem.getElementById('start_' + target + '_' + x + '_' + y);
        const symStart = puzzleElem.getElementById('symStart_' + target + '_' + x + '_' + y);
        Trace2.onTraceStart(puzzle, {'x': x, 'y': y}, puzzleElem, start, symStart)

        console.info('Drawing solution of length', path.length)
        for (let i = 1; i < path.length; i++) {
            cell = puzzle.getCell(x, y) as LineCell;

            let dx = 0;
            let dy = 0;
            if (path[i] === PATH_NONE) { // Reached an endpoint, move into it
                console.debug('Reached endpoint')
                if (cell.end === 'left') {
                    Trace2.onMove(-24, 0)
                } else if (cell.end === 'right') {
                    Trace2.onMove(24, 0)
                } else if (cell.end === 'top') {
                    Trace2.onMove(0, -24)
                } else if (cell.end === 'bottom') {
                    Trace2.onMove(0, 24)
                }
                if (i != path.length - 1) throw Error('Path contains ' + (path.length - 1 - i) + ' trailing directions')
                break
            } else if (path[i] === PATH_LEFT) {
                dx = -1
                cell.dir = 'left'
            } else if (path[i] === PATH_RIGHT) {
                dx = +1
                cell.dir = 'right'
            } else if (path[i] === PATH_TOP) {
                dy = -1
                cell.dir = 'top'
            } else if (path[i] === PATH_BOTTOM) {
                dy = +1
                cell.dir = 'down'
            } else {
                throw Error('Path element ' + (i - 1) + ' was not a valid path direction: ' + path[i])
            }

            console.debug('Currently at', x, y, cell, 'moving', dx, dy)

            x += dx
            y += dy
            // Unflag the cell, move into it, and reflag it
            cell.line = LINE_NONE
            Trace2.onMove(41 * dx, 41 * dy)
            if (puzzle.symmetry == null) {
                cell.line = LINE_BLACK
            } else {
                cell.line = LINE_BLUE
                const sym = puzzle.getSymmetricalPos(x, y);
                puzzle.updateCell2(sym.x, sym.y, 'line', LINE_YELLOW)
            }
        }
        cell = puzzle.getCell(x, y) as LineCell;
        if (cell == null || cell.end == null) throw Error('Path does not end at an endpoint: ' + JSON.stringify(cell))

        let rows = '   |';
        for (let x = 0; x < puzzle.width; x++) {
            rows += ('' + x).padEnd(5, ' ') + '|'
        }
        console.log(rows)
        for (let y = 0; y < puzzle.height; y++) {
            let output = ('' + y).padEnd(3, ' ') + '|';
            for (let x = 0; x < puzzle.width; x++) {
                cell = puzzle.grid[x][y] as LineCell;
                const dir = (cell != null && cell.dir != null ? cell.dir : '');
                output += dir.padEnd(5, ' ') + '|'
            }
            console.log(output)
        }
    }

    getSolutionIndex(pathList, solution) {
        for (let i = 0; i < pathList.length; i++) {
            const path = pathList[i];
            let x = path[0].x;
            let y = path[0].y;
            if (solution.grid[path[0].x][path[0].y].line === 0) continue

            let match = true;
            for (let j = 1; j < path.length; j++) {
                const cell = solution.grid[x][y];
                if (path[j] === PATH_NONE && cell.end != null) {
                    match = false
                    break
                } else if (path[j] === PATH_LEFT) {
                    if (cell.dir != 'left') {
                        match = false
                        break
                    }
                    x--
                } else if (path[j] === PATH_RIGHT) {
                    if (cell.dir != 'right') {
                        match = false
                        break
                    }
                    x++
                } else if (path[j] === PATH_TOP) {
                    if (cell.dir != 'top') {
                        match = false
                        break
                    }
                    y--
                } else if (path[j] === PATH_BOTTOM) {
                    if (cell.dir != 'bottom') {
                        match = false
                        break
                    }
                    y++
                }
            }
            if (match) return i
        }
        return -1
    }

}










