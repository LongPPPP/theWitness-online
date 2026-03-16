import {
	alpha,
	Box,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	FormControl,
	IconButton,
	InputLabel,
	List,
	ListItem,
	ListItemButton,
	ListItemText,
	MenuItem,
	Paper,
	Select,
	Stack,
	styled,
	TextField,
	ToggleButton,
	ToggleButtonGroup,
	Tooltip,
	Typography
} from "@mui/material";
import TheWitnessPuzzle from "@/components/TheWitnessPuzzle/TheWitnessPuzzle.tsx";
import {useThemeMode} from "@/components/hooks/useThemeMode.ts";
import SymbolSVG, {type SVGParams} from "@/components/TheWitnessPuzzle/SymbolSVG.tsx";
import {ROTATION_BIT} from "@/components/TheWitnessPuzzle/engine/puzzle/polyominos.ts";
import React, {useCallback, useEffect, useRef, useState} from "react";
import {createElement} from "@/components/TheWitnessPuzzle/engine/puzzle/svg.ts";
import {Decoration, IntersectionFlags, Panel} from "@/components/TheWitnessPuzzle/engine/generator/Panel.ts";
import {phaseColor, phasePolyShape} from "@/components/TheWitnessPuzzle/engine/phase.ts";
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import TextButton from "../components/buttons/TextButton.tsx";
import SaveIcon from '@mui/icons-material/Save';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from "@mui/icons-material/Close";
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import InputIcon from '@mui/icons-material/Input';

// =================================== Components-LoadPuzzleDialog ===================================

interface SavedPuzzle {
	name: string;
	code: string;
	time: string;
}

interface LoadPuzzleDialogProps {
	open: boolean;
	onClose: () => void;
	onConfirm: (puzzle: SavedPuzzle) => void;
	theme: "light" | "dark";
}

function LoadPuzzleDialog({open, onClose, onConfirm, theme}: LoadPuzzleDialogProps) {
	const [savedPuzzles, setSavedPuzzles] = useState<SavedPuzzle[]>([]);
	const [previewIndex, setPreviewIndex] = useState<number | null>(null);

	// 每次打开弹窗时从本地存储同步数据
	useEffect(() => {
		if (open) {
			const saves = JSON.parse(localStorage.getItem("witness_saves") || "[]");
			setSavedPuzzles(saves);
			setPreviewIndex(null); // 重置预览
		}
	}, [open]);

	const handleDelete = (index: number, e: React.MouseEvent) => {
		e.stopPropagation();
		const updated = savedPuzzles.filter((_, i) => i !== index);
		setSavedPuzzles(updated);
		localStorage.setItem("witness_saves", JSON.stringify(updated));
		if (previewIndex === index) setPreviewIndex(null);
	};

	const handleConfirm = () => {
		if (previewIndex !== null) {
			onConfirm(savedPuzzles[previewIndex]);
			onClose();
		}
	};

	return (
		<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
			<Stack direction="row">
				<DialogTitle fontWeight="bold">Load Saved Puzzle</DialogTitle>
				<Box sx={{flexGrow: 1}}/>
				<IconButton onClick={onClose} sx={{marginRight: '8px'}} disableRipple>
					<CloseIcon sx={{color: (theme) => theme.palette.text.primary}}/>
				</IconButton>
			</Stack>

			<DialogContent dividers sx={{display: 'flex', height: '500px', p: 0}}>
				{/* 左侧列表 */}
				<Box sx={{width: '40%', borderRight: '1px solid', borderColor: 'divider', overflowY: 'auto'}}>
					<List>
						{savedPuzzles.map((p, index) => (
							<ListItem
								key={index}
								disablePadding
								secondaryAction={
									<IconButton edge="end" color="error" onClick={(e) => handleDelete(index, e)}>
										<DeleteIcon fontSize="small"/>
									</IconButton>
								}
							>
								<ListItemButton
									selected={previewIndex === index}
									onClick={() => setPreviewIndex(index)}
								>
									<ListItemText
										primary={p.name || "Untitled"}
										secondary={p.time}
										primaryTypographyProps={{
											noWrap: true,
											fontWeight: previewIndex === index ? 'bold' : 'normal'
										}}
									/>
								</ListItemButton>
							</ListItem>
						))}
						{savedPuzzles.length === 0 && (
							<Typography sx={{p: 4, textAlign: 'center', color: 'text.secondary'}}>
								No saved puzzles found.
							</Typography>
						)}
					</List>
				</Box>

				{/* 右侧预览区 */}
				<Box sx={{
					width: '60%',
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					bgcolor: theme === 'dark' ? '#1e1e1e' : '#f9f9f9',
					position: 'relative'
				}}>
					{previewIndex !== null ? (
						<Box sx={{transform: 'scale(0.8)'}}>
							<TheWitnessPuzzle
								theme={theme}
								PIDBase64={savedPuzzles[previewIndex].code}
							/>
						</Box>
					) : (
						<Typography color="text.secondary">Select a puzzle to preview</Typography>
					)}
				</Box>
			</DialogContent>

			<DialogActions sx={{px: 3, py: 2}}>
				<TextButton
					onClick={handleConfirm}
					variant="contained"
					disabled={previewIndex === null}
					sx={{fontWeight: 'bold'}}
				>
					Confirm Load
				</TextButton>
			</DialogActions>
		</Dialog>
	);
}

// =================================== Components-ImportCodeDialog ===================================

interface ImportCodeDialogProps {
	open: boolean;
	onClose: () => void;
	onConfirm: (code: string) => void;
}

function ImportCodeDialog({ open, onClose, onConfirm }: ImportCodeDialogProps) {
	const [inputCode, setInputCode] = useState("");

	const handleConfirm = () => {
		if (inputCode.trim()) {
			onConfirm(inputCode.trim());
			setInputCode("");
			onClose();
		}
	};

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle fontWeight="bold">Import Puzzle Code</DialogTitle>
			<DialogContent dividers>
				<Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
					Paste the puzzle's Base64 code below to load it into the editor.
				</Typography>
				<TextField
					fullWidth
					multiline
					rows={4}
					placeholder="Paste code here..."
					value={inputCode}
					onChange={(e) => setInputCode(e.target.value)}
					variant="outlined"
					autoFocus
				/>
			</DialogContent>
			<DialogActions sx={{ px: 3, py: 2 }}>
				<TextButton onClick={onClose} color="inherit">Cancel</TextButton>
				<TextButton onClick={handleConfirm} variant="contained" disabled={!inputCode.trim()}>
					Import
				</TextButton>
			</DialogActions>
		</Dialog>
	);
}
// =================================== Editor ===================================

type Symbol = SVGParams & { value: number }

const symbolList: Symbol[] = [
	{type: 'start', title: 'Start point', value: Decoration.Shape.Start},
	{type: 'end', 'y': 18, 'dir': 'top', title: 'End point', value: Decoration.Shape.Exit},
	{type: 'gap', title: 'Line break', value: Decoration.Shape.Gap},
	{type: 'dot', title: 'Dot', value: Decoration.Shape.Dot},
	{type: 'square', title: 'Square', value: Decoration.Shape.Stone},
	{type: 'star', title: 'Star', value: Decoration.Shape.Star},
	{type: 'nega', title: 'Negation', value: Decoration.Shape.Eraser},
	{type: 'triangle', count: 1, title: 'Triangle', value: Decoration.Shape.Triangle1},
	{
		type: 'poly',
		polyshape: phasePolyShape(0x04700400),
		title: 'Polyomino',
		value: 0x04700400
	},
	{
		type: 'poly',
		polyshape: (phasePolyShape(0x04700400) | ROTATION_BIT),
		title: 'Rotatable polyomino',
		value: 0x04700400 | Decoration.Shape.Can_Rotate
	},
	{
		type: 'ylop',
		polyshape: phasePolyShape(0x04700400),
		title: 'Negation polyomino',
		value: 0x04700400 | Decoration.Shape.Negative
	},
	{
		type: 'ylop',
		polyshape: (phasePolyShape(0x04700400) | ROTATION_BIT),
		title: 'Rotatable Negation polyomino',
		value: 0x04700400 | Decoration.Shape.Negative | Decoration.Shape.Can_Rotate
	},
];

const colorList = [
	Decoration.Color.Black, Decoration.Color.White, Decoration.Color.Red,
	Decoration.Color.Purple, Decoration.Color.Green, Decoration.Color.Cyan,
	Decoration.Color.Magenta, Decoration.Color.Yellow, Decoration.Color.Blue,
	Decoration.Color.Orange,
]

const styleOptions = [
	{value: 'default', label: 'Default'},
	{value: 'h_sym', label: 'Horizontal Symmetry'},
	{value: 'v_sym', label: 'Vertical Symmetry'},
	{value: 'r_sym', label: 'Rotational Symmetry'},
	{value: 'pillar', label: 'Pillar'},
	{value: 'pillar_h', label: 'Pillar (H Symmetry)'},
	{value: 'pillar_v', label: 'Pillar (V Symmetry)'},
	{value: 'pillar_r', label: 'Pillar (R Symmetry)'},
	{value: 'pillar_two', label: 'Pillar (Two Lines)'},
];

const CustomToggleButtonGroup = styled(ToggleButtonGroup)(({theme}) => ({
	border: 'none', // 移除组的默认边框
	'& .MuiToggleButton-root': {
		borderRadius: 12, // 移除默认圆角
		borderRight: '1px solid', // 重置右侧边框
		borderLeft: '1px solid', // 重置左侧边框
	},
	'& .Mui-selected': {
		border: '2px solid #1976d2', // 选中时边框高亮（可选）
		backgroundColor: alpha(theme.palette.primary.light, 0.2),
	},
}))

const handlePointerEnter = (e: PointerEvent) => {
	const target = e.target as HTMLElement;
	// 注意：opacity是样式属性，要用style设置，不是setAttribute
	target.style.opacity = '0.25';
};

const handlePointerLeave = (e: PointerEvent) => {
	const target = e.target as HTMLElement;
	target.style.opacity = '0'; // 恢复默认透明度，0会完全透明
};

const getColorName = (color: number): string => {
	switch (color) {
		case Decoration.Color.Black:
			return "Black";
		case Decoration.Color.White:
			return "White";
		case Decoration.Color.Red:
			return "Red";
		case Decoration.Color.Purple:
			return "Purple";
		case Decoration.Color.Green:
			return "Green";
		case Decoration.Color.Cyan:
			return "Cyan";
		case Decoration.Color.Magenta:
			return "Magenta";
		case Decoration.Color.Yellow:
			return "Yellow";
		case Decoration.Color.Blue:
			return "Blue";
		case Decoration.Color.Orange:
			return "Orange";
		default:
			return "Unknown";
	}
}


export default function Editor() {
	const divRef = useRef<HTMLDivElement>(null);
	const createdRects = useRef<SVGElement[]>([]);
	const panel = useRef<Panel>(undefined);
	const _symbol = useRef<Symbol>(symbolList[0]);
	const _color = useRef<number>(colorList[0]);
	const [symbol, setSymbol] = useState<Symbol>(symbolList[0]);
	const [color, setColor] = useState<number>(colorList[0]);
	const [code, setCode] = useState<string>(null);
	const [puzzleName, setPuzzleName] = useState("New Puzzle");
	const [puzzleStyle, setPuzzleStyle] = useState("default");
	const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false);
	const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
	const [manuallySolve, setManuallySolve] = useState<boolean>(false);
	const [autoSolve, setAutoSolve] = useState<boolean>(false);
	const [isSolving, setIsSolving] = useState<boolean>(false);
	const [solutionIndex, setSolutionIndex] = useState<number>(0);
	const [solutionsCount, setSolutionsCount] = useState<number>(0);

	const {mode} = useThemeMode();

	const onElementClicked = useCallback((e: PointerEvent, x: number, y: number) => {
		if (e.button == 2) {
			// Clear the associated cell
			panel.current.Grid[x][y] = 0;
			if ((x & 1) === 0 && (y & 1) === 0) panel.current.Grid[x][y] |= IntersectionFlags.INTERSECTION

			// TODO: symmetry
			// if (puzzle.symmetry != null) {
			// 	var sym = puzzle.getSymmetricalPos(x, y)
			// 	delete puzzle.grid[sym.x][sym.y].start
			// 	delete puzzle.grid[sym.x][sym.y].end
			// }
		} else if (_symbol.current.type === 'start') {
			if (x % 2 === 1 && y % 2 === 1) return

			if (panel.current.Startpoints.some(point => point.first === x && point.second === y)) {
				panel.current.ClearGridSymbol(x, y)
			} else {
				panel.current.SetGridSymbol(x, y, Decoration.Shape.Start, Decoration.Color.None);
			}

			// TODO: symmetry
			// if (puzzle.symmetry != null) {
			// 	var sym = puzzle.getSymmetricalPos(x, y)
			// 	if (sym.x === x && sym.y === y) {
			// 		// If the two startpoints would be in the same location, do nothing.
			// 		puzzle.grid[x][y].start = null
			// 	} else {
			// 		puzzle.updateCell2(sym.x, sym.y, 'start', puzzle.grid[x][y].start)
			// 	}
			// }
		} else if (_symbol.current.type == 'end') {
			if (x % 2 === 1 && y % 2 === 1) return

			if (panel.current.Endpoints.some(point => point.GetX() === x && point.GetY() === y)) {
				panel.current.ClearGridSymbol(x, y)
			} else {
				panel.current.SetGridSymbol(x, y, Decoration.Shape.Exit, Decoration.Color.None);
			}

			// TODO: symmetry
			//
			//
			//
			//
		} else if (_symbol.current.type == 'dot') {
			if (x % 2 === 1 && y % 2 === 1) return

			if (panel.current.Grid[x][y] === Decoration.Shape.Dot) {
				panel.current.ClearGridSymbol(x, y)
			} else {
				panel.current.SetGridSymbol(x, y, Decoration.Shape.Dot, Decoration.Color.None);
			}

			// TODO: symmetry
			//
			//
			//
			//
		} else if (_symbol.current.type == 'gap') {
			if (x % 2 === y % 2) return

			if (panel.current.Grid[x][y] === Decoration.Shape.Gap) {
				panel.current.ClearGridSymbol(x, y)
			} else {
				panel.current.SetGridSymbol(x, y, Decoration.Shape.Gap, Decoration.Color.None);
				// TODO: 修改gap为full gap
			}

			// TODO: symmetry
			//
			//
			//
			//
		} else if (['square', 'star', 'nega'].includes(_symbol.current.type)) {
			if (x % 2 !== 1 || y % 2 !== 1) return

			const s_color = _color.current;
			const s_shape = _symbol.current.value;
			if (panel.current.Grid[x][y] === (s_color | s_shape)) {
				panel.current.ClearGridSymbol(x, y)
			} else {
				panel.current.SetGridSymbol(x, y, s_shape, s_color)
			}

			// TODO: symmetry
			//
			//
			//
			//
		} else if (['poly', 'ylop'].includes(_symbol.current.type)) {
			if (x % 2 !== 1 || y % 2 !== 1) return

			const s_color = _color.current;
			const s_shape = _symbol.current.value;
			if (panel.current.Grid[x][y] === (s_color | s_shape)) {
				panel.current.ClearGridSymbol(x, y)
			} else {
				panel.current.SetGridSymbol(x, y, s_shape, s_color)
			}

		} else if (_symbol.current.type == 'triangle') {
			if (x % 2 !== 1 || y % 2 !== 1) return

			const s_color = _color.current;
			const s_shape = _symbol.current.value;
			if ((s_shape & 0xFFF) === (panel.current.Grid[x][y] & 0xFF0)) {
				const current_triangle = panel.current.Grid[x][y] & ~0xF;
				const next_triangle = current_triangle + 0x10000 > Decoration.Shape.Triangle4 ? Decoration.Shape.Triangle1 : current_triangle + 0x10000
				panel.current.SetGridSymbol(x, y, next_triangle, s_color)

				if (panel.current.Grid[x][y] === (s_color | s_shape)) {
					panel.current.ClearGridSymbol(x, y)
				}
			} else {
				panel.current.SetGridSymbol(x, y, s_shape, s_color)
			}

		} else {
			console.debug('OnElementClick called but no active parameter type recognized')
			return
		}
		setCode(panel.current.serialize())
	}, [])

	const handleSymbolChange = (_event: React.MouseEvent<HTMLElement>, newSymbol: Symbol) => {
		if (newSymbol !== null) {
			setSymbol(newSymbol)
		}
	}

	const handleColorChange = (_event: React.MouseEvent<HTMLElement>, newColor: number) => {
		if (newColor !== null) {
			setColor(newColor);
		}
	}

	const handleManuallySolve = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (event.target.checked) {
			setManuallySolve(true)
		} else {
			setManuallySolve(false)
		}
	}

	const handleAutoSolve = () => {
		if (autoSolve === false) {
			setIsSolving(true);
			setSolutionIndex(0); // 开启时重置索引
		}
		setManuallySolve(false);
		setAutoSolve(prv => !prv);
	};

	const handlePrevSolution = () => {
		setSolutionIndex(prev => (prev > 0 ? prev - 1 : solutionsCount - 1));
	};

	const handleNextSolution = () => {
		setSolutionIndex(prev => (prev < solutionsCount - 1 ? prev + 1 : 0));
	};

	const handlePuzzleChange = useCallback((code: string) => {
		if (!divRef.current) return;
		// 更新迷宫code和panel
		panel.current = Panel.deserialize(code);
		setCode(code);

		const divElement = divRef.current;
		const puzzleElement = divElement.querySelector('[id^="puzzle"]');

		// 只处理存在puzzleElement的情况
		if (!puzzleElement) return;

		// 清空之前创建的rect（避免重复创建）
		createdRects.current.forEach(rect => rect.remove());
		createdRects.current = [];

		// 手动解迷宫或者自动解迷宫的时候不添加这些玩意
		if (manuallySolve || autoSolve) return;

		let handlePointerDown: (e: PointerEvent) => void = () => {
		};
		// 恢复追加rect元素的逻辑
		const p = panel.current;
		let xPos = 40;
		// 外层循环：x方向（4*2+1 = 9次）
		for (let x = 0; x < p.Width; x++) {
			let yPos = 40;
			const width = x % 2 === 0 ? 24 : 58;
			// 内层循环：y方向（4*2+1 = 9次）
			for (let y = 0; y < p.Height; y++) {
				const height = y % 2 === 0 ? 24 : 58;
				// 创建SVG的rect元素（注意：必须用createElementNS指定SVG命名空间）
				const rect = createElement('rect');

				// 把匿名函数赋值给变量
				handlePointerDown = (e: PointerEvent) => {
					onElementClicked(e, x, y)
				}

				// 设置rect属性
				rect.setAttribute('x', String(xPos));
				rect.setAttribute('y', String(yPos));
				rect.setAttribute('width', String(width));
				rect.setAttribute('height', String(height));
				rect.setAttribute('fill', 'white');
				rect.setAttribute('opacity', '0');

				// 绑定事件
				rect.addEventListener('pointerdown', handlePointerDown);
				rect.addEventListener('pointerenter', handlePointerEnter);
				rect.addEventListener('pointerleave', handlePointerLeave);

				// 添加到DOM和缓存列表
				puzzleElement.appendChild(rect);
				createdRects.current.push(rect);

				yPos += height;
			}
			xPos += width;
		}

		// 清理函数：只移除手动创建的rect元素和事件
		return () => {
			createdRects.current.forEach(rect => {
				// 移除事件监听
				rect.removeEventListener('pointerdown', handlePointerDown);
				rect.removeEventListener('pointerenter', handlePointerEnter);
				rect.removeEventListener('pointerleave', handlePointerLeave);
				// 从DOM中移除元素
				rect.remove();
			});
			// 清空缓存
			createdRects.current = [];
		};
	}, [manuallySolve, autoSolve, onElementClicked]);

	const handleSolutionFound = useCallback((count: number) => {
		setIsSolving(false)
		setSolutionsCount(count);
		// 如果当前索引越界，重置为 0
		setSolutionIndex(curr => curr >= count ? 0 : curr);
	}, [])

	const handleSave = () => {
		const newSave: SavedPuzzle = {
			name: puzzleName,
			code: code,
			time: new Date().toLocaleString(),
		};
		const existingSaves = JSON.parse(localStorage.getItem("witness_saves") || "[]");
		const updatedSaves = [newSave, ...existingSaves]; // 最新的排前面
		localStorage.setItem("witness_saves", JSON.stringify(updatedSaves));
		alert("Puzzle saved successfully!");
	};
	const handleLoad = () => {
		setIsLoadDialogOpen(true);
	};
	const handleDelete = () => {
		setPuzzleName("New Puzzle")
		setManuallySolve(false)
		setPuzzleStyle("default")
		setCode("AQAAAAkJAAAYrwBgAAIIADsAYAABAAg7OwAAAAE=")
		panel.current = Panel.deserialize("AQAAAAkJAAAYrwBgAAIIADsAYAABAAg7OwAAAAE=");
	};
	const handleLoadConfirm = (selected: SavedPuzzle) => {
		setPuzzleName(selected.name);
		setCode(selected.code);
		panel.current = Panel.deserialize(selected.code);
	};
	const handleImportConfirm = (importedCode: string) => {
		try {
			// 验证代码是否合法
			const testPanel = Panel.deserialize(importedCode);
			if (testPanel) {
				panel.current = testPanel;
				setCode(importedCode);
				setPuzzleName("Imported Puzzle");
				alert("Puzzle imported successfully!");
			}
		} catch (e) {
			console.error("Failed to parse puzzle code:", e);
			alert("Invalid puzzle code. Please check your input.");
		}
	};

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const codeFromUrl = params.get('code');

		let initialCode = "AQAAAAkJAAAYrwBgAAIIADsAYAABAAg7OwAAAAE="; // 默认空迷宫

		if (codeFromUrl) {
			try {
				// 解码并验证
				const decodedCode = decodeURIComponent(codeFromUrl);
				Panel.deserialize(decodedCode); // 验证是否合法
				initialCode = decodedCode;
				setPuzzleName("Imported from Generator");
			} catch (e) {
				console.error("Invalid code in URL", e);
			}
		}

		setCode(initialCode);
		panel.current = Panel.deserialize(initialCode);
	}, []);

	useEffect(() => {
		_color.current = color;
		_symbol.current = symbol;
	}, [color, symbol]);

	return (
		<Paper sx={{width: '100%'}}>
			<Stack sx={{height: '100%'}} alignItems="center" justifyContent="center">
				{/*顶部功能栏*/}
				<Stack direction="row" spacing={2} alignItems="center"
							 sx={{pb: 2, borderColor: 'divider', px: 2}}>{/* 1. 重命名区域 */}
					<TextField
						variant="standard"
						label="Puzzle Name"
						value={puzzleName}
						onChange={(e) => setPuzzleName(e.target.value)}
						sx={{width: 200}}
					/>
					<Divider orientation="vertical" flexItem sx={{mx: 2}}/>
					{/* 2. 拼图样式选择 */}
					<FormControl variant="outlined" size="small" sx={{minWidth: 200}}>
						<InputLabel>Puzzle Style</InputLabel>
						<Select
							disabled
							value={puzzleStyle}
							label="Puzzle Style"
							onChange={(e) => setPuzzleStyle(e.target.value)}
						>
							{styleOptions.map((option) => (
								<MenuItem key={option.value} value={option.value}>
									{option.label}
								</MenuItem>
							))}
						</Select>
					</FormControl>
					<Box sx={{flexGrow: 1}}/> {/* 占位符，将按钮推向右侧 */}
					{/* 3. 功能按钮组 */}
					<Stack direction="row" spacing={1}>
						<Tooltip title="Save Puzzle">
							<IconButton onClick={handleSave} color="primary">
								<SaveIcon/>
							</IconButton>
						</Tooltip>

						<Tooltip title="Load Puzzle">
							<IconButton onClick={handleLoad} color="primary">
								<FolderOpenIcon/>
							</IconButton>
						</Tooltip>

						<Tooltip title="Import from Code">
							<IconButton onClick={() => setIsImportDialogOpen(true)} color="success">
								<InputIcon/>
							</IconButton>
						</Tooltip>

						<Tooltip title="Delete Current Puzzle">
							<IconButton onClick={handleDelete} color="error">
								<DeleteIcon/>
							</IconButton>
						</Tooltip>
					</Stack>
				</Stack>
				{/*editor主体*/}
				<Stack direction="row" gap={2}>
					{/* 12个子项（2列×6行） */}
					<CustomToggleButtonGroup
						value={symbol}
						onChange={handleSymbolChange}
						exclusive
						sx={{
							display: 'grid',
							gridTemplateColumns: 'repeat(2, 63px)', // 2列
							gridTemplateRows: 'repeat(6, 63px)',    // 6行
							gap: 2, // MUI 间距单位（1=8px），等价于 gap: 16px
						}}
					>
						{symbolList.map((symbol, index) => (
							<ToggleButton
								value={symbol}
								aria-label={symbol.title}
								key={index}
								disableRipple
								sx={{
									border: '1px solid',
									padding: 0,
								}}
							>
								<SymbolSVG defaultSymbol={symbol} style={{width: '48px', height: '48px'}}/>
							</ToggleButton>
						))}
					</CustomToggleButtonGroup>
					<div ref={divRef}>
						<TheWitnessPuzzle
							theme={mode}
							defaultHeight={4}
							defaultWidth={4}
							enableResizeDrag
							onPuzzleChange={handlePuzzleChange}
							PIDBase64={code}
							showSolution={autoSolve}
							solutionIndex={solutionIndex}
							onSolutionsFound={handleSolutionFound}
						/>
					</div>
					<CustomToggleButtonGroup
						value={color}
						onChange={handleColorChange}
						exclusive
						sx={{
							display: 'grid',
							gridTemplateColumns: 'repeat(1, 142px)', // 1列
							gridTemplateRows: 'repeat(10, 38.6px)',    // 10行
							gap: 1, // MUI 间距单位（1=8px），等价于 gap: 16px
						}}
					>
						{/* 10个子项（1列×10行） */}
						{colorList.map((color, index) => (
							<ToggleButton
								disableRipple
								value={color}
								aria-label={getColorName(color)}
								key={index}
								sx={{
									border: '1px solid',
									padding: '0 12px', // 增加左右边距
									justifyContent: 'flex-start', // 让内容左对齐
									textTransform: 'none', // 防止字母自动大写
								}}
							>
								<Stack direction="row" alignItems="center" spacing={1.5} sx={{width: '100%'}}>
									{/* 颜色指示圆点 */}
									<Box
										sx={{
											width: 14,
											height: 14,
											borderRadius: '50%',
											backgroundColor: phaseColor(color),
											border: color === Decoration.Color.White ? '1px solid #ccc' : '1px solid rgba(0,0,0,0.1)', // 为白色添加边框以防看不见
											flexShrink: 0,
										}}
									/>
									{/* 颜色名称 */}
									<Typography
										variant="body2"
										sx={{
											fontWeight: 'bolder',
											color: (theme) => theme.palette.text.primary
										}}
									>
										{getColorName(color)}
									</Typography>
								</Stack>
							</ToggleButton>
						))}
					</CustomToggleButtonGroup>
					<ImportCodeDialog
						open={isImportDialogOpen}
						onClose={() => setIsImportDialogOpen(false)}
						onConfirm={handleImportConfirm}
					/>
				</Stack>
				<LoadPuzzleDialog
					open={isLoadDialogOpen}
					onClose={() => setIsLoadDialogOpen(false)}
					onConfirm={handleLoadConfirm}
					theme={mode}
				/>
				{/*底部功能栏*/}
				<Stack direction="row">
					<FormControlLabel control={<Checkbox checked={manuallySolve} onChange={handleManuallySolve}/>}
														label="Solve Maunally"/>
					<TextButton color="success" sx={{fontWeight: 'bolder'}} onClick={handleAutoSolve} disabled={isSolving}>
						{autoSolve ? "Hide Solutions" : "Solve Automatically"}
					</TextButton>
					{/* --- 新增：解法切换控件 --- */}
					{autoSolve && solutionsCount > 0 && (
						<Stack direction="row" alignItems="center" sx={{ml: 2, bgcolor: 'action.hover', borderRadius: 2, px: 1}}>
							<IconButton size="small" onClick={handlePrevSolution}>
								<NavigateBeforeIcon fontSize="small"/>
							</IconButton>
							<Typography variant="body2" sx={{mx: 1, minWidth: '80px', textAlign: 'center', fontWeight: 'bold'}}>
								{solutionsCount > 0 ? `${solutionIndex + 1} / ${solutionsCount}` : "No Solution"}
							</Typography>
							<IconButton size="small" onClick={handleNextSolution}>
								<NavigateNextIcon fontSize="small"/>
							</IconButton>
						</Stack>
					)}
				</Stack>
			</Stack>
		</Paper>
	)
}