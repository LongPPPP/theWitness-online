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
}

type DragPosition = {
	x: number;
	y: number;
}

function autoSolve(puzzle: Puzzle) {
	const puzzleSolver = new PuzzleSolver(puzzle)
	const f1 = () => {
	}
	const f2 = () => {
	}
	return puzzleSolver.solve(f1, f2);

}

function createDefaultPanel(defaultWidth: number, defaultHeight: number) {
	const panel = new Panel(0x018AF, defaultWidth * 2 + 1, defaultHeight * 2 + 1, defaultWidth * 2, 0, 0, defaultHeight * 2)
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
	const dragging = useRef<DragPosition | null>(null);
	const prvBase64 = useRef<string>(null); // 防止传出的base64code再传入重复触发更新，导致死循环
	const generatorSolution = useRef<Array<(number | { x: number, y: number })>[]>(null);
	const {config} = usePuzzleConfig();

	// init puzzle
	useEffect(() => {
		if (PIDBase64) {
			if (PIDBase64 === prvBase64.current) return; // 这里防止传出的code再穿入重复触发更新，导致死循环

			try {
				panel.current = Panel.deserialize(PIDBase64)
			} catch (e) {
				console.error("Invalid puzzle code:", e)
				panel.current = createDefaultPanel(defaultWidth, defaultHeight)
			}
		} else {
			panel.current = createDefaultPanel(defaultWidth, defaultHeight)
		}
		setPuzzle(phasePuzzle(panel.current))
	}, [defaultHeight, defaultWidth, PIDBase64, uuid]);

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

	// 当puzzle变化的时候重新绘制puzzle
	useEffect(() => {
		if (!puzzle) return;
		draw(puzzle, uuid)

		if (onPuzzleChange && panel.current) {
			const newCode = panel.current.serialize();
			prvBase64.current = newCode;

			onPuzzleChange(newCode);
		}
	}, [onPuzzleChange, puzzle, uuid])

	// 当puzzle变化的时候计算并渲染solution （当showSolution为true才会计算和渲染）
	// TODO 当puzzle没有变化的时候只有showSolution变化的时候不重新计算solution
	useEffect(() => {
		if(!puzzle) return;
		if (!showSolution) {
			const puzzleElem = puzzleRef.current;
			Utils.deleteElementsByClassName(puzzleElem, 'cursor')
			Utils.deleteElementsByClassName(puzzleElem, 'end-hint')
			Utils.deleteElementsByClassName(puzzleElem, 'line-1')
			Utils.deleteElementsByClassName(puzzleElem, 'line-2')
			Utils.deleteElementsByClassName(puzzleElem, 'line-3')
			puzzle.clearLines()
			return
		}
		
		if(generatorSolution.current) {
			PuzzleSolver.drawPath(puzzle, generatorSolution.current[0], puzzleRef.current)
			onSolutionsFound?.(0);
			return
		}

		const solutions = autoSolve(puzzle);
		onSolutionsFound?.(solutions.length);
		const idx = Math.min(Math.max(0, solutionIndex || 0), solutions.length - 1);
		PuzzleSolver.drawPath(puzzle, solutions[idx], puzzleRef.current)
		
	}, [onSolutionsFound, puzzle, showSolution, solutionIndex]);

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