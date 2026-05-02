import "./App.css"
import PuzzleConfigProvider from "./components/TheWitnessPuzzle/context/PuzzleConfigProvider.tsx";
import MultiPaperNav from "./components/MultiPaperNav.tsx";
import {Box, CssBaseline} from "@mui/material";
import {ThemeModeProvider} from "./components/contexts/ThemeContext.tsx";
import Editor from "@/pages/Editor.tsx";
import Randomizer from "@/pages/Randomizer.tsx";
import {HashRouter as Router, Route, Routes, useLocation} from "react-router-dom";
import Homepage from "@/pages/Homepage.tsx";
import Test from "@/pages/Test.tsx";
import Test2 from "@/pages/Test2.tsx";

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

function AppContent() {
	// 现在 useLocation 在 Router 内部，不会报错了
	const location = useLocation();
	const isHomepage = location.pathname === '/';

	return (
		<>
			{/* 导航栏全局显示 */}
			<MultiPaperNav/>
			{/* 动态设置 paddingTop */}
			<Box
				display={'flex'}
				minHeight={'100vh'}
				paddingTop={isHomepage ? 0 : '44px'}
				position={isHomepage ? 'relative' : 'static'}
			>
				<Routes>
					<Route path="/" element={<Homepage/>}/>
					<Route path="/randomizer" element={<Randomizer/>}/>
					<Route path="/editor" element={<Editor/>}/>
					<Route path="*" element={<Test/>}/>
					<Route path="/test2" element={<Test2/>}/>
				</Routes>
			</Box>
		</>
	);
}

function App() {
	return (
		<ThemeModeProvider>
			<PuzzleConfigProvider>
				<CssBaseline/>
				<Router>
					<AppContent/>
				</Router>
			</PuzzleConfigProvider>
		</ThemeModeProvider>
	)
}

export default App
