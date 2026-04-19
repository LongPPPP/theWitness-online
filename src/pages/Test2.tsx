import React from "react";
import {Generator} from "@/components/TheWitnessPuzzle/engine/generator/Generator.ts";
import {Decoration, IntersectionFlags, Panel} from "@/components/TheWitnessPuzzle/engine/generator/Panel.ts";

export default function Test2() {
	return (
		<div style={{fontFamily: 'sans-serif', padding: '1.5rem'}}>
			<BallDemo/>
		</div>
	)
}

function createPanel(width: number, height: number, symmetry: Panel.Symmetry) {
	let [startX, startY] = [0, 0];
	let [endX, endY] = [0, height * 2];
	const isPillar = Panel.isPillar(symmetry)

	if (isPillar && width % 2 === 1) {
		throw new Error('若symmetry含有Pillar，则必须保证width为偶数')
	}

	if (symmetry === Panel.Symmetry.Horizontal) {
		[startX, startY] = [width * 2, 0]
	} else if (isPillar) {
		[startX, startY] = [width - 2, 0];
		// 在旋转对称的时候使起点和终点错开放置
		if (symmetry === Panel.Symmetry.PillarRotational) {
			[endX, endY] = [width + 2, height * 2];
		} else {
			[endX, endY] = [width - 2, height * 2];
		}

	}
	const panel = new Panel(0x018AF, width * 2 + 1, height * 2 + 1, startX, startY, endX, endY, symmetry)
	for (let x = 0; x < panel.Width; x++) {
		for (let y = 0; y < panel.Height; y++) {
			if ((x & 1) === 0 && (y & 1) === 0) {
				panel.Grid[x][y] |= IntersectionFlags.INTERSECTION
			}
		}
	}
	return panel;
}

const symbols = [
	Decoration.Shape.Stone | Decoration.Color.Yellow, 3,
	Decoration.Shape.Poly | Decoration.Shape.Negative | Decoration.Color.Black, 1,
	Decoration.Shape.Poly | Decoration.Color.Black, 3,
	Decoration.Shape.Star | Decoration.Color.Green, 2,
	Decoration.Shape.Star | Decoration.Color.Orange, 2,
]

// ↓ 把你的同步代码放在这里
function mySyncCode() {
	const panel = createPanel(6, 6, 0);
	const Gen = new Generator();
	Gen.setGridSize(6, 6);
	Gen.generate(
		panel, symbols[0], symbols[1], symbols[2],
		symbols[3], symbols[4], symbols[5], symbols[6],
		symbols[7], symbols[8], symbols[9], symbols[10],
		symbols[11], symbols[12], symbols[13], symbols[14],
		symbols[15], symbols[16], symbols[17]);
	console.warn('success')
}

function BallDemo() {
	const ballRef = React.useRef(null)
	const animIdRef = React.useRef(null)
	const animStartRef = React.useRef(null)
	const lastTsRef = React.useRef(null)
	const fpsSmoothRef = React.useRef(60)

	const [fpsDisplay, setFpsDisplay] = React.useState(60)
	const [log, setLog] = React.useState('点击按钮执行你的同步代码，观察小球是否卡顿')

	const addLog = (msg) => {
		const now = new Date().toLocaleTimeString('zh', {hour12: false})
		setLog(`[${now}] ${msg}`)
	}

	const animateBall = React.useCallback((ts) => {
		if (!animStartRef.current) animStartRef.current = ts
		const t = ((ts - animStartRef.current) % 2000) / 2000
		const x = t < 0.5 ? t * 2 : 2 - t * 2
		if (ballRef.current) {
			const trackW = ballRef.current.parentElement.clientWidth - 52
			ballRef.current.style.left = Math.round(x * trackW) + 'px'
		}
		if (lastTsRef.current !== null) {
			const delta = ts - lastTsRef.current
			const instantFps = 1000 / delta
			fpsSmoothRef.current = fpsSmoothRef.current * 0.85 + instantFps * 0.15
			setFpsDisplay(Math.round(fpsSmoothRef.current))
		}
		lastTsRef.current = ts
		animIdRef.current = requestAnimationFrame(animateBall)
	}, [])

	React.useEffect(() => {
		animIdRef.current = requestAnimationFrame(animateBall)
		return () => cancelAnimationFrame(animIdRef.current)
	}, [animateBall])

	const handleRun = () => {
		addLog('执行中...')
		setTimeout(() => {
			const t0 = performance.now()
			mySyncCode()
			addLog(`完成，耗时 ${Math.round(performance.now() - t0)} ms`)
		}, 50)
	}

	const fpsColor = fpsDisplay >= 50 ? '#7F77DD' : fpsDisplay >= 30 ? '#BA7517' : '#E24B4A'
	const fpsPct = Math.min(100, (fpsDisplay / 60) * 100)

	return (
		<div style={{width: '100vw'}}>
			{/* 小球轨道 */}
			<div style={{
				height: 80,
				background: '#f5f5f5',
				borderRadius: 12,
				position: 'relative',
				overflow: 'hidden',
				marginBottom: 20,
				border: '0.5px solid #ddd'
			}}>
				<div ref={ballRef} style={{
					width: 52,
					height: 52,
					borderRadius: '50%',
					background: '#7F77DD',
					position: 'absolute',
					top: 14
				}}/>
			</div>

			{/* FPS */}
			<div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20}}>
				<span style={{fontSize: 13, color: '#888', minWidth: 36}}>FPS</span>
				<span style={{fontSize: 22, fontWeight: 500, minWidth: 52}}>{fpsDisplay}</span>
				<div style={{flex: 1, height: 6, background: '#eee', borderRadius: 99, overflow: 'hidden'}}>
					<div style={{
						height: '100%',
						width: `${fpsPct}%`,
						background: fpsColor,
						borderRadius: 99,
						transition: 'width 0.2s, background 0.2s'
					}}/>
				</div>
			</div>

			{/* 按钮 */}
			<button onClick={handleRun} style={{
				fontSize: 13,
				padding: '6px 16px',
				borderRadius: 8,
				border: '0.5px solid #ccc',
				background: 'transparent',
				cursor: 'pointer',
				marginBottom: 16
			}}>
				执行 mySyncCode()
			</button>

			{/* 日志 */}
			<div style={{
				fontSize: 12,
				color: '#888',
				fontFamily: 'monospace',
				background: '#f5f5f5',
				borderRadius: 8,
				padding: '8px 12px'
			}}>
				{log}
			</div>
		</div>
	)
}