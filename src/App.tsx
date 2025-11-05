import "./App.css"
import {TheWitnessPuzzle} from "./TheWitnessPuzzle/TheWitnessPuzzle.tsx";
// import Demo from "./assets/Demo.tsx";

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

function App() {
    return (
        <div>
            <TheWitnessPuzzle theme={"theme-light"}/>
            <script type="text/javascript" src="assets/temp/validate.js"></script>
        </div>
    )
}

export default App
