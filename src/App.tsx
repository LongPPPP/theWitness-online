import "./App.css"
import PuzzleConfigProvider from "./components/TheWitnessPuzzle/context/PuzzleConfigProvider.tsx";
import MultiPaperNav from "./components/MultiPaperNav.tsx";
import {Box, CssBaseline} from "@mui/material";
import {ThemeModeProvider} from "./components/contexts/ThemeContext.tsx";
import Editor from "@/pages/Editor.tsx";
import Randomizer from "@/pages/Randomizer.tsx";
import {BrowserRouter as Router, Route, Routes} from "react-router-dom";
import Homepage from "@/pages/Homepage.tsx";

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
				<Router>
					{/* 导航栏全局显示 */}
					<MultiPaperNav/>
					<Box display={'flex'} minHeight={'100vh'} paddingTop={'44px'}>
						{/* 路由匹配区域 */}
						<Routes>
							<Route path="/" element={<Homepage/>}/>
							<Route path="/randomizer" element={<Randomizer/>}/>
							<Route path="/editor" element={<Editor/>}/>
							{/* 404 路由（可选） */}
							<Route path="*" element={<Editor/>}/>
						</Routes>
					</Box>
				</Router>
			</PuzzleConfigProvider>
		</ThemeModeProvider>
	)
}

export default App
