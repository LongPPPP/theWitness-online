import "./App.css"
import TheWitnessPuzzle from "./components/TheWitnessPuzzle/TheWitnessPuzzle.tsx";
import {Decoration} from "./components/TheWitnessPuzzle/engine/generator/Panel.ts";
import {useMemo, useState} from "react";
import Randomizer from "./pages/Randomizer/Randomizer";

const consoleError = console.error;
const consoleWarn = console.warn
const consoleInfo = console.log
const consoleLog = console.log
const consoleDebug = console.log
const consoleGroup = console.group
const consoleGroupEnd = console.groupEnd

function setLogLevel(level) {
    console.error = function () {
    }
    console.warn = function () {
    }
    console.info = function () {
    }
    console.log = function () {
    }
    console.debug = function () {
    }
    console.group = function () {
    }
    console.groupEnd = function () {
    }

    if (level === 'none') return

    // Instead of throw, but still red flags and is easy to find
    console.error = consoleError
    if (level === 'error') return

    // Less serious than error, but flagged nonetheless
    console.warn = consoleWarn
    if (level === 'warn') return

    // Default visible, important information
    console.info = consoleInfo
    if (level === 'info') return

    // Useful for debugging (mainly validation)
    console.log = consoleLog
    if (level === 'log') return

    // Useful for serious debugging (mainly graphics/misc)
    console.debug = consoleDebug
    if (level === 'debug') return

    // Useful for insane debugging (mainly tracing/recursion)
    console.group = consoleGroup
    console.groupEnd = consoleGroupEnd
    if (level === 'spam') return
}

setLogLevel('info')

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

function App() {
    const [refresh, setRefresh] = useState(1)

    return (
        <div>
            {/*<BrowserSupportChecker/>*/}
            {/*<Challenge/>*/}
            {/*<Randomizer/>*/}
            <TheWitnessPuzzle
                theme={"theme-light"}
                width={4}
                height={4}
                symbols={symbols1}
                seed = {`${refresh}`}
            />
            <button onClick={() => {
                setRefresh(Math.random())
            }}>R</button>
        </div>
    )
}

export default App
