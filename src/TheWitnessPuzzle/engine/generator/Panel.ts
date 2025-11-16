// decoration.ts

// 定义 Comparable 接口（可选）
interface Comparable<T> {
    compareTo(other: T): number;
}

export interface SolutionPoint {
    pointA: number;
    pointB: number;
    pointC: number;
    pointD: number;

    f1x: number;
    f1y: number;
    f2x: number;
    f2y: number;
    f3x: number;
    f3y: number;
    f4x: number;
    f4y: number;

    endnum: number;
}

export class Point implements Comparable<Point> {
    static pillarWidth: number = 0;

    first: number;
    second: number;

    constructor();
    constructor(x: number, y: number);
    constructor(x?: number, y?: number) {
        if (x === undefined && y === undefined) {
            this.first = 0;
            this.second = 0;
        } else {
            // 模拟 C# 中的逻辑：first 被 pillarWidth 取模
            if (Point.pillarWidth !== 0) {
                this.first = (x! + Point.pillarWidth) % Point.pillarWidth;
            } else {
                this.first = x!;
            }
            this.second = y!;
        }
    }

    // 加法: p1.add(p2)
    static add(p1: Point, p2: Point): Point {
        return new Point(p1.first + p2.first, p1.second + p2.second);
    }

    // 乘法: p.multiply(n)
    static multiply(p: Point, d: number): Point {
        return new Point(p.first * d, p.second * d);
    }

    // 除法: p.divide(n)
    static divide(p: Point, d: number): Point {
        return new Point(Math.trunc(p.first / d), Math.trunc(p.second / d));
    }

    // 相等比较
    static equals(p1: Point, p2: Point): boolean {
        return p1.first === p2.first && p1.second === p2.second;
    }

    // 不等比较
    static notEquals(p1: Point, p2: Point): boolean {
        return !Point.equals(p1, p2);
    }

    // 实现 comparable 接口
    compareTo(other: Point): number {
        if (this.first === other.first && this.second === other.second) return 0;
        if (this.first < other.first || (this.first === other.first && this.second < other.second)) return -1;
        return 1;
    }

    // 重写 toString 便于调试
    toString(): string {
        return `Point(${this.first}, ${this.second})`;
    }

    // 可选：为了链式调用或易用性，添加实例方法包装
    add(other: Point): Point {
        return Point.add(this, other);
    }

    multiply(scalar: number): Point {
        return Point.multiply(this, scalar);
    }

    divide(scalar: number): Point {
        return Point.divide(this, scalar);
    }

    equals(other: Point): boolean {
        return Point.equals(this, other);
    }

    notEquals(other: Point): boolean {
        return Point.notEquals(this, other);
    }
}

export class Color {
    public r: number;
    public g: number;
    public b: number;
    public a: number;

    constructor(red: number, green: number, blue: number, alpha: number) {
        this.r = red;
        this.g = green;
        this.b = blue;
        this.a = alpha;
    }

    lessThan(other: Color): boolean {
        const thisValue = this.r * 8 + this.g * 4 + this.b * 2 + this.a;
        const otherValue = other.r * 8 + other.g * 4 + other.b * 2 + other.a;
        return thisValue > otherValue; // 注意：C# 中是 >，但命名为 `<`
    }

    greaterThan(other: Color): boolean {
        return other.lessThan(this); // 即：this > other 等价于 other < this
    }
}

export namespace Decoration {
    export enum Shape {
        Exit = 0x600001,
        Start = 0x600002,
        Stone = 0x100,
        Star = 0x200,
        Poly = 0x400,
        Eraser = 0x500,
        Triangle = 0x600,
        Triangle1 = 0x10600,
        Triangle2 = 0x20600,
        Triangle3 = 0x30600,
        Triangle4 = 0x40600,
        Arrow = 0x700,
        Arrow1 = 0x1700,
        Arrow2 = 0x2700,
        Arrow3 = 0x3700,
        Can_Rotate = 0x1000,
        Negative = 0x2000,
        Gap = 0x100000,
        Gap_Row = 0x300000,
        Gap_Column = 0x500000,
        Dot = 0x20,
        Dot_Row = 0x240020,
        Dot_Column = 0x440020,
        Dot_Intersection = 0x600020,
        Empty = 0xA00,
    }

    export enum Color {
        None = 0,
        Black = 0x1,
        White = 0x2,
        Red = 0x3,
        Purple = 0x4,
        Green = 0x5,
        Cyan = 0x6,
        Magenta = 0x7,
        Yellow = 0x8,
        Blue = 0x9,
        Orange = 0xA,
        X = 0xF,
    }

}

export class Endpoint {
    private _x: number;
    private _y: number;
    private _flags: number;
    private _dir: Endpoint.Direction;

    constructor(x: number, y: number, dir: Endpoint.Direction, flags: number) {
        this._x = x;
        this._y = y;
        this._dir = dir;
        this._flags = flags;
    }

    public GetX() {
        return this._x;
    }

    public SetX(x: number) {
        this._x = x;
    }

    public GetY() {
        return this._y;
    }

    public SetY(y: number) {
        this._y = y;
    }

    public GetDir() {
        return this._dir;
    }

    public GetFlags() {
        return this._flags;
    }

    public SetDir(dir: Endpoint.Direction) {
        this._dir = dir;
    }

};
export namespace Endpoint {
    export enum Direction {
        NONE = 0,
        LEFT = 1,
        RIGHT = 2,
        UP = 4,
        DOWN = 8,
        UP_LEFT = 5,
        UP_RIGHT = 6,
        DOWN_LEFT = 9,
        DOWN_RIGHT = 10
    }
}

export enum IntersectionFlags {
    ROW = 0x200000,
    COLUMN = 0x400000,
    INTERSECTION = 0x600000,
    ENDPOINT = 0x1,
    STARTPOINT = 0x2,
    OPEN = 0x3, //Puzzle loader flag - not to be written out
    PATH = 0x4, //Generator use only
    NO_POINT = 0x8, //Points that nothing connects to
    GAP = 0x100000,
    DOT = 0x20,
    DOT_IS_BLUE = 0x100,
    DOT_IS_ORANGE = 0x200,
    DOT_IS_INVISIBLE = 0x1000,
    DOT_SMALL = 0x2000,
    DOT_MEDIUM = 0x4000,
    DOT_LARGE = 0x8000,
}


export class Panel {
    public symmetry: Panel.Symmetry;
    public pathWidth: number;
    public colorMode: Panel.ColorMode;
    public decorationsOnly: boolean;
    public enableFlash: boolean;


    private _width: number;
    private _height: number;
    private _grid: number[][];
    private _startpoints: Point[];
    private _endpoints: Endpoint[];
    private minx: number;
    private miny: number;
    private maxx: number;
    private maxy: number;
    private unitWidth: number;
    private unitHeight: number;
    private _style: number;
    private _resized: boolean;
    private id: number;
    private background_region_color: Color;

    private generatedPanels: Panel[];
    private arrowPuzzles: Array<[number, number]>;

    public get Width(): number {
        return this._width;
    }

    public get Height(): number {
        return this._height;
    }

    public get Style() {
        return this._style;
    }

    public set Style(value) {
        this._style = value;
    }

    public get ID(): number {
        return this.id;
    }

    public get Endpoints(): Endpoint[] {
        return this._endpoints;
    }

    public set Endpoints(vale: Endpoint[]) {
        this._endpoints = vale;
    }

    public get Startpoints(): Point[] {
        return this._startpoints;
    }

    public set Startpoints(value: Point[]) {
        this._startpoints = value;
    }

    public get Grid() {
        return this._grid;
    }

    public set Grid(value: number[][]) {
        this._grid = value;
    }

    //--------------------------------- visualize use only ---------------------------------//
    //will be modified by Generator.ResetStyle()
    public PATTERN_POINT_COLOR_A: Color
    public PATTERN_POINT_COLOR_B: Color
    public PATTERN_POINT_COLOR: Color
    public REFLECTION_PATH_COLOR: Color
    public ACTIVE_COLOR: Color
    public SUCCESS_COLOR_A: Color
    public SUCCESS_COLOR_B: Color
    public OUTER_BACKGROUND: Color
    public BACKGROUND_REGION_COLOR: Color
    public OUTER_BACKGROUND_MODE: number
    public SPECULAR_ADD: number;
    public PATH_WIDTH_SCALE: number;
    public GRID_SIZE_X: number;//  显示宽度，只有方块数量，不含道路 不要使用!!
    public GRID_SIZE_Y: number;//  显示高度，只有方块数量，不含道路 不要使用!!
    public STYLE_FLAGS: number;// 用途未知


    constructor(id: number, width: number, height: number, startX: number, startY: number, endX: number, endY: number) {
        this.id = id;
        this._width = width;
        this._height = height;
        this._grid = Array.from(Array(this._width), () => new Array(this._height).fill(0));
        //_startpoints.Clear();
        //_endpoints.Clear();
        this._startpoints = [new Point(startX, startY)];
        this._endpoints = [new Endpoint(endX, endY, Endpoint.Direction.UP, 4194305)];
        this.symmetry = Panel.Symmetry.None;
        this._style = 1;
        this.pathWidth = 1;
        this._resized = false;
        this.colorMode = Panel.ColorMode.Default;
        this.decorationsOnly = false;
        this.enableFlash = false;
        this.generatedPanels = [];
        this.arrowPuzzles = [];
        this.background_region_color = new Color(255, 255, 255, 0);
        //ReadIntersections();
    }

    public SetSymbol(x: number, y: number, symbol: Decoration.Shape, color: Decoration.Color) {
        const gridX = x * 2 + ((symbol & IntersectionFlags.COLUMN) != 0 ? 0 : 1);
        const gridY = y * 2 + ((symbol & IntersectionFlags.ROW) != 0 ? 0 : 1);
        if ((symbol & IntersectionFlags.DOT) != 0) {
            if (color === Decoration.Color.Blue || color === Decoration.Color.Cyan)
                color = IntersectionFlags.DOT_IS_BLUE as Decoration.Color;
            else if (color === Decoration.Color.Orange || color === Decoration.Color.Yellow)
                color = IntersectionFlags.DOT_IS_ORANGE as Decoration.Color;
            else color = Decoration.Color.None;

            if (this.symmetry != Panel.Symmetry.None) {
                const sp: Point = this.get_sym_point(gridX, gridY);
                this.SetGridSymbol(sp.first, sp.second, (symbol & ~Decoration.Shape.Dot) as Decoration.Shape, Decoration.Color.None);
            }
        } else if ((symbol & IntersectionFlags.ROW) != 0 || (symbol & IntersectionFlags.COLUMN) != 0)
            color = Decoration.Color.None;

        this.SetGridSymbol(gridX, gridY, symbol, color);
    }

    public SetShape(x: number, y: number, shape: number, rotate: boolean, negative: boolean, color: Decoration.Color) {
        if (shape === 0) return;
        const symbol = Decoration.Shape.Poly;
        while ((shape & 0xf) === 0) shape >>= 4;
        while ((shape & 0x1111) === 0) shape >>= 1;
        shape <<= 16;
        if (rotate) shape |= Decoration.Shape.Can_Rotate;
        else shape &= ~Decoration.Shape.Can_Rotate;
        if (negative) shape |= Decoration.Shape.Negative;
        else shape &= ~Decoration.Shape.Negative;
        this._grid[x * 2 + 1][y * 2 + 1] = symbol | shape | color;
    }

    public ClearSymbol(x: number, y: number) {
        this.ClearGridSymbol(x * 2 + 1, y * 2 + 1);
    }

    public SetGridSymbol(x: number, y: number, symbol: Decoration.Shape, color: Decoration.Color) {
        if (symbol === Decoration.Shape.Start) this._startpoints.push(new Point(x, y));
        if (symbol === Decoration.Shape.Exit) {
            let dir: Endpoint.Direction;
            if (y === 0) dir = Endpoint.Direction.UP;
            else if (y === this._height - 1) dir = Endpoint.Direction.DOWN;
            else if (x === 0) dir = Endpoint.Direction.LEFT;
            else dir = Endpoint.Direction.RIGHT;
            if (this.id === 0x033D4 || this.id === 0x0A3B5) {
                if (x === 0) dir = Endpoint.Direction.LEFT;
                else dir = Endpoint.Direction.RIGHT;
            }
            if (this.symmetry === Panel.Symmetry.ParallelH || this.symmetry === Panel.Symmetry.ParallelHFlip) {
                if (x === 0) dir = Endpoint.Direction.LEFT;
                if (x === this._width - 1) dir = Endpoint.Direction.RIGHT;
            }
            this._endpoints.push(new Endpoint(x, y, dir, IntersectionFlags.ENDPOINT |
                (dir === Endpoint.Direction.UP || dir === Endpoint.Direction.DOWN ?
                    IntersectionFlags.COLUMN : IntersectionFlags.ROW)));
        } else this._grid[x][y] = symbol | color;
    }

    public ClearGridSymbol(x: number, y: number) {
        this._grid[x][y] = 0;
    }

    public Resize(width: number, height: number) {
        for (const s of this._startpoints) {
            if (s.first === this._width - 1) s.first = width - 1;
            if (s.second === this._height - 1) s.second = height - 1;
        }
        for (const e of this._endpoints) {
            if (e.GetX() === this._width - 1) e.SetX(width - 1);
            if (e.GetY() === this._height - 1) e.SetY(height - 1);
        }
        if (this._width != this._height || width != height) {
            const maxDim = Math.max(this.maxx - this.minx, this.maxy - this.miny);
            const unitSize = maxDim / Math.max(width - 1, height - 1);
            this.minx = 0.5 - unitSize * (width - 1) / 2;
            this.maxx = 0.5 + unitSize * (width - 1) / 2;
            this.miny = 0.5 - unitSize * (height - 1) / 2;
            this.maxy = 0.5 + unitSize * (height - 1) / 2;
        }
        if (Point.pillarWidth != 0) Point.pillarWidth = width;
        this._width = width;
        this._height = height;
        this._grid = Array(this._width)
            .fill(null)
            .map(() => Array(this._height).fill(0));
        this._resized = true;
    }

    public get_sym_point(x: number, y: number, symmetry?: Panel.Symmetry): Point;
    public get_sym_point(p: Point, symmetry?: Panel.Symmetry): Point;
    public get_sym_point(arg1: number | Point, arg2?: number, symmetry: Panel.Symmetry = this.symmetry): Point {

        const x: number = typeof arg1 === 'number' ? arg1 : arg1.first;
        const y: number = typeof arg1 === 'number' ? arg2! : arg1.second;
        switch (symmetry) {
            case Panel.Symmetry.None:
                return new Point(x, y);
            case Panel.Symmetry.Horizontal:
                return new Point(x, this._height - 1 - y);
            case Panel.Symmetry.Vertical:
                return new Point(this._width - 1 - x, y);
            case Panel.Symmetry.Rotational:
                return new Point(this._width - 1 - x, this._height - 1 - y);
            case Panel.Symmetry.RotateLeft:
                return new Point(y, this._width - 1 - x);
            case Panel.Symmetry.RotateRight:
                return new Point(this._height - 1 - y, x);
            case Panel.Symmetry.FlipXY:
                return new Point(y, x);
            case Panel.Symmetry.FlipNegXY:
                return new Point(this._height - 1 - y, this._width - 1 - x);
            case Panel.Symmetry.ParallelH:
                return new Point(x, y === this._height / 2 ? this._height / 2 : (y + (this._height + 1) / 2) % (this._height + 1));
            case Panel.Symmetry.ParallelV:
                return new Point(x === this._width / 2 ? this._width / 2 : (x + (this._width + 1) / 2) % (this._width + 1), y);
            case Panel.Symmetry.ParallelHFlip:
                return new Point(this._width - 1 - x, y === this._height / 2 ? this._height / 2 : (y + (this._height + 1) / 2) % (this._height + 1));
            case Panel.Symmetry.ParallelVFlip:
                return new Point(x === this._width / 2 ? this._width / 2 : (x + (this._width + 1) / 2) % (this._width + 1), this._height - 1 - y);
            case Panel.Symmetry.PillarParallel:
                return new Point(x + this._width / 2, y);
            case Panel.Symmetry.PillarHorizontal:
                return new Point(x + this._width / 2, this._height - 1 - y);
            case Panel.Symmetry.PillarVertical:
                return new Point(this._width / 2 - x, y);
            case Panel.Symmetry.PillarRotational:
                return new Point(this._width / 2 - x, this._height - 1 - y);
        }
        return new Point(x, y);
    }

    private get_sym_dir(direction: Endpoint.Direction, symmetry: Panel.Symmetry): Endpoint.Direction {
        let dirIndex: number = 0;
        if (direction === Endpoint.Direction.LEFT) dirIndex = 0;
        if (direction === Endpoint.Direction.RIGHT) dirIndex = 1;
        if (direction === Endpoint.Direction.UP) dirIndex = 2;
        if (direction === Endpoint.Direction.DOWN) dirIndex = 3;
        let mapping: Endpoint.Direction[];
        switch (symmetry) {
            case Panel.Symmetry.Horizontal:
                mapping = [Endpoint.Direction.LEFT, Endpoint.Direction.RIGHT, Endpoint.Direction.DOWN, Endpoint.Direction.UP];
                break;
            case Panel.Symmetry.Vertical:
                mapping = [Endpoint.Direction.RIGHT, Endpoint.Direction.LEFT, Endpoint.Direction.UP, Endpoint.Direction.DOWN];
                break;
            case Panel.Symmetry.Rotational:
                mapping = [Endpoint.Direction.RIGHT, Endpoint.Direction.LEFT, Endpoint.Direction.DOWN, Endpoint.Direction.UP];
                break;
            case Panel.Symmetry.RotateLeft:
                mapping = [Endpoint.Direction.DOWN, Endpoint.Direction.UP, Endpoint.Direction.LEFT, Endpoint.Direction.RIGHT];
                break;
            case Panel.Symmetry.RotateRight:
                mapping = [Endpoint.Direction.UP, Endpoint.Direction.DOWN, Endpoint.Direction.RIGHT, Endpoint.Direction.LEFT];
                break;
            case Panel.Symmetry.FlipXY:
                mapping = [Endpoint.Direction.UP, Endpoint.Direction.DOWN, Endpoint.Direction.LEFT, Endpoint.Direction.RIGHT];
                break;
            case Panel.Symmetry.FlipNegXY:
                mapping = [Endpoint.Direction.DOWN, Endpoint.Direction.UP, Endpoint.Direction.RIGHT, Endpoint.Direction.LEFT];
                break;
            case Panel.Symmetry.ParallelH:
                mapping = [Endpoint.Direction.LEFT, Endpoint.Direction.RIGHT, Endpoint.Direction.UP, Endpoint.Direction.DOWN];
                break;
            case Panel.Symmetry.ParallelV:
                mapping = [Endpoint.Direction.LEFT, Endpoint.Direction.RIGHT, Endpoint.Direction.UP, Endpoint.Direction.DOWN];
                break;
            case Panel.Symmetry.ParallelHFlip:
                mapping = [Endpoint.Direction.RIGHT, Endpoint.Direction.LEFT, Endpoint.Direction.UP, Endpoint.Direction.DOWN];
                break;
            case Panel.Symmetry.ParallelVFlip:
                mapping = [Endpoint.Direction.LEFT, Endpoint.Direction.RIGHT, Endpoint.Direction.DOWN, Endpoint.Direction.UP];
                break;
            default:
                mapping = [Endpoint.Direction.LEFT, Endpoint.Direction.RIGHT, Endpoint.Direction.UP, Endpoint.Direction.DOWN];
                break;
        }
        return mapping[dirIndex];
    }

    public get_num_grid_points() {
        return ((this._width + 1) / 2) * ((this._height + 1) / 2);
    }

    public get_num_grid_blocks() {
        return (this._width / 2) * (this._height / 2);
    }

    public get_parity() {
        return (this.get_num_grid_points() + 1) % 2;
    }

    private loc_to_xy(location: number): [number, number] {
        const height2 = (this._height - 1) / 2;
        const width2 = (this._width + 1) / 2;

        const x = 2 * (location % width2);
        const y = 2 * (height2 - Math.floor(location / width2));
        return [x, y];
    }

    private xy_to_loc(x: number, y: number) {
        const height2 = (this._height - 1) / 2;
        const width2 = (this._width + 1) / 2;

        const rowsFromBottom = height2 - y / 2;
        return rowsFromBottom * width2 + x / 2;
    }

    private locate_segment(x: number, y: number, connections_a: number[], connections_b: number[]) {
        for (let i = 0; i < connections_a.length; i++) {
            const coord1 = this.loc_to_xy(connections_a[i]);
            const coord2 = this.loc_to_xy(connections_b[i]);
            const x1 = coord1[0], y1 = coord1[1], x2 = coord2[0], y2 = coord2[1];
            if (Point.pillarWidth != 0) {
                if ((x1 === (x - 1 + Point.pillarWidth) % Point.pillarWidth && x2 === (x + 1) % Point.pillarWidth && y1 === y && y2 === y) ||
                    (y1 === y - 1 && y2 === y + 1 && x1 === x && x2 === x)) {
                    return i;
                }
            } else if ((x1 === x - 1 && x2 === x + 1 && y1 === y && y2 === y) ||
                (y1 === y - 1 && y2 === y + 1 && x1 === x && x2 === x)) {
                return i;
            }

        }
        return -1;
    }

    /**
     * obj 转 Panel
     * */
    public static ObjectToPanel(obj: object): Panel {
        const panel = Object.create(Panel.prototype);
        Object.assign(panel, obj);

        // Endpoint需要重新实例化（因为调用了里面的function）
        const endpoints: Endpoint[] = [];
        for (const end_obj of panel.Endpoints) {
            const endpoint = Object.create(Endpoint.prototype);
            Object.assign(endpoint, end_obj);
            endpoints.push(endpoint);
            console.info(endpoint.GetX());
        }
        panel.Endpoints = endpoints;

        return panel;
    }

}
export namespace Panel {
    export enum Symmetry { //NOTE - Not all of these are valid symmetries for certain puzzles
        None, Horizontal, Vertical, Rotational,
        RotateLeft, RotateRight, FlipXY, FlipNegXY, ParallelH, ParallelV, ParallelHFlip, ParallelVFlip,
        PillarParallel, PillarHorizontal, PillarVertical, PillarRotational
    }

    export enum ColorMode { Default, Reset, Alternate, WriteColors, Treehouse, TreehouseAlternate };

    export enum Styles {
        SYMMETRICAL = 0x2, //Not on the town symmetry puzzles? IDK why.
        NO_BLINK = 0x4,
        HAS_DOTS = 0x8,
        IS_2COLOR = 0x10,
        HAS_STARS = 0x40,
        HAS_TRIANGLES = 0x80,
        HAS_STONES = 0x100,
        HAS_ERASERS = 0x1000,
        HAS_SHAPERS = 0x2000,
        IS_PIVOTABLE = 0x8000,
    };
}





