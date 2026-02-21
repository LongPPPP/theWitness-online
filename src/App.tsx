import "./App.css"
import Randomizer from "./pages/Randomizer.tsx";
import PuzzleConfigProvider from "./components/TheWitnessPuzzle/context/PuzzleConfigProvider.tsx";
import MultiPaperNav from "./components/MultiPaperNav.tsx";
import {Box, CssBaseline} from "@mui/material";
import {ThemeModeProvider} from "./components/contexts/ThemeContext.tsx";
import Test from "./pages/Test.tsx";

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
		<ThemeModeProvider>
			<PuzzleConfigProvider>
				<CssBaseline/>
				<MultiPaperNav/>
				<Box display={'flex'} minHeight={'100vh'} paddingTop={'44px'}>
					{/*<BrowserSupportChecker/>*/}
					{/*<Challenge/>*/}
					<Randomizer/>
					{/*<Test/>*/}
					{/*<MazeGenerator2/>*/}
				</Box>
			</PuzzleConfigProvider>
		</ThemeModeProvider>
	)
}

export default App
