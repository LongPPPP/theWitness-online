import type Puzzle from "./puzzle.ts";
import {createElement} from "./svg.ts";
import {GAP_BREAK, GAP_FULL, LINE_BLACK, LINE_BLUE, LINE_NONE, LINE_YELLOW} from "./constants.ts"
import * as Utils from "./utils.ts"
import {validate} from "./validate.ts";
import type {Cell, LineCell} from "./cell.ts";

/**
 * 全局追踪状态记录表。
 * 所有TheWitnessPuzzle模块共享这一个单例对象，所有函数通过读写 data 来传递状态，
 * 而非通过函数参数。
 * 换句话说，只能同时trace一个迷宫
 */
type DataRecord = {
    tracing?: boolean;                          // 当前是否正在追踪（鼠标/触摸按下并移动中）
    wittleTracing?: boolean;                    // 是否使用 wittle 模式（一种更灵敏的追踪模式，影响 push 的重定向比率）
    svg?: SVGSVGElement;                        // 当前谜题所在的 SVG 根元素
    cursor?: HTMLElement | SVGElement | null;   // 跟随鼠标的光标圆圈 SVG 元素
    x?: number;                                 // 光标当前的 SVG 像素 x 坐标
    y?: number;                                 // 光标当前的 SVG 像素 y 坐标
    pos?: { x: number; y: number };             // 光标当前所在格子的网格坐标（整数）
    sym?: { x: number; y: number };             // 对称模式下，对称光标对应的网格坐标
    lastTouchPos?: { x: number; y: number };    // 上一帧触摸位置，用于计算触摸移动增量
    puzzle?: Puzzle;                            // 当前谜题对象的引用
    path?: PathSegment[];                       // 已走过的路径段数组，每进入一个新格子就 push 一个 PathSegment
    symbbox?: BoundingBox,                      // 对称光标对应格子的像素包围盒
    bbox?: BoundingBox,                         // 主光标当前所在格子的像素包围盒
    start?: SVGElement                          // 起点圆圈 SVG 元素的引用
    symcursor?: SVGElement                      // 对称模式下的第二个光标圆圈 SVG 元素
    animations?: CSSStyleSheet                  // 用于插入/删除 CSS 动画规则的样式表引用

    // [key: string]: any; // 索引签名：允许添加任意键名的属性
}

const data: DataRecord = {}

// @Volatile -- must match order of PATH_* in solve
const MOVE_NONE = 0
const MOVE_LEFT = 1;
const MOVE_RIGHT = 2
const MOVE_TOP = 3
const MOVE_BOTTOM = 4

/**
 * 表示当前光标所在格子的像素包围盒（Bounding Box）。
 *
 * 网格中每个格子在 SVG 像素坐标系中都有固定大小：
 *   - 交叉点（node，x%2==0 && y%2==0）：24×24px
 *   - 水平通道（x%2==1 && y%2==0）：82×24px（宽58+左右各12）
 *   - 垂直通道（x%2==0 && y%2==1）：24×82px
 *
 * BoundingBox 有两套坐标：
 *   - raw：格子本身的原始像素边界，是 shift() 操作的基准
 *   - x1/x2/y1/y2：对外暴露的实际边界，在 raw 基础上会因端点方向额外扩展 24px
 *
 * 每次光标跨越格子边界，changePos() 就会调用 shift() 让 bbox 平移到新格子，
 * 从而始终与 data.pos 描述的网格位置保持同步。
 */
class BoundingBox {
    private static BBOX_DEBUG = false;
    raw: { x1: number; x2: number; y1: number; y2: number };
    private readonly sym: boolean;
    readonly debug?: SVGElement;
    x1: number;
    x2: number;
    y1: number;
    y2: number;
    middle: { x: number; y: number };

    constructor(x1: number, x2: number, y1: number, y2: number, sym = false) {
        this.raw = {'x1': x1, 'x2': x2, 'y1': y1, 'y2': y2}
        this.sym = sym
        if (BoundingBox.BBOX_DEBUG === true) {
            this.debug = createElement('rect')
            data.svg.appendChild(this.debug)
            this.debug.setAttribute('opacity', String(0.5))
            this.debug.setAttribute('style', 'pointer-events: none;')
            if (data.puzzle.symmetry == null) {
                this.debug.setAttribute('fill', 'white')
            } else {
                if (this.sym !== true) {
                    this.debug.setAttribute('fill', 'blue')
                } else {
                    this.debug.setAttribute('fill', 'orange')
                }
            }
        }
        this._update()
    }

    shift(dir: string, pixels: number) {
        if (dir === 'left') {
            this.raw.x2 = this.raw.x1
            this.raw.x1 -= pixels
        } else if (dir === 'right') {
            this.raw.x1 = this.raw.x2
            this.raw.x2 += pixels
        } else if (dir === 'top') {
            this.raw.y2 = this.raw.y1
            this.raw.y1 -= pixels
        } else if (dir === 'bottom') {
            this.raw.y1 = this.raw.y2
            this.raw.y2 += pixels
        }
        this._update()
    }

    inMain(x: number, y: number) {
        const inMainBox =
            (this.x1 < x && x < this.x2) &&
            (this.y1 < y && y < this.y2);
        const inRawBox =
            (this.raw.x1 < x && x < this.raw.x2) &&
            (this.raw.y1 < y && y < this.raw.y2);

        return inMainBox && !inRawBox
    }

    _update() {
        let cell;
        this.x1 = this.raw.x1
        this.x2 = this.raw.x2
        this.y1 = this.raw.y1
        this.y2 = this.raw.y2

        // Check for endpoint adjustment
        if (this.sym !== true) {
            cell = data.puzzle.getCell(data.pos.x, data.pos.y);
        } else {
            cell = data.puzzle.getSymmetricalCell(data.sym.x, data.sym.y);
        }
        if (cell.end === 'left') {
            this.x1 -= 24
        } else if (cell.end === 'right') {
            this.x2 += 24
        } else if (cell.end === 'top') {
            this.y1 -= 24
        } else if (cell.end === 'bottom') {
            this.y2 += 24
        }

        this.middle = { // Note: Middle of the raw object
            'x': (this.raw.x1 + this.raw.x2) / 2,
            'y': (this.raw.y1 + this.raw.y2) / 2
        }

        if (this.debug != null) {
            this.debug.setAttribute('x', String(this.x1))
            this.debug.setAttribute('y', String(this.y1))
            this.debug.setAttribute('width', String(this.x2 - this.x1))
            this.debug.setAttribute('height', String(this.y2 - this.y1))
        }
    }
}

/**
 * 表示路径上的一个格子段，负责该格子内所有 SVG 元素的创建、更新和销毁。
 *
 * 每当光标进入一个新格子，onMove() 就 push 一个新的 PathSegment；
 * 回退时则 pop 并调用 destroy() 清除对应的 SVG 元素。
 *
 * 每个 PathSegment 由以下 SVG 元素组成：
 *   - poly1：从进入方向的格子边界到 middle 的矩形（"前半段"）
 *   - circ：格子 middle 处的圆圈（进入新格子时的"衔接圆"）
 *   - poly2：从 middle 到当前光标位置的矩形（"后半段"，跟随光标实时更新）
 *   - pillarCirc：柱形谜题（pillar）模式下用于遮盖接缝的额外圆圈
 *
 * 对称模式下，每个元素都有对应的 sym* 版本（symPoly1、symCirc 等）。
 */
class PathSegment {
    poly1: SVGElement
    circ: SVGElement
    poly2: SVGElement
    pillarCirc: SVGElement
    dir: number
    symPoly1: SVGElement
    symCirc: SVGElement
    symPoly2: SVGElement
    symPillarCirc: SVGElement

    constructor(dir: number) {
        if (!data.svg.contains(data.cursor)) {
            // According to telemetry, there are rare cases where the cursor is not a child of the svg.
            // This is probably a race condition between exiting with right click and tracing, but whatever.
            data.svg.insertBefore(data.cursor, data.svg.getElementById('cursorPos'))
        }

        this.poly1 = createElement('polygon')
        this.circ = createElement('circle')
        this.poly2 = createElement('polygon')
        this.pillarCirc = createElement('circle')
        this.dir = dir
        data.svg.insertBefore(this.circ, data.cursor)
        data.svg.insertBefore(this.poly2, data.cursor)
        data.svg.insertBefore(this.pillarCirc, data.cursor)
        this.circ.setAttribute('cx', String(data.bbox.middle.x))
        this.circ.setAttribute('cy', String(data.bbox.middle.y))

        if (data.puzzle.pillar === true) {
            // cx/cy are updated in redraw(), since pillarCirc tracks the cursor
            this.pillarCirc.setAttribute('cy', String(data.bbox.middle.y))
            this.pillarCirc.setAttribute('r', String(12))
            if (data.pos.x === 0 && this.dir === MOVE_RIGHT) {
                this.pillarCirc.setAttribute('cx', String(data.bbox.x1))
                this.pillarCirc.setAttribute('static', String(true))
            } else if (data.pos.x === data.puzzle.width - 1 && this.dir === MOVE_LEFT) {
                this.pillarCirc.setAttribute('cx', String(data.bbox.x2))
                this.pillarCirc.setAttribute('static', String(true))
            } else {
                this.pillarCirc.setAttribute('cx', String(data.bbox.middle.x))
            }
        }

        if (data.puzzle.symmetry == null) {
            this.poly1.setAttribute('class', 'line-1 ' + data.svg.id)
            this.circ.setAttribute('class', 'line-1 ' + data.svg.id)
            this.poly2.setAttribute('class', 'line-1 ' + data.svg.id)
            this.pillarCirc.setAttribute('class', 'line-1 ' + data.svg.id)
        } else {
            this.poly1.setAttribute('class', 'line-2 ' + data.svg.id)
            this.circ.setAttribute('class', 'line-2 ' + data.svg.id)
            this.poly2.setAttribute('class', 'line-2 ' + data.svg.id)
            this.pillarCirc.setAttribute('class', 'line-2 ' + data.svg.id)

            this.symPoly1 = createElement('polygon')
            this.symCirc = createElement('circle')
            this.symPoly2 = createElement('polygon')
            this.symPillarCirc = createElement('circle')
            data.svg.insertBefore(this.symCirc, data.cursor)
            data.svg.insertBefore(this.symPoly2, data.cursor)
            data.svg.insertBefore(this.symPillarCirc, data.cursor)
            this.symPoly1.setAttribute('class', 'line-3 ' + data.svg.id)
            this.symCirc.setAttribute('class', 'line-3 ' + data.svg.id)
            this.symPoly2.setAttribute('class', 'line-3 ' + data.svg.id)
            this.symPillarCirc.setAttribute('class', 'line-3 ' + data.svg.id)

            this.symCirc.setAttribute('cx', String(data.symbbox.middle.x))
            this.symCirc.setAttribute('cy', String(data.symbbox.middle.y))

            if (data.puzzle.pillar === true) {
                // cx/cy are updated in redraw(), since symPillarCirc tracks the cursor
                this.symPillarCirc.setAttribute('cy', String(data.symbbox.middle.y))
                this.symPillarCirc.setAttribute('r', String(12))
                const symmetricalDir = getSymmetricalDir(data.puzzle, this.dir);
                if (data.sym.x === 0 && symmetricalDir === MOVE_RIGHT) {
                    this.symPillarCirc.setAttribute('cx', String(data.symbbox.x1))
                    this.symPillarCirc.setAttribute('static', String(true))
                } else if (data.sym.x === data.puzzle.width - 1 && symmetricalDir === MOVE_LEFT) {
                    this.symPillarCirc.setAttribute('cx', String(data.symbbox.x2))
                    this.symPillarCirc.setAttribute('static', String(true))
                } else {
                    this.symPillarCirc.setAttribute('cx', String(data.symbbox.middle.x))
                }
            }
        }

        if (this.dir === MOVE_NONE) { // Start point
            this.circ.setAttribute('r', String(24))
            this.circ.setAttribute('class', this.circ.getAttribute('class') + ' start')
            if (data.puzzle.symmetry != null) {
                this.symCirc.setAttribute('r', String(24))
                this.symCirc.setAttribute('class', this.symCirc.getAttribute('class') + ' start')
            }
        } else {
            // Only insert poly1 in non-startpoints
            data.svg.insertBefore(this.poly1, data.cursor)
            this.circ.setAttribute('r', String(12))
            if (data.puzzle.symmetry != null) {
                data.svg.insertBefore(this.symPoly1, data.cursor)
                this.symCirc.setAttribute('r', String(12))
            }
        }
    }

    destroy() {
        data.svg.removeChild(this.poly1)
        data.svg.removeChild(this.circ)
        data.svg.removeChild(this.poly2)
        data.svg.removeChild(this.pillarCirc)
        if (data.puzzle.symmetry != null) {
            data.svg.removeChild(this.symPoly1)
            data.svg.removeChild(this.symCirc)
            data.svg.removeChild(this.symPoly2)
            data.svg.removeChild(this.symPillarCirc)
        }
    }

    redraw() { // Uses raw bbox because of endpoints
        // Move the cursor and related objects
        const x = clamp(data.x, data.bbox.x1, data.bbox.x2);
        const y = clamp(data.y, data.bbox.y1, data.bbox.y2);
        data.cursor.setAttribute('cx', String(x))
        data.cursor.setAttribute('cy', String(y))
        if (data.puzzle.symmetry != null) {
            data.symcursor.setAttribute('cx', this._reflX(x))
            data.symcursor.setAttribute('cy', this._reflY(y))
        }
        if (data.puzzle.pillar === true) {
            if (this.pillarCirc.getAttribute('static') == null) {
                this.pillarCirc.setAttribute('cx', String(x))
                this.pillarCirc.setAttribute('cy', String(y))
            }
            if (data.puzzle.symmetry != null) {
                if (this.symPillarCirc.getAttribute('static') == null) {
                    this.symPillarCirc.setAttribute('cx', this._reflX(x))
                    this.symPillarCirc.setAttribute('cy', this._reflY(y))
                }
            }
        }

        // Draw the first-half box
        const points1 = JSON.parse(JSON.stringify(data.bbox.raw));
        if (this.dir === MOVE_LEFT) {
            points1.x1 = clamp(data.x, data.bbox.middle.x, data.bbox.x2)
        } else if (this.dir === MOVE_RIGHT) {
            points1.x2 = clamp(data.x, data.bbox.x1, data.bbox.middle.x)
        } else if (this.dir === MOVE_TOP) {
            points1.y1 = clamp(data.y, data.bbox.middle.y, data.bbox.y2)
        } else if (this.dir === MOVE_BOTTOM) {
            points1.y2 = clamp(data.y, data.bbox.y1, data.bbox.middle.y)
        }
        this.poly1.setAttribute('points',
            points1.x1 + ' ' + points1.y1 + ',' +
            points1.x1 + ' ' + points1.y2 + ',' +
            points1.x2 + ' ' + points1.y2 + ',' +
            points1.x2 + ' ' + points1.y1
        )

        let firstHalf = false;
        const isEnd = ((data.puzzle.grid[data.pos.x][data.pos.y] as LineCell).end != null);
        // The second half of the line uses the raw so that it can enter the endpoint properly.
        const points2 = JSON.parse(JSON.stringify(data.bbox.raw));
        if (data.x < data.bbox.middle.x && this.dir !== MOVE_RIGHT) {
            points2.x1 = clamp(data.x, data.bbox.x1, data.bbox.middle.x)
            points2.x2 = data.bbox.middle.x
            if (isEnd && data.pos.x % 2 === 0 && data.pos.y % 2 === 1) {
                points2.y1 += 17
                points2.y2 -= 17
            }
        } else if (data.x > data.bbox.middle.x && this.dir !== MOVE_LEFT) {
            points2.x1 = data.bbox.middle.x
            points2.x2 = clamp(data.x, data.bbox.middle.x, data.bbox.x2)
            if (isEnd && data.pos.x % 2 === 0 && data.pos.y % 2 === 1) {
                points2.y1 += 17
                points2.y2 -= 17
            }
        } else if (data.y < data.bbox.middle.y && this.dir !== MOVE_BOTTOM) {
            points2.y1 = clamp(data.y, data.bbox.y1, data.bbox.middle.y)
            points2.y2 = data.bbox.middle.y
            if (isEnd && data.pos.x % 2 === 1 && data.pos.y % 2 === 0) {
                points2.x1 += 17
                points2.x2 -= 17
            }
        } else if (data.y > data.bbox.middle.y && this.dir !== MOVE_TOP) {
            points2.y1 = data.bbox.middle.y
            points2.y2 = clamp(data.y, data.bbox.middle.y, data.bbox.y2)
            if (isEnd && data.pos.x % 2 === 1 && data.pos.y % 2 === 0) {
                points2.x1 += 17
                points2.x2 -= 17
            }
        } else {
            firstHalf = true
        }

        this.poly2.setAttribute('points',
            points2.x1 + ' ' + points2.y1 + ',' +
            points2.x1 + ' ' + points2.y2 + ',' +
            points2.x2 + ' ' + points2.y2 + ',' +
            points2.x2 + ' ' + points2.y1
        )

        // Show the second poly only in the second half of the cell
        this.poly2.setAttribute('opacity', String(firstHalf ? 0 : 1))
        // Show the circle in the second half of the cell AND in the start
        if (firstHalf && this.dir !== MOVE_NONE) {
            this.circ.setAttribute('opacity', String(0))
        } else {
            this.circ.setAttribute('opacity', String(1))
        }

        // Draw the symmetrical path based on the original one
        if (data.puzzle.symmetry != null) {
            this.symPoly1.setAttribute('points',
                this._reflX(points1.x2) + ' ' + this._reflY(points1.y2) + ',' +
                this._reflX(points1.x2) + ' ' + this._reflY(points1.y1) + ',' +
                this._reflX(points1.x1) + ' ' + this._reflY(points1.y1) + ',' +
                this._reflX(points1.x1) + ' ' + this._reflY(points1.y2)
            )

            this.symPoly2.setAttribute('points',
                this._reflX(points2.x2) + ' ' + this._reflY(points2.y2) + ',' +
                this._reflX(points2.x2) + ' ' + this._reflY(points2.y1) + ',' +
                this._reflX(points2.x1) + ' ' + this._reflY(points2.y1) + ',' +
                this._reflX(points2.x1) + ' ' + this._reflY(points2.y2)
            )

            this.symCirc.setAttribute('opacity', this.circ.getAttribute('opacity'))
            this.symPoly2.setAttribute('opacity', this.poly2.getAttribute('opacity'))
        }
    }

    _reflX(x) {
        if (data.puzzle.symmetry == null) return x
        if (data.puzzle.symmetry.x === true) {
            // Mirror position inside the bounding box
            return (data.bbox.middle.x - x) + data.symbbox.middle.x
        }
        // Copy position inside the bounding box
        return (x - data.bbox.middle.x) + data.symbbox.middle.x
    }

    _reflY(y) {
        if (data.puzzle.symmetry == null) return y
        if (data.puzzle.symmetry.y === true) {
            // Mirror position inside the bounding box
            return (data.bbox.middle.y - y) + data.symbbox.middle.y
        }
        // Copy position inside the bounding box
        return (y - data.bbox.middle.y) + data.symbbox.middle.y
    }
}

/**
 * 将 value 夹在 [min, max] 区间内。
 */
function clamp(value: number, min: number, max: number) {
    return value < min ? min : value > max ? max : value
}

/**
 * 每帧鼠标/触摸移动时调用的核心函数，驱动整个追踪系统。
 *
 * 执行顺序：
 *   1. pushCursor / pushCursorWittle：将鼠标的原始 dx/dy 重定向，
 *      确保光标沿合法通道移动（处理外壁、内壁、交叉点转向）。
 *   2. 进入 while 循环，循环内每轮：
 *      a. hardCollision：检查 gap/对称线/起点碰撞，截断不合法的越界。
 *      b. move：检测光标是否越过格子边界，若越过则返回方向。
 *      c. redraw：用当前光标位置更新当前格子的 SVG 路径。
 *      d. 若 move 返回 MOVE_NONE，退出循环。
 *      e. 若是回退方向，pop 路径并清除旧格子标记。
 *      f. changePos：更新 data.pos 和 data.bbox 到新格子。
 *      g. 若是前进，push 新 PathSegment 并标记新格子已访问。
 *   （循环允许单帧内跨越多个格子，例如鼠标速度极快时）
 *
 * @param dx 本帧鼠标/触摸在 x 方向的移动量（已乘以灵敏度系数）
 * @param dy 本帧鼠标/触摸在 y 方向的移动量（已乘以灵敏度系数）
 */
export function onMove(dx: number, dy: number) {
    let collidedWith: string;
    {
        if (data.wittleTracing === true) {
            // Also handles some collision
            collidedWith = pushCursorWittle(dx, dy);
            console.debug('Collided with', collidedWith)
        } else {
            // Also handles some collision
            collidedWith = pushCursor(dx, dy);
            console.debug('Collided with', collidedWith)
        }
    }

    while (true) {
        hardCollision()

        // Potentially move the location to a new cell, and make absolute boundary checks
        const moveDir = move();
        data.path[data.path.length - 1].redraw()
        if (moveDir === MOVE_NONE) break // 没有跨格，本帧处理完毕
        console.debug('Moved', ['none', 'left', 'right', 'top', 'bottom'][moveDir])

        // Potentially adjust data.x/data.y if our position went around a pillar
        if (data.puzzle.pillar === true) pillarWrap(moveDir)

        const lastDir = data.path[data.path.length - 1].dir;
        const backedUp = ((moveDir === MOVE_LEFT && lastDir === MOVE_RIGHT)
            || (moveDir === MOVE_RIGHT && lastDir === MOVE_LEFT)
            || (moveDir === MOVE_TOP && lastDir === MOVE_BOTTOM)
            || (moveDir === MOVE_BOTTOM && lastDir === MOVE_TOP));


        // If we backed up, remove a path segment and mark the old cell as unvisited
        if (backedUp) {
            data.path.pop().destroy()
            data.puzzle.updateCell2(data.pos.x, data.pos.y, 'line', LINE_NONE)
            if (data.puzzle.symmetry != null) {
                data.puzzle.updateCell2(data.sym.x, data.sym.y, 'line', LINE_NONE)
            }
        }

        // Move to the next cell
        changePos(data.bbox, data.pos, moveDir)
        if (data.puzzle.symmetry != null) {
            const symMoveDir = getSymmetricalDir(data.puzzle, moveDir);
            changePos(data.symbbox, data.sym, symMoveDir)
        }

        // If we didn't back up, add a path segment and mark the new cell as visited
        if (!backedUp) {
            data.path.push(new PathSegment(moveDir))
            if (data.puzzle.symmetry == null) {
                data.puzzle.updateCell2(data.pos.x, data.pos.y, 'line', LINE_BLACK)
            } else {
                data.puzzle.updateCell2(data.pos.x, data.pos.y, 'line', LINE_BLUE)
                data.puzzle.updateCell2(data.sym.x, data.sym.y, 'line', LINE_YELLOW)
            }
        }
    }
}

export function trace(event: MouseEvent | TouchEvent, puzzle: Puzzle, pos: {
    x: number;
    y: number;
}, start: SVGElement, symStart = null) {
    if (start != null && data.tracing !== true) { // data.tracing could be undefined or false
        const svg = start.parentElement as unknown as SVGSVGElement;
        data.tracing = true
        data.wittleTracing = puzzle.config.wittleTracing
        Utils.PLAY_SOUND('start', puzzle.config.volume)
        // Cleans drawn lines & puzzle state
        clearGrid(svg, puzzle)
        onTraceStart(puzzle, pos, svg, start, symStart)
        data.animations.insertRule('.' + svg.id + '.start {animation: 150ms 1 forwards start-grow}\n')

        hookMovementEvents(start, puzzle.config.sensitivity)
    } else {
        event.stopPropagation()
        // Signal the onMouseMove to stop accepting input (race condition)
        data.tracing = false

        // At endpoint and in main box
        const cell = puzzle.getCell(data.pos.x, data.pos.y) as LineCell;
        if (cell.end != null && data.bbox.inMain(data.x, data.y)) {
            data.cursor.onpointerdown = null
            setTimeout(function () { // Run validation asynchronously so we can free the pointer immediately.
                puzzle.endPoint = data.pos
                const puzzleData = validate(puzzle, false); // We want all invalid elements so we can show the user.

                for (const negation of puzzleData.negations) {
                    console.debug('Rendering negation', negation)
                    data.animations.insertRule('.' + data.svg.id + '_' + negation.source.x + '_' + negation.source.y + ' {animation: 0.75s 1 forwards fade}\n')
                    data.animations.insertRule('.' + data.svg.id + '_' + negation.target.x + '_' + negation.target.y + ' {animation: 0.75s 1 forwards fade}\n')
                }

                if (puzzleData.valid()) {
                    Utils.PLAY_SOUND('success', puzzle.config.volume)
                    // !important to override the child animation
                    data.animations.insertRule('.' + data.svg.id + ' {animation: 1s 1 forwards line-success !important}\n')

                    // clear ends animations
                    Utils.deleteElementsByClassName(data.svg, 'end-hint')

                    // Convert the traced path into something suitable for solve.drawPath (for publishing purposes)
                    const rawPath: ({ x: number, y: number } | number)[] = [puzzle.startPoint];
                    for (let i = 1; i < data.path.length; i++) rawPath.push(data.path[i].dir)
                    rawPath.push(0)

                    // if (window.TRACE_COMPLETION_FUNC) window.TRACE_COMPLETION_FUNC(puzzle, rawPath)
                    puzzle.config.onSuccess(data.pos.x, data.pos.y)
                } else {
                    Utils.PLAY_SOUND('fail', puzzle.config.volume)
                    data.animations.insertRule('.' + data.svg.id + ' {animation: 1s 1 forwards line-fail !important}\n')
                    // Get list of invalid elements
                    if (puzzle.settings.FLASH_FOR_ERRORS) {
                        for (const invalidElement of puzzleData.invalidElements) {
                            data.animations.insertRule('.' + data.svg.id + '_' + invalidElement.x + '_' + invalidElement.y + ' {animation: 0.4s 20 alternate-reverse error}\n')
                        }
                    }
                }
            }, 1)

            // Right-clicked (or double-tapped) and not at the end: Clear puzzle
        } else if ((event as MouseEvent).button === 2 || (event as TouchEvent).touches?.length > 1) {
            Utils.PLAY_SOUND('abort', puzzle.config.volume)
            clearGrid(data.svg, puzzle)
        } else { // Exit lock but allow resuming from the cursor (Desktop only)
            data.cursor.onpointerdown = function () {
                if ((start.parentElement as unknown as SVGSVGElement) !== data.svg) return // Another puzzle is live, so data is gone
                data.tracing = true
                hookMovementEvents(start, puzzle.config.sensitivity);
            }
        }

        unhookMovementEvents()
    }
}

/**
 * 在绘制道路开始做一些处理
 * */
export function onTraceStart(puzzle: Puzzle, pos: {
    x: number,
    y: number
}, svg: SVGSVGElement, start: Element, symStart: Element = null) {
    let x = parseFloat(start.getAttribute('cx'));
    let y = parseFloat(start.getAttribute('cy'));

    const cursor = createElement('circle')
    cursor.setAttribute('r', String(12))
    cursor.setAttribute('fill', 'var(--cursor)')
    cursor.setAttribute('stroke', 'black')
    cursor.setAttribute('stroke-width', '2px')
    cursor.setAttribute('stroke-opacity', '0.4')
    cursor.setAttribute('class', 'cursor')
    cursor.setAttribute('cx', String(x))
    cursor.setAttribute('cy', String(y))
    svg.insertBefore(cursor, svg.getElementById('cursorPos'))

    // endpoints animations
    if (puzzle.config.enableEndHints) {
        const ends = Array.from(svg.querySelectorAll(`[id^="end_${svg.id}"]`)) as SVGElement[];
        for (let i = 0; i < ends.length; i++) {
            const cx = ends[i].getAttribute('cx')
            const cy = ends[i].getAttribute('cy')
            const end = createElement('circle')
            end.setAttribute('fill', 'none')
            end.setAttribute('class', 'end-hint')
            end.setAttribute('cx', String(cx))
            end.setAttribute('cy', String(cy))
            end.style.animation = 'end-hint-grow 2s infinite 1.5s'
            ends[i].after(end)
        }
    }

    data.svg = svg
    data.cursor = cursor
    data.x = x
    data.y = y
    data.pos = pos
    data.sym = puzzle.getSymmetricalPos(pos.x, pos.y)
    data.puzzle = puzzle
    data.path = []
    puzzle.startPoint = {'x': pos.x, 'y': pos.y}

    if (pos.x % 2 === 1) { // Start point is on a horizontal segment
        data.bbox = new BoundingBox(x - 29, x + 29, y - 12, y + 12)
    } else if (pos.y % 2 === 1) { // Start point is on a vertical segment
        data.bbox = new BoundingBox(x - 12, x + 12, y - 29, y + 29)
    } else { // Start point is at an intersection
        data.bbox = new BoundingBox(x - 12, x + 12, y - 12, y + 12)
    }

    // Robustly find the stylesheet titled 'animations'. Accessing some
    // entries in document.styleSheets can throw for cross-origin stylesheets,
    // so wrap in try/catch and ignore inaccessible sheets. If not found,
    // create a <style title="animations"> element and use its sheet.
    let animationsSheet: CSSStyleSheet | null = null;
    for (const ss of Array.from(document.styleSheets) as CSSStyleSheet[]) {
        try {
            // Prefer checking the ownerNode's title when available
            const owner = ss.ownerNode;
            if (owner && owner instanceof HTMLStyleElement && (owner as HTMLStyleElement).title === 'animations') {
                animationsSheet = ss;
                break;
            }
            // Some environments expose title directly on the stylesheet
            if (ss.title === 'animations') {
                animationsSheet = ss;
                break;
            }
        } catch (e) {
            // Ignore security/access errors on cross-origin stylesheets
            throw Error(e)
        }
    }

    if (!animationsSheet) {
        const styleEl = document.createElement('style');
        styleEl.title = 'animations';
        document.head.appendChild(styleEl);
        animationsSheet = styleEl.sheet as CSSStyleSheet;
    }

    // Store the stylesheet on the data object via the index signature so existing
    // callers like data.animations.insertRule(...) continue to work.
    data.animations = animationsSheet;

    clearAnimations()

    // Add initial line segments + secondary symmetry cursor, if needed
    if (puzzle.symmetry == null) {
        data.puzzle.updateCell2(data.pos.x, data.pos.y, 'type', 'line')
        data.puzzle.updateCell2(data.pos.x, data.pos.y, 'line', LINE_BLACK)
    } else {
        data.puzzle.updateCell2(data.pos.x, data.pos.y, 'type', 'line')
        data.puzzle.updateCell2(data.pos.x, data.pos.y, 'line', LINE_BLUE)
        data.puzzle.updateCell2(data.sym.x, data.sym.y, 'type', 'line')
        data.puzzle.updateCell2(data.sym.x, data.sym.y, 'line', LINE_YELLOW)

        const dx = parseFloat(symStart.getAttribute('cx')) - data.x;
        const dy = parseFloat(symStart.getAttribute('cy')) - data.y;
        data.symbbox = new BoundingBox(
            data.bbox.raw.x1 + dx,
            data.bbox.raw.x2 + dx,
            data.bbox.raw.y1 + dy,
            data.bbox.raw.y2 + dy,
            true)

        data.symcursor = createElement('circle')
        svg.insertBefore(data.symcursor, data.cursor)
        data.symcursor.setAttribute('class', 'line-3 ' + data.svg.id)
        data.symcursor.setAttribute('cx', symStart.getAttribute('cx'))
        data.symcursor.setAttribute('cy', symStart.getAttribute('cy'))
        data.symcursor.setAttribute('r', String(12))
    }
    // Fixup: Mark out of bounds cells as null, setting inbounds cells as {}
    // This allows tracing to correctly identify inbounds cells (and thus interior walls) and correctly handle exterior walls for oddly shaped puzzles.
    {
        const savedGrid = data.puzzle.switchToMaskedGrid();
        const maskedGrid = data.puzzle.grid;
        data.puzzle.grid = savedGrid

        for (x = 1; x < data.puzzle.width; x += 2) {
            for (y = 1; y < data.puzzle.height; y += 2) {
                if (maskedGrid[x][y] == null) { // null == MASKED_OOB
                    data.puzzle.grid[x][y] = null
                } else if (data.puzzle.grid[x][y] == null) {
                    data.puzzle.grid[x][y] = {'type': 'nonce'}
                }
            }
        }
    }
    data.path.push(new PathSegment(MOVE_NONE)) // Must be created after initializing data.symbbox
}

export function clearAnimations() {
    if (data.animations == null) return
    for (let i = 0; i < data.animations.cssRules.length; i++) {
        const rule = data.animations.cssRules[i];
        if (rule instanceof CSSStyleRule && rule.selectorText.startsWith('.' + data.svg.id)) {
            data.animations.deleteRule(i--)
        }
    }
}

// This copy is an exact copy of puzzle.getSymmetricalDir, except that it uses MOVE_* values instead of strings
function getSymmetricalDir(puzzle: Puzzle, dir: number) {
    if (puzzle.symmetry != null) {
        if (puzzle.symmetry.x === true) {
            if (dir === MOVE_LEFT) return MOVE_RIGHT
            if (dir === MOVE_RIGHT) return MOVE_LEFT
        }
        if (puzzle.symmetry.y === true) {
            if (dir === MOVE_TOP) return MOVE_BOTTOM
            if (dir === MOVE_BOTTOM) return MOVE_TOP
        }
    }
    return dir
}

// Redirect momentum from pushing against walls, so that all further moment steps
// will be strictly linear. Returns a string for logging purposes only.
function pushCursorWittle(dx: number, dy: number) {
    // Outer wall collision
    const cell = data.puzzle.getCell(data.pos.x, data.pos.y) as LineCell;
    if (cell == null) return 'nothing'

    // Only consider non-endpoints or endpoints which are parallel
    if ([undefined, 'top', 'bottom'].includes(cell.end)) {
        const leftCell = data.puzzle.getCell(data.pos.x - 1, data.pos.y) as LineCell;
        if (leftCell == null || leftCell.gap === GAP_FULL) {
            if (dy <= 0 && push(dx, dy, 'left', 'top')) return 'left outer wall, top'
            if (dy > 0 && push(dx, dy, 'left', 'bottom')) return 'left outer wall, bottom'
        }
        const rightCell = data.puzzle.getCell(data.pos.x + 1, data.pos.y) as LineCell;
        if (rightCell == null || rightCell.gap === GAP_FULL) {
            if (dy <= 0 && push(dx, dy, 'right', 'top')) return 'right outer wall, top'
            if (dy > 0 && push(dx, dy, 'right', 'bottom')) return 'right outer wall, bottom'
        }
    }
    // Only consider non-endpoints or endpoints which are parallel
    if ([undefined, 'left', 'right'].includes(cell.end)) {
        const topCell = data.puzzle.getCell(data.pos.x, data.pos.y - 1) as LineCell;
        if (topCell == null || topCell.gap === GAP_FULL) {
            if (dx <= 0 && push(dx, dy, 'top', 'left')) return 'top outer wall, left'
            if (dx > 0 && push(dx, dy, 'top', 'right')) return 'top outer wall, right'
        }
        const bottomCell = data.puzzle.getCell(data.pos.x, data.pos.y + 1) as LineCell;
        if (bottomCell == null || bottomCell.gap === GAP_FULL) {
            if (dx <= 0 && push(dx, dy, 'bottom', 'left')) return 'bottom outer wall, left'
            if (dx > 0 && push(dx, dy, 'bottom', 'right')) return 'bottom outer wall, right'
        }
    }

    // Inner wall collision
    if (cell.end == null) {
        if (data.pos.x % 2 === 1 && data.pos.y % 2 === 0) { // Horizontal cell
            if (dx < 0 || (dx == 0 && data.x < data.bbox.middle.x)) {
                push(dx, dy, 'topbottom', 'left')
                return 'topbottom inner wall, moved left'
            } else {
                push(dx, dy, 'topbottom', 'right')
                return 'topbottom inner wall, moved right'
            }
        } else if (data.pos.x % 2 === 0 && data.pos.y % 2 === 1) { // Vertical cell
            if (dy < 0 || (dy == 0 && data.y < data.bbox.middle.y)) {
                push(dx, dy, 'leftright', 'top')
                return 'leftright inner wall, moved up'
            } else {
                push(dx, dy, 'leftright', 'bottom')
                return 'leftright inner wall, moved down'
            }
        }
    }

    // Intersection & endpoint collision
    // Ratio of movement to be considered turning at an intersection
    const turnMod = 2;
    if ((data.pos.x % 2 === 0 && data.pos.y % 2 === 0) || cell.end != null) {
        if (data.x < data.bbox.middle.x) {
            push(dx, dy, 'topbottom', 'right')
            // Overshot the intersection and appears to be trying to turn
            if (data.x > data.bbox.middle.x && Math.abs(dy) * turnMod > Math.abs(dx)) {
                data.y += Math.sign(dy) * (data.x - data.bbox.middle.x)
                data.x = data.bbox.middle.x
                return 'overshot moving right'
            }
            return 'intersection moving right'
        } else if (data.x > data.bbox.middle.x) {
            push(dx, dy, 'topbottom', 'left')
            // Overshot the intersection and appears to be trying to turn
            if (data.x < data.bbox.middle.x && Math.abs(dy) * turnMod > Math.abs(dx)) {
                data.y += Math.sign(dy) * (data.bbox.middle.x - data.x)
                data.x = data.bbox.middle.x
                return 'overshot moving left'
            }
            return 'intersection moving left'
        }
        if (data.y < data.bbox.middle.y) {
            push(dx, dy, 'leftright', 'bottom')
            // Overshot the intersection and appears to be trying to turn
            if (data.y > data.bbox.middle.y && Math.abs(dx) * turnMod > Math.abs(dy)) {
                data.x += Math.sign(dx) * (data.y - data.bbox.middle.y)
                data.y = data.bbox.middle.y
                return 'overshot moving down'
            }
            return 'intersection moving down'
        } else if (data.y > data.bbox.middle.y) {
            push(dx, dy, 'leftright', 'top')
            // Overshot the intersection and appears to be trying to turn
            if (data.y < data.bbox.middle.y && Math.abs(dx) * turnMod > Math.abs(dy)) {
                data.x += Math.sign(dx) * (data.bbox.middle.y - data.y)
                data.y = data.bbox.middle.y
                return 'overshot moving up'
            }
            return 'intersection moving up'
        }
    }

    // No collision, limit movement to X or Y only to prevent out-of-bounds
    if (Math.abs(dx) > Math.abs(dy)) {
        data.x += dx
        return 'nothing, x'
    } else {
        data.y += dy
        return 'nothing, y'
    }
}

// Redirect momentum from pushing against walls, so that all further moment steps
// will be strictly linear. Returns a string for logging purposes only.
/**
 * 标准模式下的光标动量重定向函数。
 *
 * 每帧调用一次，在鼠标原始 dx/dy 被应用到 data.x/data.y 之前，
 * 根据当前格子类型和碰撞情况决定如何重定向动量：
 *
 *   - 外壁碰撞：相邻格不可走 → 把垂直于壁的动量转给平行方向（滑壁效果）
 *   - 通道内壁：水平/垂直通道两侧被封死 → 把垂直通道的动量转给通道方向
 *   - 交叉点：分两步：① 先把侧向动量转给前进方向（吸附到中心线）；
 *             ② 若本帧动量大到飞越中心（overshot），且 y 方向为主导，
 *                则把超出量转给 y 并把 x 锁回中心（实现平滑转向）
 *   - 无碰撞：取 dx/dy 中绝对值更大的分量，严格单轴移动
 *
 * 与 wittle 版本的差异：外壁 targetDir 固定为 'top'/'right'，
 * 不考虑鼠标的实际移动方向。
 *
 * @param dx 本帧 x 方向移动量
 * @param dy 本帧 y 方向移动量
 * @returns  碰撞描述字符串（仅用于调试日志）
 */
function pushCursor(dx: number, dy: number) {
    // Outer wall collision
    const cell = data.puzzle.getCell(data.pos.x, data.pos.y) as LineCell;
    if (cell == null) return 'nothing'

    // Only consider non-endpoints or endpoints which are parallel
    if ([undefined, 'top', 'bottom'].includes(cell.end)) {
        const leftCell = data.puzzle.getCell(data.pos.x - 1, data.pos.y) as LineCell;
        if (leftCell == null || leftCell.gap === GAP_FULL) {
            if (push(dx, dy, 'left', 'top')) return 'left outer wall'
        }
        const rightCell = data.puzzle.getCell(data.pos.x + 1, data.pos.y) as LineCell;
        if (rightCell == null || rightCell.gap === GAP_FULL) {
            if (push(dx, dy, 'right', 'top')) return 'right outer wall'
        }
    }
    // Only consider non-endpoints or endpoints which are parallel
    if ([undefined, 'left', 'right'].includes(cell.end)) {
        const topCell = data.puzzle.getCell(data.pos.x, data.pos.y - 1) as LineCell;
        if (topCell == null || topCell.gap === GAP_FULL) {
            if (push(dx, dy, 'top', 'right')) return 'top outer wall'
        }
        const bottomCell = data.puzzle.getCell(data.pos.x, data.pos.y + 1) as LineCell;
        if (bottomCell == null || bottomCell.gap === GAP_FULL) {
            if (push(dx, dy, 'bottom', 'right')) return 'bottom outer wall'
        }
    }

    // Inner wall collision
    if (cell.end == null) {
        if (data.pos.x % 2 === 1 && data.pos.y % 2 === 0) { // Horizontal cell
            if (data.x < data.bbox.middle.x) {
                push(dx, dy, 'topbottom', 'left')
                return 'topbottom inner wall, moved left'
            } else {
                push(dx, dy, 'topbottom', 'right')
                return 'topbottom inner wall, moved right'
            }
        } else if (data.pos.x % 2 === 0 && data.pos.y % 2 === 1) { // Vertical cell
            if (data.y < data.bbox.middle.y) {
                push(dx, dy, 'leftright', 'top')
                return 'leftright inner wall, moved up'
            } else {
                push(dx, dy, 'leftright', 'bottom')
                return 'leftright inner wall, moved down'
            }
        }
    }

    // Intersection & endpoint collision
    // Ratio of movement to be considered turning at an intersection
    const turnMod = 2;
    if ((data.pos.x % 2 === 0 && data.pos.y % 2 === 0) || cell.end != null) {
        if (data.x < data.bbox.middle.x) {
            push(dx, dy, 'topbottom', 'right')
            // Overshot the intersection and appears to be trying to turn
            if (data.x > data.bbox.middle.x && Math.abs(dy) * turnMod > Math.abs(dx)) {
                data.y += Math.sign(dy) * (data.x - data.bbox.middle.x)
                data.x = data.bbox.middle.x
                return 'overshot moving right'
            }
            return 'intersection moving right'
        } else if (data.x > data.bbox.middle.x) {
            push(dx, dy, 'topbottom', 'left')
            // Overshot the intersection and appears to be trying to turn
            if (data.x < data.bbox.middle.x && Math.abs(dy) * turnMod > Math.abs(dx)) {
                data.y += Math.sign(dy) * (data.bbox.middle.x - data.x)
                data.x = data.bbox.middle.x
                return 'overshot moving left'
            }
            return 'intersection moving left'
        }
        if (data.y < data.bbox.middle.y) {
            push(dx, dy, 'leftright', 'bottom')
            // Overshot the intersection and appears to be trying to turn
            if (data.y > data.bbox.middle.y && Math.abs(dx) * turnMod > Math.abs(dy)) {
                data.x += Math.sign(dx) * (data.y - data.bbox.middle.y)
                data.y = data.bbox.middle.y
                return 'overshot moving down'
            }
            return 'intersection moving down'
        } else if (data.y > data.bbox.middle.y) {
            push(dx, dy, 'leftright', 'top')
            // Overshot the intersection and appears to be trying to turn
            if (data.y < data.bbox.middle.y && Math.abs(dx) * turnMod > Math.abs(dy)) {
                data.x += Math.sign(dx) * (data.bbox.middle.y - data.y)
                data.y = data.bbox.middle.y
                return 'overshot moving up'
            }
            return 'intersection moving up'
        }
    }

    // No collision, limit movement to X or Y only to prevent out-of-bounds
    if (Math.abs(dx) > Math.abs(dy)) {
        data.x += dx
        return 'nothing, x'
    } else {
        data.y += dy
        return 'nothing, y'
    }
}

// Check to see if we collided with any gaps, or with a symmetrical line, or a startpoint.
// In any case, abruptly zero momentum.
/**
 * 检测 gap（断开）、对称线自交、起点重叠等"硬碰撞"，并截断光标位置。
 *
 * 与 pushCursor 处理的"软碰撞"（外壁/内壁/转向）不同，
 * 硬碰撞会立即且强制地把光标锁在 middle 附近，不允许任何动量穿越。
 *
 * 触发场景：
 *   - 当前格子有 GAP_BREAK（半断开）：gapSize = 21
 *   - 下一格是另一个已有线的起点：gapSize = -5（允许轻微超出以贴合视觉）
 *   - 对称模式下，主路径与对称路径的网格坐标重合：gapSize = 13
 *   - 对称路径的对应格子有 GAP_BREAK：gapSize = 21
 */
function hardCollision() {
    const lastDir = data.path[data.path.length - 1].dir;
    const cell = data.puzzle.getCell(data.pos.x, data.pos.y) as LineCell;
    if (cell == null) return

    let gapSize = 0;
    if (cell.gap === GAP_BREAK) {
        console.debug('Collided with a gap')
        gapSize = 21
    } else {
        let nextCell = null;
        if (lastDir === MOVE_LEFT) nextCell = data.puzzle.getCell(data.pos.x - 1, data.pos.y)
        if (lastDir === MOVE_RIGHT) nextCell = data.puzzle.getCell(data.pos.x + 1, data.pos.y)
        if (lastDir === MOVE_TOP) nextCell = data.puzzle.getCell(data.pos.x, data.pos.y - 1)
        if (lastDir === MOVE_BOTTOM) nextCell = data.puzzle.getCell(data.pos.x, data.pos.y + 1)
        if (nextCell != null && nextCell.start === true && nextCell.line > LINE_NONE) {
            gapSize = -5
        }
    }

    if (data.puzzle.symmetry != null) {
        if (data.sym.x === data.pos.x && data.sym.y === data.pos.y) {
            console.debug('Collided with our symmetrical line')
            gapSize = 13
        } else if ((data.puzzle.getCell(data.sym.x, data.sym.y) as LineCell).gap === GAP_BREAK) {
            console.debug('Symmetrical line hit a gap')
            gapSize = 21
        }
    }
    if (gapSize === 0) return // Didn't collide with anything

    if (lastDir === MOVE_LEFT) {
        data.x = Math.max(data.bbox.middle.x + gapSize, data.x)
    } else if (lastDir === MOVE_RIGHT) {
        data.x = Math.min(data.x, data.bbox.middle.x - gapSize)
    } else if (lastDir === MOVE_TOP) {
        data.y = Math.max(data.bbox.middle.y + gapSize, data.y)
    } else if (lastDir === MOVE_BOTTOM) {
        data.y = Math.min(data.y, data.bbox.middle.y - gapSize)
    }
}

// Check to see if we've gone beyond the edge of puzzle cell, and if the next cell is safe,
// i.e. not out of bounds. Reports the direction we are going to move (or none),
// but does not actually change data.pos
/**
 * 检测光标是否越过了当前格子的绝对边界，并判断能否进入相邻格子。
 *
 * 检测逻辑（以向左为例）：
 *   1. 若 data.x < bbox.x1 + 12（光标进入左侧触发区）：
 *      a. 查询左侧格子（getCell(pos.x-1, pos.y)）
 *      b. 若为 null / 非 line 类型 / GAP_FULL → clamp，阻止穿越
 *      c. 若左侧格子已有线且不是从左边回来 → clamp（防止穿越自己的路径）
 *      d. 对称模式下对称格子同样检查
 *      e. 经过以上夹断后，若 data.x 仍 < bbox.x1 → return MOVE_LEFT（触发跨格）
 *   2. 其他三个方向同理
 *   3. 四个方向都不触发 → return MOVE_NONE
 *
 * 注意：此函数只报告方向，不修改 data.pos 或 bbox，由调用方 onMove() 处理。
 *
 * @returns MOVE_LEFT / MOVE_RIGHT / MOVE_TOP / MOVE_BOTTOM / MOVE_NONE
 */
function move() {
    let symCell: Cell;
    let cell: Cell;
    const lastDir = data.path[data.path.length - 1].dir;

    if (data.x < data.bbox.x1 + 12) { // Moving left
        cell = data.puzzle.getCell(data.pos.x - 1, data.pos.y);
        if (cell == null || cell.type !== 'line' || cell.gap === GAP_FULL) {
            console.debug('Collided with outside / gap-2', cell)
            data.x = data.bbox.x1 + 12
        } else if (cell.line > LINE_NONE && lastDir !== MOVE_RIGHT) {
            console.debug('Collided with other line', cell.line)
            data.x = data.bbox.x1 + 12
        } else if (data.puzzle.symmetry != null) {
            symCell = data.puzzle.getSymmetricalCell(data.pos.x - 1, data.pos.y);
            if (symCell == null || symCell.type !== 'line' || symCell.gap === GAP_FULL) {
                console.debug('Collided with symmetrical outside / gap-2', cell)
                data.x = data.bbox.x1 + 12
            }
        }
        if (data.x < data.bbox.x1) {
            return MOVE_LEFT
        }
    } else if (data.x > data.bbox.x2 - 12) { // Moving right
        cell = data.puzzle.getCell(data.pos.x + 1, data.pos.y);
        if (cell == null || cell.type !== 'line' || cell.gap === GAP_FULL) {
            console.debug('Collided with outside / gap-2', cell)
            data.x = data.bbox.x2 - 12
        } else if (cell.line > LINE_NONE && lastDir !== MOVE_LEFT) {
            console.debug('Collided with other line', cell.line)
            data.x = data.bbox.x2 - 12
        } else if (data.puzzle.symmetry != null) {
            symCell = data.puzzle.getSymmetricalCell(data.pos.x + 1, data.pos.y);
            if (symCell == null || symCell.type !== 'line' || symCell.gap === GAP_FULL) {
                console.debug('Collided with symmetrical outside / gap-2', cell)
                data.x = data.bbox.x2 - 12
            }
        }
        if (data.x > data.bbox.x2) {
            return MOVE_RIGHT
        }
    } else if (data.y < data.bbox.y1 + 12) { // Moving up
        cell = data.puzzle.getCell(data.pos.x, data.pos.y - 1);
        if (cell == null || cell.type !== 'line' || cell.gap === GAP_FULL) {
            console.debug('Collided with outside / gap-2', cell)
            data.y = data.bbox.y1 + 12
        } else if (cell.line > LINE_NONE && lastDir !== MOVE_BOTTOM) {
            console.debug('Collided with other line', cell.line)
            data.y = data.bbox.y1 + 12
        } else if (data.puzzle.symmetry != null) {
            symCell = data.puzzle.getSymmetricalCell(data.pos.x, data.pos.y - 1);
            if (symCell == null || symCell.type !== 'line' || symCell.gap === GAP_FULL) {
                console.debug('Collided with symmetrical outside / gap-2', cell)
                data.y = data.bbox.y1 + 12
            }
        }
        if (data.y < data.bbox.y1) {
            return MOVE_TOP
        }
    } else if (data.y > data.bbox.y2 - 12) { // Moving down
        cell = data.puzzle.getCell(data.pos.x, data.pos.y + 1);
        if (cell == null || cell.type !== 'line' || cell.gap === GAP_FULL) {
            console.debug('Collided with outside / gap-2')
            data.y = data.bbox.y2 - 12
        } else if (cell.line > LINE_NONE && lastDir !== MOVE_TOP) {
            console.debug('Collided with other line', cell.line)
            data.y = data.bbox.y2 - 12
        } else if (data.puzzle.symmetry != null) {
            symCell = data.puzzle.getSymmetricalCell(data.pos.x, data.pos.y + 1);
            if (symCell == null || symCell.type !== 'line' || symCell.gap === GAP_FULL) {
                console.debug('Collided with symmetrical outside / gap-2', cell)
                data.y = data.bbox.y2 - 12
            }
        }
        if (data.y > data.bbox.y2) {
            return MOVE_BOTTOM
        }
    }
    return MOVE_NONE
}

// Check to see if you moved beyond the edge of a pillar.
// If so, wrap the cursor x to preserve momentum.
// Note that this still does not change the position.
function pillarWrap(moveDir: number) {
    if (moveDir === MOVE_LEFT && data.pos.x === 0) {
        data.x += data.puzzle.width * 41
    }
    if (moveDir === MOVE_RIGHT && data.pos.x === data.puzzle.width - 1) {
        data.x -= data.puzzle.width * 41
    }
}

// Actually change the data position. (Note that this takes in pos to allow easier symmetry).
// Note that this doesn't zero the momentum, so that we can adjust appropriately on further loops.
// This function also shifts the bounding box that we use to determine the bounds of the cell.
function changePos(bbox: BoundingBox | void[], pos: { x: number; y: number; }, moveDir: number) {
    if (moveDir === MOVE_LEFT) {
        pos.x--
        // Wrap around the left
        if (data.puzzle.pillar === true && pos.x < 0) {
            pos.x += data.puzzle.width
            bbox.shift('right', data.puzzle.width * 41 - 82)
            bbox.shift('right', 58)
        } else {
            bbox.shift('left', (pos.x % 2 === 0 ? 24 : 58))
        }
    } else if (moveDir === MOVE_RIGHT) {
        pos.x++
        // Wrap around to the right
        if (data.puzzle.pillar === true && pos.x >= data.puzzle.width) {
            pos.x -= data.puzzle.width
            bbox.shift('left', data.puzzle.width * 41 - 82)
            bbox.shift('left', 24)
        } else {
            bbox.shift('right', (pos.x % 2 === 0 ? 24 : 58))
        }
    } else if (moveDir === MOVE_TOP) {
        pos.y--
        bbox.shift('top', (pos.y % 2 === 0 ? 24 : 58))
    } else if (moveDir === MOVE_BOTTOM) {
        pos.y++
        bbox.shift('bottom', (pos.y % 2 === 0 ? 24 : 58))
    }
}

// Helper function for pushCursor. Used to determine the direction and magnitude of redirection.
function push(dx: number, dy: number, dir: string, targetDir: 'left' | 'top' | 'right' | 'bottom') {
    // Fraction of movement to redirect in the other direction
    let movementRatio = null;
    if (targetDir === 'left' || targetDir === 'top') {
        movementRatio = data.wittleTracing === true ? -1 : -3
    } else if (targetDir === 'right' || targetDir === 'bottom') {
        movementRatio = data.wittleTracing === true ? 1 : 3
    }

    let overshoot;
    if (dir === 'left') {
        overshoot = data.bbox.x1 - (data.x + dx) + 12;
        if (overshoot > 0) {
            data.y += dy + overshoot / movementRatio
            data.x = data.bbox.x1 + 12
            return true
        }
    } else if (dir === 'right') {
        overshoot = (data.x + dx) - data.bbox.x2 + 12;
        if (overshoot > 0) {
            data.y += dy + overshoot / movementRatio
            data.x = data.bbox.x2 - 12
            return true
        }
    } else if (dir === 'leftright') {
        data.y += dy + Math.abs(dx) / movementRatio
        return true
    } else if (dir === 'top') {
        overshoot = data.bbox.y1 - (data.y + dy) + 12;
        if (overshoot > 0) {
            data.x += dx + overshoot / movementRatio
            data.y = data.bbox.y1 + 12
            return true
        }
    } else if (dir === 'bottom') {
        overshoot = (data.y + dy) - data.bbox.y2 + 12;
        if (overshoot > 0) {
            data.x += dx + overshoot / movementRatio
            data.y = data.bbox.y2 - 12
            return true
        }
    } else if (dir === 'topbottom') {
        data.x += dx + Math.abs(dy) / movementRatio
        return true
    }
    return false
}

function clearGrid(svg: SVGSVGElement | Element, puzzle: Puzzle) {
    if (data.bbox != null && data.bbox.debug != null) {
        data.svg.removeChild(data.bbox.debug)
        data.bbox = null
    }
    if (data.symbbox != null && data.symbbox.debug != null) {
        data.svg.removeChild(data.symbbox.debug)
        data.symbbox = null
    }

    Utils.deleteElementsByClassName(svg, 'cursor')
    Utils.deleteElementsByClassName(svg, 'end-hint')
    Utils.deleteElementsByClassName(svg, 'line-1')
    Utils.deleteElementsByClassName(svg, 'line-2')
    Utils.deleteElementsByClassName(svg, 'line-3')
    puzzle.clearLines()
}

/**
 * 开始追踪鼠标并绘制线
 * */
function hookMovementEvents(start: SVGElement, sensitivity: number) {
    data.start = start
    if (start.requestPointerLock != null) start.requestPointerLock()
    // if (start.mozRequestPointerLock != null) start.mozRequestPointerLock() // 旧版浏览器适配

    const sens = sensitivity;
    document.onmousemove = function (event) {
        // Working around a race condition where movement events fire after the handler is removed.
        if (data.tracing !== true) return
        // Prevent accidental fires on mobile platforms (ios and android). They will be handled via ontouchmove instead.
        if (event.movementX == null) return
        onMove(sens * event.movementX, sens * event.movementY)
    }
    document.ontouchstart = function (event) {
        if (event.touches.length > 1) {
            // Stop tracing for two+ finger touches (the equivalent of a right click on desktop)
            trace(event, data.puzzle, null, null, null)
            return
        }
        data.lastTouchPos = {
            'x': (event.touches && event.touches[0].pageX) || null,
            'y': (event.touches && event.touches[0].pageY) || null,
        }
    }
    document.ontouchmove = function (event) {
        if (data.tracing !== true) return

        let eventIsWithinPuzzle = false;
        for (let node = event.target as Element; node != null; node = node.parentElement) {
            if (node == data.svg) {
                eventIsWithinPuzzle = true
                break
            }
        }
        if (!eventIsWithinPuzzle) return // Ignore drag events that aren't within the puzzle
        event.preventDefault() // Prevent accidental scrolling if the touch event is within the puzzle.

        const newPos = {
            'x': (event.touches && event.touches[0].pageX) || null,
            'y': (event.touches && event.touches[0].pageY) || null,
        }
        onMove(newPos.x - data.lastTouchPos.x, newPos.y - data.lastTouchPos.y)
        data.lastTouchPos = newPos
    }
    document.ontouchend = function (event) {
        data.lastTouchPos = null
        // Only call window.trace (to stop tracing) if we're really in an endpoint.
        const cell = data.puzzle.getCell(data.pos.x, data.pos.y) as LineCell;
        if (cell.end != null && data.bbox.inMain(data.x, data.y)) {
            trace(event, data.puzzle, null, null, null)
        }
    }
}

function unhookMovementEvents() {
    data.start = null
    document.onmousemove = null
    document.ontouchstart = null
    document.ontouchmove = null
    document.ontouchend = null
    if (document.exitPointerLock != null) document.exitPointerLock()
    // if (document.mozExitPointerLock != null) document.mozExitPointerLock() // legacy
}
