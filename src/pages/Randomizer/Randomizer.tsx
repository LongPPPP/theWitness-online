import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import TheWitnessPuzzle from "../../components/TheWitnessPuzzle/TheWitnessPuzzle.tsx";
import style from "./Randomizer.module.css";
import {drawSymbol, type SVGType} from "../../components/TheWitnessPuzzle/engine/puzzle/svg.ts";
import type {EndDirection} from "../../components/TheWitnessPuzzle/engine/puzzle/cell.ts";
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import NumberField from "./NumberField.tsx";
import {ROTATION_BIT} from "../../components/TheWitnessPuzzle/engine/puzzle/polyominos.ts";
import {Decoration} from "../../components/TheWitnessPuzzle/engine/generator/Panel.ts";
import RefreshIcon from '@mui/icons-material/Refresh';
import {IconButton, Tooltip} from "@mui/material";


// 分割线组件（纯函数组件，无内部状态）
interface DragDividerProps {
    onDragStart: (e: React.MouseEvent<HTMLDivElement>) => void,
    width: number
}

function DragDivider({onDragStart, width = 8}: DragDividerProps) {
    return (
        <div
            className={style.dragDivider}
            style={{minWidth: width}}
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

    useEffect(() => {

    }, [])

    return (
        <div className={style.colorPicker}>
            <div
                className={style.selectedColorBox}
                style={{backgroundColor: `${selectedColor}`}}
                onClick={() => setIsOpen(!isOpen)}
            />
            <div>{selectedColor}</div>
            {/*颜色选择框*/}
            {isOpen && (
                <div className={style.colorSelectBox}>
                    {COLORS.map((color, index) => (
                        <div key={index} className={style.colorBox} style={{backgroundColor: `${color}`}}
                             onClick={() => {
                                 setSelectedColor(COLORS[index])
                                 onSelectColor(COLORS[index])
                                 setIsOpen(!isOpen)
                             }}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

// 组件SymbolSVG (symbol Element 的前缀)
interface SVGParams {
    type: SVGType;
    x?: number;
    y?: number;
    dir?: EndDirection;
    count?: number;
    polyshape?: number;
    color?: string;
    title?: string;
}

function SymbolSVG({defaultSymbol}: { defaultSymbol: SVGParams }) {
    const eRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!eRef) return;
        const symbol = defaultSymbol;
        const svgElement = drawSymbol({
            type: symbol.type as SVGType,
            width: 72,
            height: 72,
            x: symbol.x,
            y: symbol.y,
            dir: symbol.dir as EndDirection,
            count: symbol.count,
            polyshape: symbol.polyshape,
            color: symbol.color,
        }, false);
        eRef.current.innerHTML = '';
        eRef.current.appendChild(svgElement);
    }, [defaultSymbol])

    return (
        <>
            <div
                ref={eRef}
                style={{
                    width: '48px',
                    height: '48px',
                    padding: 0,
                }}
            />
        </>
    )
}

// symbol Element List
interface SymbolListProps {
    symbolList: (SVGParams & { id: number })[],
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
        <div>
            {symbolList.map((symbol) => (
                <div key={symbol.id} style={{display: 'flex', alignItems: 'center'}}>
                    <div className={style.element}>
                        <div className={style.elementLeft} onClick={() => {
                        }}>
                            <SymbolSVG defaultSymbol={symbol}/>
                            <div className={style.name}>{symbol.title}</div>
                        </div>
                        <div className={style.elementMid} style={{opacity: isDeleting ? 0 : 1}}>
                            {enableColorPicker(symbol.type) &&
                                <ColorPicker defaultColor={'#000000'} onSelectColor={(color: string) => {
                                    onSelectColor(symbol.id, color);
                                }}/>}
                            {/* TODO: shape picker */}
                        </div>
                        <div className={style.elementRight}>
                            {/* isDeleting为false时显示NumberField */}
                            {!isDeleting && (
                                <NumberField
                                    min={1}
                                    max={15}
                                    defaultValue={1}
                                    onChange={(value: number) => {
                                        onNumberChange(symbol.id, value);
                                    }}
                                />
                            )}
                            {/* isDeleting为true时显示删除图标 */}
                            {isDeleting && (
                                <IconButton><HighlightOffIcon
                                    color={'error'}
                                    fontSize={'large'}
                                    style={{cursor: 'pointer'}}
                                    onClick={() => onClickDelete(symbol.id)}
                                /></IconButton>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

type ElementItem = (SVGParams & { id: number, num: number })
const defaultSymbolList: SVGParams[] = [
    {type: 'start', title: 'Start point'},
    {type: 'end', 'y': 18, 'dir': 'top', title: 'End point'},
    {type: 'gap', title: 'Line break'},
    {type: 'dot', title: 'Dot', color: '#000000'},
    {type: 'square', title: 'Square', color: '#000000'},
    {type: 'star', title: 'Star', color: '#000000'},
    {type: 'nega', title: 'Negation', color: '#000000'},
    {type: 'triangle', count: 1, title: 'Triangle', color: '#000000'},
    {type: 'poly', polyshape: 0x322, title: 'Polyomino', color: '#000000'},
    {type: 'poly', polyshape: (0x322 | ROTATION_BIT), title: 'Rotatable polyomino', color: '#000000'},
    {type: 'ylop', polyshape: 0x322, title: 'Negation polyomino', color: '#000000'},
    // 'bridge': {'type': 'bridge', 'title': 'Bridge'},
    // 'arrow': {'type': 'arrow', 'count': 1, 'rot': 0, 'title': 'Arrow'},
    // 'sizer': {'type': 'sizer', 'title': 'Sizer'},
]

function ElementSelectPanel({onElementChange}: { onElementChange: (symbolList: ElementItem[]) => void }) {
    const [symbolList, setSymbolList] = useState<ElementItem[]>([]) // default elements
    const id = useRef(1);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = useCallback((itemId: number) => {
        setSymbolList(prevList => prevList.filter(item => item.id !== itemId));
    }, [])

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
        setSymbolList(prevState => [...prevState, {...defaultSymbolList[index], num: 1, id: id.current}])
        id.current++;
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

    function handleClickReset_btn() {
        setSymbolList([
            {...defaultSymbolList[0], num: 1, id: 1},
            {...defaultSymbolList[1], num: 1, id: 2}
        ])
        id.current = 3;
    }

    function handleClickDelete_btn() {
        setIsDeleting(!isDeleting)
    }

    return (
        <>
            <div className={style.elementPicker}>
                <div className={style.title}>元素选择器
                    <Tooltip title="Restrat" arrow><IconButton className={style.iconBtn}><RefreshIcon
                        onClick={handleClickReset_btn}
                    /></IconButton></Tooltip>
                    <Tooltip title="Delete" arrow><IconButton className={style.iconBtn}><DeleteForeverIcon
                        color={"error"}
                        onClick={handleClickDelete_btn}
                    /></IconButton></Tooltip>
                </div>
                <div className={style.listContainer}>
                    <SymbolList
                        symbolList={symbolList}
                        isDeleting={isDeleting}
                        onClickDelete={handleDelete}
                        onSelectColor={handleColorSelect}
                        onNumberChange={handleNumberSelect}
                    />
                </div>
                <div className={style.addElementBox}>
                    <div className={style.addElementTitle} onClick={() => {
                        id.current = id.current + 1;
                        setSymbolList([...symbolList, {
                            id: id.current,
                            type: 'square',
                            dir: 'top',
                            title: 'Square',
                            num: 1
                        }])
                    }}>点击图标添加新元素
                    </div>
                    <div className={style.symbolBox}>
                        {defaultSymbolList.map((symbol, index) => {
                            return (
                                <div key={index} className={style.symbolIcon} onClick={() => {
                                    handleAddItem(index)
                                }}><SymbolSVG defaultSymbol={symbol}/>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </>
    )
}


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
} as const;
export default function Randomizer() {
    const [leftWidth, setLeftWidth] = useState(420);
    const [seed, setSeed] = useState<string>('')
    const isDraggingRef = useRef(false);
    const dragRef = useRef({startX: 0, startWidth: 0});
    const savedSymbols = useRef<number[]>([]);

    const handleDragMove = useCallback((e: MouseEvent) => {
        if (!isDraggingRef.current) return;
        const deltaX = e.clientX - dragRef.current.startX;
        // 限制宽度范围
        const newWidth = Math.max(
            window.innerWidth * 0.2,
            Math.min(dragRef.current.startWidth + deltaX, window.innerWidth * 0.5)
        );
        setLeftWidth(newWidth);
    }, []);

    const handleDragEnd = useCallback(() => {
        isDraggingRef.current = false;
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
    }, [handleDragMove]);

    const handleDragStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        isDraggingRef.current = true;
        dragRef.current = {
            startX: e.clientX,
            startWidth: leftWidth,
        };
        // 绑定全局鼠标移动/抬起事件
        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('mouseup', handleDragEnd);
    }, [handleDragEnd, handleDragMove, leftWidth]);

    const handleSymbol = useCallback((eList: ElementItem[]) => {
        const symbol_map = new Map<number, number>();
        savedSymbols.current = []
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

    const handleGenerate = useCallback(() => {
        setSeed(`${Math.random()}`);
    }, []);

    const leftPanel = useMemo(() => {
        return (
            <div
                style={{height: "100%", width: `${leftWidth}px`, flexShrink: 0}}>
                <ElementSelectPanel onElementChange={handleSymbol}/>
            </div>
        )
    }, [handleSymbol, leftWidth])

    const rightPanel = useMemo(() => {
        return (
            <div
                style={{
                    flex: 1,
                    border: "1px solid #e0e0e0",
                    borderRadius: "16px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                }}
            >
                <TheWitnessPuzzle
                    theme={"theme-light"}
                    width={4}
                    height={4}
                    symbols={savedSymbols.current}
                    seed={seed}
                />
                <button onClick={handleGenerate}>Generate</button>
            </div>
        )
    }, [handleGenerate, seed])

    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', handleDragMove);
            document.removeEventListener('mouseup', handleDragEnd);
        };
    }, [handleDragEnd, handleDragMove]);

    return (
        <div style={{
            height: "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            overflow: "hidden",
        }}>
            {leftPanel}
            <DragDivider width={8} onDragStart={handleDragStart}/>
            {rightPanel}
        </div>
    )
}
