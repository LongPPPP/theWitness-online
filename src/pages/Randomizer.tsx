import React, {useCallback, useEffect, useRef, useState} from "react";
import TheWitnessPuzzle from "../components/TheWitnessPuzzle/TheWitnessPuzzle.tsx";
import {type SVGType} from "@/components/TheWitnessPuzzle/engine/puzzle/svg.ts";
import SymbolSVG, {type SVGParams} from "../components/TheWitnessPuzzle/SymbolSVG.tsx";
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import MergeTypeIcon from '@mui/icons-material/MergeType';
import NumberField from "../components/NumberField.tsx";
import {ROTATION_BIT} from "@/components/TheWitnessPuzzle/engine/puzzle/polyominos.ts";
import {Decoration} from "@/components/TheWitnessPuzzle/engine/generator/Panel.ts";
import RefreshIcon from '@mui/icons-material/Refresh';
import {Box, Divider, IconButton, List, ListItem, Paper, Stack, styled} from "@mui/material";
import Typography from "@mui/material/Typography";
import {TextButton} from "@/components/buttons";
import {BlackTooltip} from "@/components/tooltips";
import {useThemeMode} from "@/components/hooks/useThemeMode.ts";
import {useResizablePanel} from "@/components/hooks/useResizablePanel.ts";
import EditIcon from '@mui/icons-material/Edit';
import {useNavigate} from "react-router-dom";

// ========================================================================================
// 分割线组件（纯函数组件，无内部状态）
interface DragDividerProps {
	onDragStart: (e: React.MouseEvent<HTMLDivElement>) => void,
	width: number
}

function DragDivider({onDragStart, width = 8}: DragDividerProps) {
	return (
		<Box
			sx={{
				cursor: 'ew-resize',
				height: '100%',
				transition: 'background-color 0.2s',
				backgroundColor: 'transparent',
				minWidth: width,
				'&:hover': {
					backgroundColor: '#0080FF',
				},
				'&::after': {
					content: '""',
					position: 'absolute',
					width: '2px',
					height: '24px',
					background: '#00000019',
					borderRadius: '2px',
					top: '50%',
					transform: 'translate(-50%, -50%)',
				}
			}}
			onMouseDown={onDragStart}
			onDragStart={(e) => e.preventDefault()}
		/>
	);
}

// 组件ColorPicker
interface ColorPickerProps {
	defaultColor: string,
	onSelectColor: (color: string) => void
}

function ColorPicker({
											 defaultColor,
											 onSelectColor
										 }: ColorPickerProps) {
	const [selectedColor, setSelectedColor] = useState(defaultColor);
	const [isOpen, setIsOpen] = useState(false);
	const COLORS = [
		'#000000', '#FFFFFF', '#FF0000',
		'#800080', '#00FF00', '#00FFFF',
		'#FF00FF', '#FFFF00', '#0000FF',
		'#FFA500'
	];

	return (
		<Stack
			justifyContent="space-between"
			sx={{
				position: 'relative',
				border: '1px solid',
				alignItems: 'center',
				padding: (theme) => theme.spacing(0.5),
				borderRadius: '4px',
				width: '100%',
			}} direction="row">
			<Box
				sx={{height: '16px', width: '16px', backgroundColor: `${selectedColor}`}}
				onClick={() => setIsOpen(!isOpen)}
			/>
			<Typography variant="button">{selectedColor}</Typography>
			{/*颜色选择框*/}
			{isOpen && (
				<Stack
					direction="row"
					sx={{
						position: 'absolute',
						top: '100%',
						left: 0,
						backgroundColor: (theme) => theme.palette.background.paper,
						padding: (theme) => theme.spacing(0.5),
						width: 'inherit',
						flexWrap: "wrap",
						display: 'flex',
						gap: '4px',
						zIndex: 10,
					}}>
					{COLORS.map((color, index) => (
						<Box
							key={index}
							sx={{
								height: '16px',
								width: '16px',
								borderRadius: '3px',
								cursor: 'pointer',
								backgroundColor: color,
							}}
							onClick={() => {
								setSelectedColor(COLORS[index])
								onSelectColor(COLORS[index])
								setIsOpen(!isOpen)
							}}
						/>
					))}
				</Stack>
			)}
		</Stack>
	)
}

// ========================================================================================
// symbol Element List
interface SymbolListProps {
	symbolList: (SVGParams & { id: number, num: number, color?: string })[],
	isDeleting: boolean,
	onClickDelete: (id: number) => void,
	onSelectColor: (id: number, color: string) => void
	onNumberChange: (id: number, number: number) => void
}

const SymbolList = ({
											symbolList,
											isDeleting,
											onClickDelete,
											onSelectColor,
											onNumberChange
										}: SymbolListProps) => {

	function enableColorPicker(name: SVGType) {
		switch (name) {
			case "start":
			case "end":
			case "gap":
			case "dot":
				return false;
			default:
				return true;
		}
	}

	return (
		<List sx={{display: 'flex', gap: '8px', flexDirection: 'column'}}>
			{symbolList.map((symbol) => (
				<ListItem key={symbol.id} sx={{padding: '0', height: '35px'}}>
					<Stack
						direction="row"
						alignItems="center"
						sx={{
							width: '100%',
							border: '1px solid',
							borderColor: (theme) => theme.palette.divider,
							borderRadius: '8px',
						}}
					>
						<Stack direction="row" alignItems="center">
							<SymbolSVG defaultSymbol={symbol} style={{width: '36px', height: '36px'}}/>
							<Divider orientation="vertical" flexItem/>
							<Typography marginLeft="4px">{symbol.type}</Typography>
						</Stack>
						<Stack alignItems="flex-end" sx={{flexGrow: 1, display: isDeleting ? 'none' : undefined}}>
							{enableColorPicker(symbol.type) &&
                  <Box sx={{width: '90px', marginRight: '8px'}}>
                      <ColorPicker
                          defaultColor={symbol.color}
                          onSelectColor={(color: string) => {
														onSelectColor(symbol.id, color);
													}}/>
                  </Box>
							}
						</Stack>
						<Stack>
							{/* isDeleting为false时显示NumberField */}
							<NumberField
								min={1}
								max={15}
								defaultValue={symbol.num ?? -1}
								onChange={(value: number) => {
									onNumberChange(symbol.id, value);
								}}
								sx={{display: isDeleting ? 'none' : undefined, border: 'none'}}
							/>
							{/* isDeleting为true时显示删除图标 */}
							{isDeleting && (
								<IconButton><HighlightOffIcon
									color={'error'}
									fontSize={'large'}
									style={{cursor: 'pointer'}}
									onClick={() => onClickDelete(symbol.id)}
								/></IconButton>
							)}
						</Stack>
					</Stack>
				</ListItem>
			))}
		</List>
	);
}
// ========================================================================================
const CustomIconButton = styled(IconButton)(({theme}) => ({
	borderRadius: '8px',
	borderColor: theme.palette.divider,
	backgroundColor: theme.palette.background.paper,
	'&:hover': {
		backgroundColor: '#E8EAEE',
	},
	'& svg': { // MUI Icon最终渲染为svg标签
		fontSize: theme.typography.pxToRem(16),
	},
}));
type ElementItem = (SVGParams & { id: number, num: number })
const defaultSymbolList: SVGParams[] = [
	{type: 'start', title: 'Start point'},
	{type: 'end', 'y': 18, 'dir': 'top', title: 'End point'},
	{type: 'gap', title: 'Line break', color: '#000000'},
	{type: 'dot', title: 'Dot', color: '#000000'},
	{type: 'square', title: 'Square', color: '#000000'},
	{type: 'star', title: 'Star', color: '#000000'},
	{type: 'nega', title: 'Negation', color: '#000000'},
	{type: 'triangle', count: 1, title: 'Triangle', color: '#000000'},
	{type: 'poly', polyshape: 0x322, title: 'Polyomino', color: '#000000'},
	{type: 'poly', polyshape: (0x322 | ROTATION_BIT), title: 'Rotatable polyomino', color: '#000000'},
	{type: 'ylop', polyshape: 0x322, title: 'Negation polyomino', color: '#000000'},
]

const IconBox = styled(IconButton)(({theme}) => ({
	borderRadius: '12px',
	cursor: 'pointer',
	border: '1px solid',
	padding: 0,
	borderColor: theme.palette.divider,
	'&:hover': {
		backgroundColor: theme.palette.action.hover,
		boxShadow: '0 3px 6px rgba(0, 0, 0, 0.1)', // 阴影加深
	},
	'& svg': { // MUI Icon最终渲染为svg标签
		color: theme.palette.primary,
	},
}));

function ElementSelectPanel({onElementChange}: { onElementChange: (symbolList: ElementItem[]) => void }) {
	const [symbolList, setSymbolList] = useState<ElementItem[]>([]) // default elements
	const id = useRef(1);
	const [isDeleting, setIsDeleting] = useState(false);

	// const handleDelete = useCallback((itemId: number) => {
	// 	setSymbolList(prevList => prevList.filter(item => item.id !== itemId));
	// }, [])

	const handleColorSelect = useCallback((itemId: number, color: string) => {
		setSymbolList(symbolList.map(item => item.id === itemId ? {...item, color: color} : item));
	}, [symbolList])

	const handleNumberSelect = useCallback((itemId: number, number: number) => {
		setSymbolList(symbolList.map(item => item.id === itemId ? {...item, num: number} : item));
	}, [symbolList])

	/**
	 * @param index 这个index是用于选取defaultSymbolList中元素的
	 * */
	const handleAddItem = useCallback((index: number) => {
		if (index >= defaultSymbolList.length || index < 0) return;
		id.current++;
		setSymbolList(prevState => [...prevState, {...defaultSymbolList[index], num: 1, id: id.current}])
	}, [])

	// 初始添加起点和终点
	useEffect(() => {
		handleAddItem(0)
		handleAddItem(1)

		return () => {

		}
	}, [handleAddItem]);

	//当元素状态发生变化的时候触发渲染
	useEffect(() => {
		onElementChange(symbolList)
	}, [onElementChange, symbolList]);

	function handleReset() {
		setSymbolList([
			{...defaultSymbolList[0], num: 1, id: 1},
			{...defaultSymbolList[1], num: 1, id: 2}
		])
		id.current = 3;
	}

	function handleDelete() {
		setIsDeleting(!isDeleting)
	}

	const handleMerge = useCallback(() => {
		if (symbolList.length <= 1) return;

		// 步骤1：创建元素分组的映射（避免直接修改原数组）
		const groupMap = new Map<string, {
			totalNum: number;
			template: ElementItem;
		}>();

		// 步骤2：定义分组的唯一键（确保相同类型/属性的元素分到一组）
		const getGroupKey = (item: ElementItem) => {
			if (item.type === 'start' || item.type === 'end') {
				return `${item.type}`; // 起点/终点只按类型分组
			} else if (item.type === 'poly') {
				return `${item.type}-${item.polyshape}-${item.color}`; // poly 按类型+形状+颜色分组
			} else {
				return `${item.type}-${item.color}`; // 其他类型按类型+颜色分组
			}
		};

		// 步骤3：遍历元素，分组累加数量
		symbolList.forEach(item => {
			const key = getGroupKey(item);
			if (groupMap.has(key)) {
				groupMap.get(key)!.totalNum += item.num;
			} else {
				groupMap.set(key, {
					totalNum: item.num,
					template: item
				});
			}
		});

		// 步骤4：将分组转换为新数组，生成新 ID
		const newList: ElementItem[] = Array.from(groupMap.values()).map(group => {
			return {
				...group.template,
				num: Math.min(group.totalNum, 15),
				id: id.current++ // 每个合并后的元素都有新 ID
			};
		});

		// 步骤5：更新状态（不可变方式）
		setSymbolList(newList);
	}, [symbolList]);


	return (
		<Paper sx={{display: 'flex', flexDirection: 'column', height: '100%', padding: (theme) => theme.spacing(2)}}>
			<Stack direction="row" alignItems="center">
				<Typography variant="h6" sx={{fontWeight: 'bold'}}>Symbol Picker</Typography>
				<Stack direction="row" justifyContent="flex-end" flexGrow={1}>
					<BlackTooltip title="Merge" arrow>
						<CustomIconButton size="small" disableRipple>
							<MergeTypeIcon
								sx={{color: (theme) => theme.palette.text.primary}}
								onClick={handleMerge}
							/></CustomIconButton></BlackTooltip>
					<BlackTooltip title="Restrat" arrow>
						<CustomIconButton size="small" disableRipple>
							<RefreshIcon
								sx={{color: (theme) => theme.palette.text.primary}}
								onClick={handleReset}
							/></CustomIconButton></BlackTooltip>
					<BlackTooltip title="Delete" arrow>
						<CustomIconButton size="small" disableRipple>
							<DeleteForeverIcon
								color="error"
								onClick={handleDelete}
							/></CustomIconButton></BlackTooltip>
				</Stack>
			</Stack>
			<Divider component="div"/>
			<Box sx={{overflowY: 'auto', flexGrow: 1}}>
				<SymbolList
					symbolList={symbolList}
					isDeleting={isDeleting}
					onClickDelete={handleDelete}
					onSelectColor={handleColorSelect}
					onNumberChange={handleNumberSelect}
				/>
			</Box>
			<Divider component="div">click Icon to pick up symbol</Divider>
			<Box display="flex" gap="4px" flexWrap="wrap" justifyContent="center" marginTop="8px">
				{defaultSymbolList.map((symbol, index) => {
					return (
						<BlackTooltip title={symbol.title} key={index} arrow>
							<IconBox
								onClick={() => {
									handleAddItem(index)
								}}
								disableRipple
							>
								<SymbolSVG defaultSymbol={{...symbol, color: null}} style={{width: '36px', height: '36px'}}/>
							</IconBox>
						</BlackTooltip>
					)
				})}
			</Box>
		</Paper>
	)
}

// ========================================================================================
const colorMap = {
	"#000000": Decoration.Color.Black,
	"#FFFFFF": Decoration.Color.White,
	"#FF0000": Decoration.Color.Red,
	"#800080": Decoration.Color.Purple,
	"#00FF00": Decoration.Color.Green,
	"#00FFFF": Decoration.Color.Cyan,
	"#FF00FF": Decoration.Color.Magenta,
	"#FFFF00": Decoration.Color.Yellow,
	"#0000FF": Decoration.Color.Blue,
	"#FFA500": Decoration.Color.Orange,
} as const;
const typeMap = {
	'start': Decoration.Shape.Start,
	'end': Decoration.Shape.Exit,
	'gap': Decoration.Shape.Gap,
	'dot': Decoration.Shape.Dot,
	'square': Decoration.Shape.Stone,
	'star': Decoration.Shape.Star,
	'triangle': Decoration.Shape.Triangle,
	'poly': Decoration.Shape.Poly,
	'ylop': Decoration.Shape.Poly | Decoration.Shape.Negative,
	'nega': Decoration.Shape.Eraser,
} as const;
export default function Randomizer() {
	const savedSymbols = useRef<number[]>([]);
	const [showSolution, setShowSolution] = useState<boolean>(false);
	const [generatorConfig, setGeneratorConfig] = useState({seed: 'x', symbols: []})
	const [currentCode, setCurrentCode] = useState<string>(""); // 保存当前生成的代码
	const {mode} = useThemeMode()
	const {leftWidth, handleDragStart} = useResizablePanel(330, 0.2, 0.5);
	const navigate = useNavigate();

	const handleSymbol = useCallback((eList: ElementItem[]) => {
		const symbol_map = new Map<number, number>();
		eList.forEach(item => {
			const type: Decoration.Shape = typeMap[item.type];
			const num = item.num;
			const color: Decoration.Color = colorMap[item.color];
			const rotate: Decoration.Shape | 0 = (item.polyshape & ROTATION_BIT) !== 0 ? Decoration.Shape.Can_Rotate : 0;

			const key = type | color | rotate;
			if (symbol_map.has(key)) {
				symbol_map.set(key, symbol_map.get(key) + num);
			} else {
				symbol_map.set(key, num);
			}
		})

		savedSymbols.current = []
		for (const [symbol, num] of symbol_map) {
			savedSymbols.current.push(symbol)
			savedSymbols.current.push(num)
		}
	}, []);

	// 处理跳转逻辑
	const handleEditInEditor = () => {
		if (!currentCode) return;
		// 对 Base64 进行 URL 编码，防止特殊字符 (+, /, =) 破坏 URL 结构
		const encodedCode = encodeURIComponent(currentCode);
		navigate(`/editor?code=${encodedCode}`)
		// 如果你使用了 react-router-dom，建议使用 navigate(`/editor?code=${encodedCode}`)
	};

	return (
		<Stack direction="row" flex={1}>
			{/*left*/}
			<div
				style={{height: '100%', width: `${leftWidth}px`, flexShrink: 0}}>
				<ElementSelectPanel onElementChange={handleSymbol}/>
			</div>
			{/*drag*/}
			<DragDivider width={8} onDragStart={handleDragStart}/>
			{/*right*/}
			<Paper sx={{flex: 1, flexDirection: "column", display: "flex"}}>
				<Stack sx={{width: '100%', padding: '8px', gap: '8px'}} direction="row">
					<TextButton variant="contained" size="medium" color="success" onClick={() => {
						setShowSolution(false)
						setGeneratorConfig({seed: Math.random().toString(), symbols: savedSymbols.current});
					}}>Generate</TextButton>
					<TextButton variant="contained" size="medium" onClick={() => {
						setShowSolution(prevState => !prevState)
					}}>Solution</TextButton>
					<TextButton variant="outlined" startIcon={<EditIcon />} onClick={handleEditInEditor} disabled={!currentCode}>Edit in Editor</TextButton>
					{/*<TextField*/}
					{/*	error*/}
					{/*	id="puzzle-base64-field"*/}
					{/*	label="Error"*/}
					{/*	defaultValue="Hello World"*/}
					{/*	fullWidth*/}
					{/*/>*/}
				</Stack>
				<Divider component="div"/>
				<Stack flex={1} alignItems="center" justifyContent="center">
					<TheWitnessPuzzle
						theme={mode}
						defaultWidth={4}
						defaultHeight={4}
						generatorConfig={generatorConfig}
						showSolution={showSolution}
						solutionIndex={0}
						enableResizeDrag={true}
						onPuzzleChange={(code) => setCurrentCode(code)}
					/>
				</Stack>
			</Paper>
		</Stack>
	)
}
