import React, {useCallback, useEffect, useId, useMemo, useRef} from "react";
import {Generator} from "./engine/generator/Generator.ts";
import {Decoration, IntersectionFlags, Panel} from "./engine/generator/Panel.ts";
import {phasePath, phasePuzzle} from "./engine/phase.ts";
import {draw} from "./engine/puzzle/display2.ts";
import styles from "./style/Puzzle.module.css";
import "./style/animations.css";
import Puzzle from "./engine/puzzle/puzzle.ts";
import PuzzleSolver from "./engine/puzzle/solve.ts";
import type {ReturnMessage} from "./engine/generator/generator.worker.ts";
import * as Utils from "./engine/puzzle/utils.ts";
import SymbolSVG from "./SymbolSVG.tsx";


export interface GeneratorConfig {
    seed?: string;
    symbols: number[];
}

interface Props {
    defaultWidth: number;
    defaultHeight: number;
    theme?: 'theme-light' | 'theme-dark',
    volume?: number,
    sensitivity?: number,
    enableEndHints?: boolean,
    enableResizeDrag?: boolean,
    outerBackgroundColor?: string,
    backgroundColor?: string,
    puzzleGridBase64?: string,
    showSolution?: 'none' | 'all' | 'single',
    onSuccess?: (x: number, y: number) => void,
    generatorConfig?: GeneratorConfig,
}

type DragPosition = {
    x: number;
    y: number;
}

const EMPTY_FUNC = () => {
}

// All puzzle elements remain fixed, the edge you're dragging is where the new
// row/column is added. The endpoint will try to stay fixed, but may be re-oriented.
// In symmetry mode, we will preserve symmetry and try to guess how best to keep start
// and endpoints in sync with the original design.
function resizePuzzle(dx: number, dy: number, drag: 'left' | 'top' | 'right' | 'bottom', puzzle: Puzzle) {
    let validDirs;
    let sym;
    let cell;
    let x;
    let y;
    const newWidth = puzzle.width + dx;
    const newHeight = puzzle.height + dy;
    console.log('Resizing puzzle of size', puzzle.width, puzzle.height, 'to', newWidth, newHeight)

    if (puzzle.getSizeError(newWidth, newHeight) != null) return false
    let xOffset = (drag == 'left' ? dx : 0);
    const yOffset = (drag == 'top' ? dy : 0);
    // Symmetry pillar puzzles always expand horizontally in both directions.
    if (puzzle.pillar && puzzle.symmetry != null) xOffset /= 2
    console.log('Shifting contents by', xOffset, yOffset, 'with drag', drag)

    // Determine if the cell at x, y should be copied from the original.
    // For non-symmetrical puzzles, the answer is always 'no' -- all elements should be directly copied across.
    // For non-pillar symmetry puzzles, we should persist all elements on the half the puzzle which is furthest from the dragged edge.
    // This will keep the puzzle contents stable as we add a row.
    //
    // The exception to this rule is when we expand: We are creating one new row or column which has no source location.
    // For example, a horizontal puzzle with width=3 gets expanded to newWidth=5 (from the right edge), the column at x=2 is new --
    // it is not being copied nor persisted. This is especially apparent in rotational symmetry puzzles.
    const PERSIST = 0;
    const COPY = 1;
    const CLEAR = 2;

    // x, y are locations on the new grid and should thus be compared to newWidth and newHeight.
    function shouldCopyCell(x, y) {
        if (puzzle.symmetry == null) return PERSIST
        if (x % 2 === 1 && y % 2 === 1) return PERSIST // Always copy cells

        // Symmetry copies one half of the grid to the other, and selects the far side from
        // the dragged edge to be the master copy. This is so that drags feel 'smooth' wrt
        // internal elements, i.e. it feels like dragging away is just inserting a column/row.
        if (!puzzle.pillar) {
            if (puzzle.symmetry.x) { // Normal Horizontal Symmetry
                if (dx > 0 && x == (newWidth - 1) / 2) return CLEAR
                if (drag == 'right' && x >= (newWidth + 1) / 2) return COPY
                if (drag == 'left' && x <= (newWidth - 1) / 2) return COPY
            }
            if (puzzle.symmetry.y) { // Normal Vertical Symmetry
                if (dy > 0 && y == (newHeight - 1) / 2) return CLEAR
                if (drag == 'bottom' && y >= (newHeight + 1) / 2) return COPY
                if (drag == 'top' && y <= (newHeight - 1) / 2) return COPY
            }
        } else { // Pillar symmetries
            if (puzzle.symmetry.x && !puzzle.symmetry.y) { // Pillar Horizontal Symmetry
                if (dx !== 0) {
                    if (x < newWidth * 1 / 4) return COPY
                    if (x === newWidth * 1 / 4) return CLEAR
                    if (x === newWidth * 3 / 4) return CLEAR
                    if (x >= newWidth * 3 / 4) return COPY
                }
                // Vertical resizes just persist
            }

            if (!puzzle.symmetry.x && puzzle.symmetry.y) { // Pillar Vertical Symmetry
                if (dx !== 0 && drag == 'right' && x >= newWidth / 2) return COPY
                if (dx !== 0 && drag == 'left' && x < newWidth / 2) return COPY
                if (dy !== 0 && drag == 'bottom') {
                    if (y > (newHeight - 1) / 2) return COPY
                    if (y === (newHeight - 1) / 2 && x > newWidth / 2) return COPY
                }
                if (dy !== 0 && drag == 'top') {
                    if (y < (newHeight - 1) / 2) return COPY
                    if (y === (newHeight - 1) / 2 && x < newWidth / 2) return COPY
                }
            }

            if (puzzle.symmetry.x && puzzle.symmetry.y) { // Pillar Rotational Symmetry
                if (dx !== 0) {
                    if (x < newWidth * 1 / 4) return COPY
                    if (x === newWidth * 1 / 4 && y < (newHeight - 1) / 2) return COPY
                    if (x === newWidth * 3 / 4 && y > (newHeight - 1) / 2) return COPY
                    if (x > newWidth * 3 / 4) return COPY
                }
                if (dy !== 0 && drag == 'bottom' && y > (newHeight - 1) / 2) return COPY
                if (dy !== 0 && drag == 'top' && y < (newHeight - 1) / 2) return COPY
            }

            if (!puzzle.symmetry.x && !puzzle.symmetry.y) { // Pillar Two Lines
                if (dx !== 0 && drag == 'right' && x >= newWidth / 2) return COPY
                if (dx !== 0 && drag == 'left' && x < newWidth / 2) return COPY
                if (dy !== 0 && drag == 'bottom' && y >= (newHeight - 1) / 2) return COPY
                if (dy !== 0 && drag == 'top' && y < (newHeight - 1) / 2) return COPY
            }
        }

        return PERSIST
    }

    // We don't call new Puzzle here so that we can persist extended puzzle attributes (pillar, symmetry, etc)
    const oldPuzzle = puzzle.clone();
    puzzle.newGrid(newWidth, newHeight)

    const debugGrid = [];
    for (y = 0; y < puzzle.height; y++) debugGrid[y] = ''

    for (x = 0; x < puzzle.width; x++) {
        for (y = 0; y < puzzle.height; y++) {
            cell = {type: 'nonce'};
            // In case the source location was empty / off the grid, we start with a stand-in empty object.
            if (x % 2 === 0 || y % 2 === 0) cell = {'type': 'line'}

            switch (shouldCopyCell(x, y)) {
                case PERSIST:
                    debugGrid[y] += 'P'
                    if (oldPuzzle._safeCell(x - xOffset, y - yOffset)) {
                        cell = oldPuzzle.grid[x - xOffset][y - yOffset]
                    }
                    console.debug('At', x - xOffset, y - yOffset, 'persisting', JSON.stringify(cell))
                    break
                case COPY: // We're copying from the *old* puzzle, not the new one. We don't care what order we copy in.
                {
                    debugGrid[y] += 'O'
                    sym = puzzle.getSymmetricalPos(x, y);
                    let symCell = null;
                    if (oldPuzzle._safeCell(sym.x - xOffset, sym.y - yOffset)) {
                        symCell = oldPuzzle.grid[sym.x - xOffset][sym.y - yOffset]
                        cell.end = puzzle.getSymmetricalDir(symCell.end)
                        cell.start = symCell.start
                    }
                    console.debug('At', x - xOffset, y - yOffset, 'copying', JSON.stringify(symCell), 'from', sym.x - xOffset, sym.y - yOffset)
                    break
                }
                case CLEAR:
                    debugGrid[y] += 'C'
                    cell = {'type': 'line'}
                    console.debug('At', x - xOffset, y - yOffset, 'clearing cell')
                    break
            }

            puzzle.grid[x][y] = cell
        }
    }

    console.log('Resize grid actions:')
    for (const row of debugGrid) console.log(row)

    // Check to make sure that all endpoints are still pointing in valid directions.
    for (x = 0; x < puzzle.width; x++) {
        for (y = 0; y < puzzle.height; y++) {
            cell = puzzle.grid[x][y];
            if (cell == null) continue
            if (cell.end == null) continue

            if (puzzle.symmetry == null) {
                validDirs = puzzle.getValidEndDirs(x, y);
                if (validDirs.includes(cell.end)) continue

                if (validDirs.length === 0) {
                    console.log('Endpoint at', x, y, 'no longer fits on the grid')
                    puzzle.grid[x][y].end = null
                } else {
                    console.log('Changing direction of endpoint', x, y, 'from', cell.end, 'to', validDirs[0])
                    puzzle.grid[x][y].end = validDirs[0]
                }
            } else {
                sym = puzzle.getSymmetricalPos(x, y);
                let symDir = puzzle.getSymmetricalDir(cell.end);
                validDirs = puzzle.getValidEndDirs(x, y);
                const validSymDirs = puzzle.getValidEndDirs(sym.x, sym.y);
                if (validDirs.includes(cell.end) && validSymDirs.includes(symDir)) continue

                while (validDirs.length > 0) {
                    const dir = validDirs.pop();
                    symDir = puzzle.getSymmetricalDir(dir)
                    if (validDirs.includes(dir) && validSymDirs.includes(symDir)) {
                        console.log('Changing direction of endpoint', x, y, 'from', cell.end, 'to', dir)
                        puzzle.grid[x][y].end = dir
                        puzzle.grid[sym.x][sym.y].end = symDir
                        break
                    }
                }
                if (validDirs.length === 0 || validSymDirs.length === 0) {
                    console.log('Endpoint at', x, y, 'no longer fits on the grid')
                    puzzle.grid[x][y].end = null
                    puzzle.grid[sym.x][sym.y].end = null
                }
            }
        }
    }
    return true
}

function panelToBase64(panel: Panel): string {
    // const str = JSON.stringify(Panel.PanelToObject(panel))
    // console.warn( btoa(encodeURIComponent(str)))
    const str = panel.Serialize()
    console.warn( btoa(encodeURIComponent(str)))
    return btoa(encodeURIComponent(str))
}

function base64ToPanel(base64: string): Panel {
}

const TheWitnessPuzzle = (
    {
        defaultWidth,
        defaultHeight,
        outerBackgroundColor,
        backgroundColor,
        theme = 'theme-light',
        volume = 1,
        sensitivity = 0.7,
        enableEndHints = true,
        enableResizeDrag = false,
        showSolution = 'none',
        onSuccess = EMPTY_FUNC,
        generatorConfig = undefined,
    }: Props
) => {
    const uuid = "puzzle_" + useId()
    const width = useRef<number>(defaultWidth)
    const height = useRef<number>(defaultHeight)
    const themeRef = useRef<HTMLDivElement>(null)
    const puzzleRef = useRef<SVGSVGElement>(null)
    const generatorWorker = useRef<Worker>(null)
    const generator = useRef<Generator>(null) // generator 生成 panel
    const panel = useRef<Panel>(null) // panel 转化成 puzzle; panel可以理解为puzzle的原型
    const puzzle = useRef<Puzzle>(null) // puzzle 用于渲染
    const solution = useRef<Array<(number | { x: number, y: number })>[]>(null)
    const dragging = useRef<DragPosition | null>(null);

    // init puzzle
    useEffect(() => {
        // puzzle.current = new Puzzle(4, 4)
        panel.current = new Panel(0x018AF, 4*2+1, 4*2+1, 8, 0, 0, 8)
        for (let x = 0; x < panel.current.Width; x++) {
            for (let y = 0; y < panel.current.Height; y++) {
                if((x&1) === 0 && (y&1) === 0) {
                    panel.current.Grid[x][y] |= IntersectionFlags.INTERSECTION
                }
            }
        }
        puzzle.current = phasePuzzle(panel.current)
        // puzzleRef.current.innerHTML = " "
        draw(puzzle.current, uuid)
    }, [uuid]);

    // init worker / if worker is not supported, then use generator in main process
    useEffect(() => {
        if(!generatorConfig) return;

        const seed = generatorConfig.seed;
        if (typeof window !== 'undefined' && 'Worker' in window) {
            generatorWorker.current = new Worker(new URL('./engine/generator/generator.worker.ts', import.meta.url),
                {type: 'module'});

            generatorWorker.current.postMessage({
                type: 'new Generator',
                args: seed,
            })
        } else {
            generator.current = new Generator(seed);
        }
    }, [generatorConfig])

    // generate random puzzle
    useEffect(() => {
        if(!generatorConfig) return;
        if (!width.current || !height.current) return;
        const symbols = generatorConfig.symbols;
        if (symbols.length > 18) {
            console.error("the num of symbols cannot more than 9")
        }
        if (generatorWorker.current != undefined) {
            generatorWorker.current.postMessage({
                type: 'setGridSize',
                args: [width.current, height.current],
            })

            generatorWorker.current.postMessage({
                type: "generate",
                args: symbols
            })

            // generatorWorker.current.postMessage({
            //     type: "DEBUG_printPath",
            // })

            generatorWorker.current.onmessage = (event) => {
                const data = event.data as ReturnMessage;
                if (data.type === "error") {
                    console.error(event.data.message)
                } else if (data.type === "success") {
                    puzzleRef.current.innerHTML = " "
                    console.info(data.panel)
                    panel.current = Panel.ObjectToPanel(data.panel);
                    puzzle.current = phasePuzzle(panel.current)
                    // puzzle.current.config = puzzleConfig.current;
                    draw(puzzle.current, uuid)
                    solution.current = [data.path];
                    // PuzzleSolver.drawPath(puzzle.current, solution.current[0], puzzleRef.current);
                }
            }
        } else {
            panel.current = new Panel(0x018AF, width.current, height.current, 0, 0, 0, 0)
            puzzleRef.current.innerHTML = " "
            generator.current.setGridSize(width.current, height.current);
            generator.current.generate(
                panel.current, symbols[0], symbols[1], symbols[2],
                symbols[3], symbols[4], symbols[5], symbols[6],
                symbols[7], symbols[8], symbols[9], symbols[10],
                symbols[11], symbols[12], symbols[13], symbols[14],
                symbols[15], symbols[16], symbols[17]);
            puzzle.current = phasePuzzle(panel.current)
            // puzzle.current.config = puzzleConfig.current;
            draw(puzzle.current, uuid)
            solution.current = [phasePath(generator.current.Path, generator.current.Starts)]
        }

    }, [width, height, uuid, generatorConfig]);

    // puzzle config
    useEffect(() => {
        if (themeRef.current) {
            if (outerBackgroundColor != undefined) themeRef.current.style.setProperty('--outer-background', outerBackgroundColor)
            if (backgroundColor != undefined) themeRef.current.style.setProperty('--background', backgroundColor)
        }

        if (puzzle.current) {
            puzzle.current.config = {
                ...puzzle.current.config,
                volume,
                sensitivity,
                enableEndHints,
                onSuccess,
            }
        }

    }, [backgroundColor, enableEndHints, onSuccess, outerBackgroundColor, sensitivity, volume]);

    // 显示 solution
    useEffect(() => {
        if (!puzzle.current) {
            console.warn('puzzle is not ready yet')
            return;
        }
        if (showSolution === 'none') {
            const puzzleElem = puzzleRef.current;
            Utils.deleteElementsByClassName(puzzleElem, 'cursor')
            Utils.deleteElementsByClassName(puzzleElem, 'end-hint')
            Utils.deleteElementsByClassName(puzzleElem, 'line-1')
            Utils.deleteElementsByClassName(puzzleElem, 'line-2')
            Utils.deleteElementsByClassName(puzzleElem, 'line-3')
            puzzle.current.clearLines()
            return;
        } else if (showSolution === 'single') {
            if (solution.current) {
                PuzzleSolver.drawPath(puzzle.current, solution.current[0], puzzleRef.current);
                return;
            } else {
                // 若没有路径则自动计算一条。
                autoSolve()
                PuzzleSolver.drawPath(puzzle.current, solution.current[0], puzzleRef.current);
                return;
            }
        }
    }, [showSolution])

    // 当puzzle变化的时候重新绘制puzzle


    const dragStart = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        event.preventDefault()
        dragging.current = {
            x: event.pageX || event.clientX || null,
            y: event.pageY || event.clientY || null
        };
        console.log('Drag started at', dragging.current.x, dragging.current.y);
        const elem = event.currentTarget;

        const dragMove = (event: PointerEvent) => {
            if (event.buttons === 0) {
                dragEnd();
                return;
            }
            if (!dragging.current) return;

            const newDragging: DragPosition = {
                x: event.pageX || event.clientX || null,
                y: event.pageY || event.clientY || null
            };

            if (!elem || !(elem as HTMLElement).id) return;

            const elemId = (elem as HTMLElement).id;
            let dx = 0;
            let dy = 0;

            if (elemId.includes('left')) {
                dx = dragging.current.x - newDragging.x;
            } else if (elemId.includes('right')) {
                dx = newDragging.x - dragging.current.x;
            }
            if (elemId.includes('top')) {
                dy = dragging.current.y - newDragging.y;
            } else if (elemId.includes('bottom')) {
                dy = newDragging.y - dragging.current.y;
            }

            // console.warn(dx,dy)

            const xLim = 40;
            let xScale = 2;
            if (puzzle.current.symmetry != null && puzzle.current.pillar === true) {
                xScale = 4;
            }

            let yLim = 40;
            if (puzzle.current.height >= 9) {
                yLim = 60;
            }
            const yScale = 2;

            while (Math.abs(dx) >= xLim) {
                const drag = (elemId.includes('right') ? 'right' : 'left');
                if (!resizePuzzle(xScale * Math.sign(dx), 0, drag, puzzle.current)) break;
                draw(puzzle.current, uuid);
                width.current += xScale * Math.sign(dx) / 2; // 需要除以二（原本算上道路了）
                dx -= Math.sign(dx) * xLim;
                dragging.current.x = newDragging.x;
            }

            while (Math.abs(dy) >= yLim) {
                const drag = (elemId.includes('top') ? 'top' : 'bottom');
                if (!resizePuzzle(0, yScale * Math.sign(dy), drag, puzzle.current)) break;
                draw(puzzle.current, uuid);
                height.current += yScale * Math.sign(dy) / 2;  // 需要除以二（原本算上道路了）
                dy -= Math.sign(dy) * yLim;
                dragging.current.y = newDragging.y;
            }
        };

        const dragEnd = () => {
            console.log('Drag ended');
            dragging.current = null;

            // 移除事件监听器
            document.removeEventListener('pointermove', dragMove);
            document.removeEventListener('pointerup', dragEnd);
        };

        // 添加事件监听器
        document.addEventListener('pointermove', dragMove);
        document.addEventListener('pointerup', dragEnd);
    }, [uuid]); // 添加必要的依赖项
    // 显示 drag size svg
    const sizeDrags = useMemo(() => {
        if (enableResizeDrag) {
            return (
                <>
                    <div id="resize-topleft"
                         onPointerDown={dragStart}
                         style={{
                             position: "absolute", cursor: "nwse-resize",
                             left: -10, top: -10, height: "30px", width: "30px",
                             display: 'flex'
                         }}></div>
                    <div id="resize-top"
                         onPointerDown={dragStart}
                         style={{
                             position: "absolute", cursor: "ns-resize",
                             left: 10, top: -10, right: 10, height: "30px",
                             display: 'flex'
                         }}>
                        <SymbolSVG defaultSymbol={{type: 'drag', rot: 0, width: 22, height: 6}} style={{
                            width: '22px',
                            height: '6px',
                            margin: 'auto',
                        }}/></div>
                    <div id="resize-topright"
                         onPointerDown={dragStart}
                         style={{
                             position: "absolute", cursor: "nesw-resize",
                             top: -10, right: -10, height: "30px", width: "30px",
                             display: 'flex'
                         }}></div>
                    <div id="resize-right"
                         onPointerDown={dragStart}
                         style={{
                             position: "absolute", cursor: "ew-resize",
                             top: 0, right: -10, bottom: 0, width: "30px",
                             display: 'flex'
                         }}>
                        <SymbolSVG defaultSymbol={{type: 'drag', rot: 1, width: 6, height: 22}} style={{
                            width: '6px',
                            height: '22px',
                            margin: 'auto',
                        }}/></div>
                    <div id="resize-bottomright"
                         onPointerDown={dragStart}
                         style={{
                             position: "absolute", cursor: "nwse-resize",
                             right: -10, bottom: -10, height: "30px", width: "30px",
                             display: 'flex'
                         }}></div>
                    <div id="resize-bottom"
                         onPointerDown={dragStart}
                         style={{
                             position: "absolute", cursor: "ns-resize",
                             right: 10, bottom: -10, left: 10, height: "30px",
                             display: 'flex'
                         }}>
                        <SymbolSVG defaultSymbol={{type: 'drag', rot: 0, width: 22, height: 6}} style={{
                            width: '22px',
                            height: '6px',
                            margin: 'auto',
                        }}/></div>
                    <div id="resize-bottomleft"
                         onPointerDown={dragStart}
                         style={{
                             position: "absolute", cursor: "nesw-resize",
                             bottom: -10, left: -10, height: "30px", width: "30px",
                             display: 'flex'
                         }}></div>
                    <div id="resize-left"
                         onPointerDown={dragStart}
                         style={{
                             position: "absolute", cursor: "ew-resize",
                             bottom: 10, left: -10, top: 10, width: "30px",
                             display: 'flex'
                         }}>
                        <SymbolSVG defaultSymbol={{type: 'drag', rot: 1, width: 6, height: 22}} style={{
                            width: '6px',
                            height: '22px',
                            margin: 'auto',
                        }}/></div>
                </>
            )
        }
    }, [dragStart, enableResizeDrag]);

    function autoSolve() {
        if (puzzle.current) {
            const puzzle_1 = puzzle.current;

            const puzzleSolver = new PuzzleSolver(puzzle_1)
            const f1 = () => {
            }
            const f2 = () => {
            }
            solution.current = puzzleSolver.solve(f1, f2);
        }
    }

    return (
        <div className={styles.theme}>
            <div ref={themeRef} className={`${styles[theme]}`}>
                <div style={{position: "relative"}}>
                    {sizeDrags}
                    <svg ref={puzzleRef} id={uuid} style={{display: 'block'}}></svg>
                </div>
            </div>
            <button onClick={() => {
                panelToBase64(panel.current)
                console.info('transformed')
            }}>Test Obj
            </button>
        </div>
    )
}

export default TheWitnessPuzzle;