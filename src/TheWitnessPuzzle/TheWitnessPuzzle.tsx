import {useEffect, useId, useRef} from "react";
import {Generator} from "./engine/generator/Generator.ts";
import {Panel} from "./engine/generator/Panel.ts";
import {phasePuzzle} from "./engine/phase.ts";
import {draw} from "./engine/puzzle/display2.ts";
import styles from "./style/Puzzle.module.css";
import "./style/animations.css";
import Puzzle, {type PuzzleConfig} from "./engine/puzzle/puzzle.ts";
import PuzzleSolver from "./engine/puzzle/solve.ts";

interface Props {
    width: number;
    height: number;
    startPoints?: Array<{ x: number; y: number }>;
    endPoints?: Array<{ x: number; y: number; dir: "left" | "right" | "top" | "bottom" }>
    symbols?: number[];
    seed?: string;
    theme?: 'theme-light' | 'theme-dark',
    volume?: number,
    sensitivity?: number,
    enableEndHints?: boolean,
    outerBackgroundColor?: string,
    backgroundColor?: string,
    onSuccess?: (x: number, y: number) => void,
}


export default function TheWitnessPuzzle(
    {
        width,
        height,
        startPoints = [],
        endPoints = [],
        symbols,
        seed,
        outerBackgroundColor,
        backgroundColor,
        theme = 'theme-light',
        volume = 1,
        sensitivity = 0.7,
        enableEndHints = true,
        onSuccess = () => {
        },
    }: Props) {
    const uuid = "puzzle_" + useId()
    const themeRef = useRef<HTMLDivElement>(null)
    const puzzleRef = useRef<SVGSVGElement>(null)
    const generatorWorker = useRef<Worker>(null)
    const generator = useRef<Generator>(null)
    const panel = useRef<Panel>(null)
    const puzzle = useRef<Puzzle>(null)
    const puzzleConfig = useRef<PuzzleConfig>(null)

    // init components
    useEffect(() => {
        if (outerBackgroundColor != undefined) themeRef.current.style.setProperty('--outer-background', outerBackgroundColor)
        if (backgroundColor != undefined) themeRef.current.style.setProperty('--background', backgroundColor)

        puzzleRef.current.innerHTML = " "
        const puzzle = new Puzzle(width, height);

        for (const start of startPoints) {
            puzzle.markStart(start.x, start.y);
        }

        for (const end of endPoints) {
            puzzle.markEnd(end.x, end.y, end.dir);
        }

        draw(puzzle, uuid)
        puzzle.config = puzzleConfig.current;

    }, [backgroundColor, endPoints, height, outerBackgroundColor, startPoints, uuid, width]);

    // init worker / if worker is not supported, then use generator in main process
    useEffect(() => {
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
    }, [])

    // generate random puzzle
    useEffect(() => {
        if (symbols.length > 18) {
            console.error("the num of symbols cannot more than 9")
        }
        if (generatorWorker.current != undefined) {
            generatorWorker.current.postMessage({
                type: 'setGridSize',
                args: [width, height],
            })

            generatorWorker.current.postMessage({
                type: "generate",
                args: symbols
            })

            generatorWorker.current.onmessage = (event) => {
                if (event.data.type === "error") {
                    console.error(event.data.message)
                } else if (event.data.type === "success") {
                    puzzleRef.current.innerHTML = " "
                    panel.current = Panel.ObjectToPanel(event.data.panel);
                    puzzle.current = phasePuzzle(panel.current)
                    puzzle.current.config = puzzleConfig.current;
                    draw(puzzle.current, uuid)
                }
            }
        } else {
            panel.current = new Panel(0x018AF, width, height, 0, 0, 0, 0)
            puzzleRef.current.innerHTML = " "
            generator.current.setGridSize(width, height);
            console.time("suspectFunction");
            generator.current.generate(panel.current, symbols[0], symbols[1], symbols[2], symbols[3], symbols[4], symbols[5], symbols[6], symbols[7], symbols[8], symbols[9], symbols[10], symbols[11], symbols[12], symbols[13], symbols[14], symbols[15], symbols[16], symbols[17]);
            console.timeEnd("suspectFunction");
            puzzle.current = phasePuzzle(panel.current)
            puzzle.current.config = puzzleConfig.current;
            draw(puzzle.current, uuid)
        }

    }, [width, height, symbols, uuid]);

    // puzzle config
    useEffect(() => {
        puzzleConfig.current = {
            volume,
            sensitivity,
            enableEndHints,
            wittleTracing: true,
            onSuccess,
        }
    }, [enableEndHints, onSuccess, sensitivity, volume]);

    function autoSolve() {
        if (puzzle.current) {
            const puzzle_1 = puzzle.current;

            const puzzleSolver = new PuzzleSolver(puzzle_1)
            const f1 = () => {
            }
            const f2 = () => {
            }
            const solution = puzzleSolver.solve(f1, f2)[0];
            PuzzleSolver.drawPath(puzzle_1, solution, puzzleRef.current);
            // generatorWorker.current.postMessage({
            //     type: 'getPath'
            // })
        }
    }


    return (
        <div className={styles.theme}
             style={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
            <div ref={themeRef} className={styles[theme]}>
                <div className="q">
                    <svg ref={puzzleRef} id={uuid}></svg>
                </div>
            </div>
            <button onClick={autoSolve}>Answer</button>
        </div>
    )
}