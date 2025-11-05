import ConfigService, {type Config} from "./config.ts";
import {useEffect, useRef} from "react";
import {Generator} from "./engine/generator/Generator.ts";
import {Decoration, Panel} from "./engine/generator/Panel.ts";
import {phasePuzzle} from "./engine/phase.ts";
import {draw} from "./engine/puzzle/display2.ts";
import styles from "./style/Puzzle.module.css";
import "./style/animations.css";

interface Props extends Config {

}

export function TheWitnessPuzzle(
    {
        theme = 'theme-light',
        volume = 1,
        sensitivity = 0.7,
        allowEndHints = true,
    }: Props) {
    const puzzleRef = useRef<SVGSVGElement>(null)
    const generator = useRef<Generator>(null)
    const panel = useRef<Panel>(null)
    const generatorWorker = useRef<Worker>(null)

    ConfigService.getInstance().setConfig({
        volume,
        theme,
        sensitivity,
        allowEndHints,
        wittleTracing: true,
    });

    // init worker
    useEffect(() => {
        generatorWorker.current = new Worker(new URL('./engine/generator/generator.worker.ts', import.meta.url),
            {type: 'module'});

        generatorWorker.current.postMessage({
            type: 'new Generator',
            args: ['bbc'],
        })
    }, [])

    // if worker is not supported, then use generator in main process
    useEffect(() => {
        generator.current = new Generator('bbc');
        panel.current = new Panel(0x018AF, 9, 11, 0, 6, 6, 0)
    }, []);

    function test() {
        if (puzzleRef.current) {
            puzzleRef.current.innerHTML = " "
            generator.current.setGridSize(4, 5);
            console.time("suspectFunction");
            generator.current.generate(panel.current, Decoration.Shape.Exit, 1, Decoration.Shape.Stone | Decoration.Color.Black, 3, Decoration.Shape.Stone | Decoration.Color.White, 5, Decoration.Shape.Stone | Decoration.Color.Green, 4, Decoration.Shape.Gap, 5, Decoration.Shape.Start, 1);
            console.timeEnd("suspectFunction");
            const puzzle = phasePuzzle(panel.current)
            draw(puzzle)

        }
    }

    function test2() {
        if (puzzleRef.current) {

            // generatorWorker.current.postMessage({
            //     type: 'new Generator',
            //     args: ['bbc'],
            // })

            generatorWorker.current.postMessage({
                type: 'setGridSize',
                args: [4, 4],
            })

            generatorWorker.current.postMessage({
                type: "generate",
                args: [Decoration.Shape.Exit, 1, Decoration.Shape.Stone | Decoration.Color.Black, 3, Decoration.Shape.Stone | Decoration.Color.White, 5, Decoration.Shape.Stone | Decoration.Color.Green, 4, Decoration.Shape.Gap, 5, Decoration.Shape.Start, 1]
            })

            generatorWorker.current.onmessage = (event) => {
                if (event.data.type === "error") {
                    console.error(event.data.message)
                } else if (event.data.type === "success") {
                    puzzleRef.current.innerHTML = " "
                    panel.current = Panel.ObjectToPanel(event.data.panel);
                    const puzzle = phasePuzzle(panel.current)
                    draw(puzzle)
                }
            }
        }
    }

    return (
        <>
            <div className={styles.theme}
                 style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>
                <div className={styles[ConfigService.getInstance().Config.theme]}>
                    <div className="q">
                        <svg ref={puzzleRef} id="puzzle"></svg>
                    </div>
                </div>
                <button onClick={test}>NEXT</button>
                <button onClick={test2}>NEXT2</button>
            </div>
            {/*<div className={"rotator-1 "}></div>*/}
        </>
    )
}