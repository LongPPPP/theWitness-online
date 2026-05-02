import {drawSymbol, type SVGType} from "./engine/puzzle/svg.ts";
import type {EndDirection} from "./engine/puzzle/cell.ts";
import {useEffect, useRef} from "react";
import {useThemeMode} from "../hooks/useThemeMode.ts";


export interface SVGParams {
	type: SVGType;
	x?: number;
	y?: number;
	dir?: EndDirection;
	count?: number;
	polyshape?: number;
	color?: string;
	title?: string;
	width?: number;
	height?: number;
	rot?: number;
}

// 组件SymbolSVG (提供svg类型，获得一个Element)
export default function SymbolSVG({
																		defaultSymbol,
																		style = {
																			width: '48px',
																			height: '48px',
																			padding: 0,
																			display: 'block', //必须的
																		}
																	}: { defaultSymbol: SVGParams, style?: React.CSSProperties; }) {
	const eRef = useRef<SVGSVGElement>(null);
	const {theme} = useThemeMode();

	useEffect(() => {
		if (!eRef) return;
		const symbol = defaultSymbol;
		const svgElement = drawSymbol({
			type: symbol.type as SVGType,
			width: symbol.width ?? 72,
			height: symbol.height ?? 72,
			x: symbol.x,
			y: symbol.y,
			dir: symbol.dir as EndDirection,
			count: symbol.count,
			polyshape: symbol.polyshape,
			color: symbol.color ?? theme.palette.text.primary,
			rot: symbol.rot,
		}, 1, false);
		eRef.current.innerHTML = '';
		eRef.current.appendChild(svgElement);
	}, [defaultSymbol, theme])

	return (
		<svg
			ref={eRef}
			style={style}
		/>
	)
}