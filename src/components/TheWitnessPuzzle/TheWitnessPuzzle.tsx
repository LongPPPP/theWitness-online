import React, {useCallback, useEffect, useId, useRef, useState} from "react";
import {Generator} from "./engine/generator/Generator.ts";
import {IntersectionFlags, Panel} from "./engine/generator/Panel.ts";
import {phasePath, phasePuzzle} from "./engine/phase.ts";
import {draw} from "./engine/puzzle/display2.ts";
import styles from "./style/Puzzle.module.css";
import "./style/animations.css";
import Puzzle from "./engine/puzzle/puzzle.ts";
import PuzzleSolver from "./engine/puzzle/solve.ts";
import type {ReturnMessage} from "./engine/generator/generator.worker.ts";
import * as Utils from "./engine/puzzle/utils.ts";
import SymbolSVG from "./SymbolSVG.tsx";
import {usePuzzleConfig} from "./context/puzzleConfigContext.ts";
import {resizePanel} from "@/components/TheWitnessPuzzle/engine/resizePanel.ts";


// ==========================================================================
interface ResizeHandlesProps {
	enabled: boolean;
	onDragStart: (e: React.PointerEvent<HTMLDivElement>) => void;
}

/**
 * 谜题边缘的拖拽手柄
 */
const ResizeHandles = ({enabled, onDragStart}: ResizeHandlesProps) => {
	if (!enabled) return;
	// 定义 8 个方向的配置
	const handles = [
		{id: "topleft", cursor: "nwse-resize", style: {left: -10, top: -10, width: 30, height: 30}},
		{id: "top", cursor: "ns-resize", style: {left: 10, right: 10, top: -10, height: 30}, icon: {rot: 0, w: 22, h: 6}},
		{id: "topright", cursor: "nesw-resize", style: {right: -10, top: -10, width: 30, height: 30}},
		{id: "right", cursor: "ew-resize", style: {right: -10, top: 0, bottom: 0, width: 30}, icon: {rot: 1, w: 6, h: 22}},
		{id: "bottomright", cursor: "nwse-resize", style: {right: -10, bottom: -10, width: 30, height: 30}},
		{
			id: "bottom",
			cursor: "ns-resize",
			style: {left: 10, right: 10, bottom: -10, height: 30},
			icon: {rot: 0, w: 22, h: 6}
		},
		{id: "bottomleft", cursor: "nesw-resize", style: {left: -10, bottom: -10, width: 30, height: 30}},
		{id: "left", cursor: "ew-resize", style: {left: -10, top: 10, bottom: 10, width: 30}, icon: {rot: 1, w: 6, h: 22}},
	];

	return (
		<>
			{handles.map((h) => (
				<div
					key={h.id}
					id={`resize-${h.id}`}
					onPointerDown={onDragStart}
					style={{
						position: "absolute",
						cursor: h.cursor,
						display: "flex",
						zIndex: 10, // 确保在顶层
						...h.style,
					}}
				>
					{h.icon && (
						<SymbolSVG
							defaultSymbol={{type: "drag", rot: h.icon.rot, width: h.icon.w, height: h.icon.h}}
							style={{
								width: `${h.icon.w}px`,
								height: `${h.icon.h}px`,
								margin: "auto",
							}}
						/>
					)}
				</div>
			))}
		</>
	);
};

// ==========================================================================
export interface GeneratorConfig {
	seed?: string;
	symbols: number[];
}

export type PuzzleStyle = keyof typeof Panel.Symmetry;

interface PuzzleProps {
	defaultWidth?: number;
	defaultHeight?: number;
	theme?: 'light' | 'dark',
	enableResizeDrag?: boolean,
	outerBackgroundColor?: string,
	backgroundColor?: string,
	PIDBase64?: string,
	generatorConfig?: GeneratorConfig,
	onPuzzleChange?: (b64code: string) => void,
	// 显示solution相关
	showSolution?: boolean;
	solutionIndex?: number; // 外部传入显示第几个
	onSolutionsFound?: (count: number) => void; // 求解后的回调
	onSolveProgress?: (progress: number | null) => void; // 求解进度回调：null=未求解，0~100=进度百分比
	symmetry?: PuzzleStyle; // TODO：作用性存疑，在Editor种是使用code来设置迷宫的,不过在generator中倒是可以使用
}

type DragPosition = {
	x: number;
	y: number;
}


/**
 * 若symmetry含有Pillar，则必须保证width为偶数
 * */
function createPanel(width: number, height: number, symmetry: Panel.Symmetry) {
	let [startX, startY] = [0, 0];
	let [endX, endY] = [0, height * 2];
	const isPillar =
		symmetry === Panel.Symmetry.PillarParallel ||
		symmetry === Panel.Symmetry.PillarHorizontal ||
		symmetry === Panel.Symmetry.PillarVertical ||
		symmetry === Panel.Symmetry.PillarRotational ||
		symmetry === Panel.Symmetry.Pillar;

	if (isPillar && width % 2 === 1) {
		throw new Error('若symmetry含有Pillar，则必须保证width为偶数')
	}

	if (symmetry === Panel.Symmetry.Horizontal) {
		[startX, startY] = [width * 2, 0]
	} else if (isPillar) {
		[startX, startY] = [width - 2, 0];
		// 在旋转对称的时候使起点和终点错开放置
		if(symmetry === Panel.Symmetry.PillarRotational) {
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

const TheWitnessPuzzle = (
	{
		defaultWidth = 3,
		defaultHeight = 3,
		outerBackgroundColor,
		backgroundColor,
		theme = 'light',
		enableResizeDrag = false,
		showSolution = false,
		generatorConfig = undefined,
		onPuzzleChange,
		PIDBase64,
		solutionIndex,
		onSolutionsFound,
		onSolveProgress,
		symmetry = 'None',
	}: PuzzleProps
) => {
	const uuid = "puzzle_" + useId()
	const width = useRef<number>(defaultWidth)
	const height = useRef<number>(defaultHeight)
	const themeRef = useRef<HTMLDivElement>(null)
	const puzzleRef = useRef<SVGSVGElement>(null)
	const generatorWorker = useRef<Worker>(null)
	const generator = useRef<Generator>(null) // generator 生成 panel
	const panel = useRef<Panel>(null) // panel 包含迷宫的所有基本属性.可以转换成puzzle
	const [puzzle, setPuzzle] = useState<Puzzle>(null) // puzzle 用于渲染,交互
	const [solveTick, setSolveTick] = useState<number>(0); // 异步求解完成时递增，触发重渲染
	const dragging = useRef<DragPosition | null>(null);
	const prvBase64 = useRef<string>(null); // 防止传出的base64code再传入重复触发更新，导致死循环
	const generatorSolution = useRef<Array<(number | { x: number, y: number })>[]>(null);
	const cachedSolutions = useRef<{
		puzzle: Puzzle;
		solutions: Array<(number | { x: number, y: number })[]> | null; // null = 求解进行中
	} | null>(null);
	const solverRef = useRef<PuzzleSolver | null>(null);
	const {config} = usePuzzleConfig();

	// init puzzle
	useEffect(() => {
		const sym = Panel.Symmetry[symmetry as keyof typeof Panel.Symmetry];
		if (PIDBase64) {
			if (PIDBase64 === prvBase64.current) return; // 这里防止传出的code再传入重复触发更新，导致死循环

			try {
				panel.current = Panel.deserialize(PIDBase64)
			} catch (e) {
				console.error("Invalid puzzle code:", e)
				panel.current = createPanel(defaultWidth, defaultHeight, sym)
			}
		} else {
			panel.current = createPanel(defaultWidth, defaultHeight, sym)
		}
		setPuzzle(phasePuzzle(panel.current))
	}, [defaultHeight, defaultWidth, PIDBase64, symmetry, uuid]);

	// init worker / if worker is not supported, then use generator in main process
	useEffect(() => {
		if (!generatorConfig) return;

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
		if (!generatorConfig || !width.current || !height.current) return;
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
					panel.current = Panel.ObjectToPanel(data.panel);
					setPuzzle(phasePuzzle(panel.current))
					generatorSolution.current = [data.path];
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
			setPuzzle(phasePuzzle(panel.current))
			generatorSolution.current = [phasePath(generator.current.Path, generator.current.Starts)]
		}

	}, [width, height, generatorConfig]);

	// 更新 puzzle 背景颜色
	useEffect(() => {
		if (themeRef.current) {
			if (outerBackgroundColor != undefined) themeRef.current.style.setProperty('--outer-background', outerBackgroundColor)
			if (backgroundColor != undefined) themeRef.current.style.setProperty('--background', backgroundColor)
		}
	}, [backgroundColor, outerBackgroundColor]);

	// 当puzzle变化的时候重新绘制puzzle,并且调用onPuzzleChange
	useEffect(() => {
		if (!puzzle) return;
		draw(puzzle, uuid)

		if (onPuzzleChange && panel.current) {
			const newCode = panel.current.serialize();
			prvBase64.current = newCode;

			onPuzzleChange(newCode);
		}
	}, [onPuzzleChange, puzzle, uuid])

	// 负责计算和绘制Path逻辑
	// showSolution为true才计算解，并且计算后，若showSolution一直变化但是puzzle没有变化，解不重复计算
	useEffect(() => {
		if (!puzzle) return;

		const puzzleElem = puzzleRef.current;

		if (!showSolution) {
			Utils.deleteElementsByClassName(puzzleElem, 'cursor');
			Utils.deleteElementsByClassName(puzzleElem, 'end-hint');
			Utils.deleteElementsByClassName(puzzleElem, 'line-1');
			Utils.deleteElementsByClassName(puzzleElem, 'line-2');
			Utils.deleteElementsByClassName(puzzleElem, 'line-3');
			puzzle.clearLines();
			return;
		}

		// 情况 A: 生成器预设路径
		if (generatorSolution.current) {
			PuzzleSolver.drawPath(puzzle, generatorSolution.current[0], puzzleElem);
			onSolutionsFound?.(1);
			return;
		}

		// ✅ 修复：求解前清除手动解谜留下的线段状态
		puzzle.clearLines();

		// 情况 B: 缓存命中 —— 解已就绪
		if (cachedSolutions.current?.puzzle === puzzle && cachedSolutions.current.solutions !== null) {
			const solutions = cachedSolutions.current.solutions;
			onSolutionsFound?.(solutions.length);
			if (solutions.length > 0) {
				const idx = Math.min(Math.max(0, solutionIndex || 0), solutions.length - 1);
				PuzzleSolver.drawPath(puzzle, solutions[idx], puzzleElem);
			}
			return;
		}

		// 情况 C: 当前 puzzle 正在求解中，等待异步回调
		if (cachedSolutions.current?.puzzle === puzzle) return;

		// 情况 D: 启动新一轮求解
		if (solverRef.current) {
			solverRef.current.cancelSolving();
			solverRef.current = null;
		}
		cachedSolutions.current = {puzzle, solutions: null};
		console.info("正在发布计算谜题任务...");

		const solver = new PuzzleSolver(puzzle);
		solverRef.current = solver;
		solver.solve(
			(progress) => {
				onSolveProgress?.(progress);
			},
			(paths) => {
				// 同步或异步完成后均走此分支
				if (cachedSolutions.current?.puzzle === puzzle) {
					cachedSolutions.current = {puzzle, solutions: paths};
				}
				solverRef.current = null;
				onSolveProgress?.(null);
				setSolveTick(t => t + 1); // 触发重渲染，进入情况 B
			}
		);

		return () => {
			// effect 因依赖变化而重跑前，若求解仍在进行则取消
			solverRef.current?.cancelSolving();
			solverRef.current = null;
		};
	}, [puzzle, showSolution, solutionIndex, onSolutionsFound, solveTick, onSolveProgress]);

	// 当config变化的时候设置puzzle的config
	useEffect(() => {
		if (!puzzle) return;
		puzzle.config = config;
	}, [config, puzzle]);

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

			const xLim = 40;
			// let xScale = 2;
			// if (puzzle.symmetry != null && puzzle.pillar === true) {
			// 	xScale = 4;
			// }
			// Pillar 对称时每次拖动需要同时在两侧各扩展一列，xScale 翻倍
			const isPillarSym = panel.current.symmetry === Panel.Symmetry.PillarParallel
				|| panel.current.symmetry === Panel.Symmetry.PillarHorizontal
				|| panel.current.symmetry === Panel.Symmetry.PillarVertical
				|| panel.current.symmetry === Panel.Symmetry.PillarRotational;
			const xScale = isPillarSym ? 4 : 2;

			let yLim = 40;
			// Panel.Height = puzzleHeight * 2 + 1，puzzle.height >= 9 等价于 Panel.Height >= 19
			if (panel.current.Height >= 19) {
				yLim = 60;
			}
			const yScale = 2;

			while (Math.abs(dx) >= xLim) {
				const drag = (elemId.includes('right') ? 'right' : 'left');
				if (!resizePanel(xScale * Math.sign(dx), 0, drag, panel.current)) break;
				setPuzzle(phasePuzzle(panel.current))
				width.current += xScale * Math.sign(dx) / 2; // 需要除以二（原本算上道路了）
				dx -= Math.sign(dx) * xLim;
				dragging.current.x = newDragging.x;
			}

			while (Math.abs(dy) >= yLim) {
				const drag = (elemId.includes('top') ? 'top' : 'bottom');
				if (!resizePanel(0, yScale * Math.sign(dy), drag, panel.current)) break;
				setPuzzle(phasePuzzle(panel.current))
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
	}, []);

	return (
		<div className={styles.theme}>
			<div ref={themeRef} className={`${styles[theme]}`}>
				<div style={{position: "relative"}}>
					<ResizeHandles enabled={enableResizeDrag} onDragStart={dragStart}/>
					<svg ref={puzzleRef} id={uuid} style={{display: 'block'}}></svg>
				</div>
			</div>
		</div>
	)
}

export default TheWitnessPuzzle;