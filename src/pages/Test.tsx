import TheWitnessPuzzle from "../components/TheWitnessPuzzle/TheWitnessPuzzle.tsx";
import {Decoration} from "../components/TheWitnessPuzzle/engine/generator/Panel.ts";
import {useState} from "react";
import PuzzleConfigProvider from "../components/TheWitnessPuzzle/context/PuzzleConfigProvider.tsx";

const symbols = [
    Decoration.Shape.Exit, 1,
    Decoration.Shape.Dot | Decoration.Color.Black, 3,
    Decoration.Shape.Gap, 5,
    Decoration.Shape.Start, 1
]

// const symbols = [
//     Decoration.Shape.Exit, 1,
//     Decoration.Shape.Poly | Decoration.Color.White, 2,
//     Decoration.Shape.Gap, 7,
//     Decoration.Shape.Start, 1,
//     Decoration.Shape.Negative, 1,
//     Decoration.Shape.Poly | Decoration.Color.Magenta | Decoration.Shape.Negative,1,
// ]

const symbols1 = [
    Decoration.Shape.Poly | Decoration.Shape.Can_Rotate | Decoration.Color.White, 2,
    // Decoration.Shape.Poly | Decoration.Shape.Can_Rotate | Decoration.Shape.Negative, 1,
    // Decoration.Shape.Stone | Decoration.Color.White, 3,
    // Decoration.Shape.Stone | Decoration.Color.Black, 1,
    Decoration.Shape.Eraser | Decoration.Color.White, 1,
]
//
// const symbols2 = [
//     Decoration.Shape.Stone | Decoration.Color.Black, 3,
//     Decoration.Shape.Stone | Decoration.Color.White, 2,
//     Decoration.Shape.Triangle | Decoration.Color.Orange, 5,
//     Decoration.Shape.Eraser | Decoration.Color.White, 1
// ];

const EMPTY_START_POINTS = [];
const EMPTY_END_POINTS = [];

// generatorConfig={{
//     seed: `${refresh}`,
//         symbols: symbols1
// }}

export default function Test() {
    const [refresh, setRefresh] = useState(1)
    const [showSolution, setShowSolution] = useState('none')
    const [theme, setTheme] = useState('theme-light')
    const [enableDrag, setEnableDrag] = useState(false)
    const [generatorConfig, setGeneratorConfig] = useState(undefined)
    const [b64c, setB64code] = useState(null)

    return (
        <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column'}}>
            <PuzzleConfigProvider>
                <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                    <TheWitnessPuzzle
                        theme={theme}
                        defaultWidth={4}
                        defaultHeight={4}
                        generatorConfig={generatorConfig}
                        showSolution={showSolution}
                        enableResizeDrag={enableDrag}
                        onPuzzleChange={(b64code) => {
                            setB64code(b64code)
                            console.info(b64code)
                        }}
                    />
                    <TheWitnessPuzzle
                        theme={'theme-dark'}
                        pIDBase64={'AQAAAAkJAAAYrwMxFAIDAzsAAAUCAwc7AiMUAgcHOwBgAAIACDsAYAABCAA7OwAAAAE'}
                    />
                </div>
            </PuzzleConfigProvider>
            <div style={{width: '432px'}}>
                <button onClick={() => {
                    setRefresh(Math.random())
                    console.info('toggled')
                }}>Refresh
                </button>
                <button onClick={() => {
                    setShowSolution(showSolution === 'none' ? 'single' : 'none')
                    console.info('toggled')
                }}>Test Solution
                </button>
                <button onClick={() => {
                    setTheme(theme === 'theme-light' ? 'theme-dark' : 'theme-light')
                    console.info('toggled')
                }}>Test Theme
                </button>
                <button onClick={() => {
                    setEnableDrag(!enableDrag)
                    console.info('toggled')
                }}>Test Drag
                </button>
                <button onClick={() => {
                    const cfg = {seed: undefined, symbols: symbols1};
                    setGeneratorConfig(cfg)
                    console.info('toggled')
                }}>Test Generate
                </button>
                <input type={"text"} value={b64c} onChange={(e) => setB64code(e.target.value)}/>
            </div>
        </div>
    )
}