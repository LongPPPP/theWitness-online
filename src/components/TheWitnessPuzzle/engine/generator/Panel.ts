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

}

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
	// public pathWidth: number;
	public colorMode: Panel.ColorMode;
	public decorationsOnly: boolean;
	public enableFlash: boolean;

	private _width: number;
	private _height: number;
	private _grid: number[][];
	private _startpoints: Point[];
	private _endpoints: Endpoint[];
	private _style: number;
	private readonly id: number;

	// private minx: number;
	// private miny: number;
	// private maxx: number;
	// private maxy: number;
	// private unitWidth: number;
	// private unitHeight: number;


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


	constructor(id: number, width: number, height: number, startX: number, startY: number, endX: number, endY: number, symmetry: Panel.Symmetry = Panel.Symmetry.None) {
		this.id = id;
		this._width = width;
		this._height = height;
		this._grid = Array.from(Array(this._width), () => new Array(this._height).fill(0));
		//_startpoints.Clear();
		//_endpoints.Clear();
		// this._startpoints = [new Point(startX, startY)];
		// this._endpoints = [new Endpoint(endX, endY, Endpoint.Direction.UP, 4194305)];
		this._startpoints = [];
		this._endpoints = [];
		this.symmetry = symmetry;
		this._style = 1;
		// this.pathWidth = 1;
		this.colorMode = Panel.ColorMode.Default;
		this.decorationsOnly = false;
		this.enableFlash = false;
		//ReadIntersections();
		this.SetGridSymbol(startX, startY, Decoration.Shape.Start, Decoration.Color.None);
		this.SetGridSymbol(endX, endY, Decoration.Shape.Exit, Decoration.Color.None);
		if (this.symmetry !== Panel.Symmetry.None) {
			const s2 = this.get_sym_point(startX, startY)
			const e2 = this.get_sym_point(endX, endY)
			this.SetGridSymbol(s2.first, s2.second, Decoration.Shape.Start, Decoration.Color.None);
			this.SetGridSymbol(e2.first, e2.second, Decoration.Shape.Exit, Decoration.Color.None);
		}
	}

	public SetSymbol(x: number, y: number, symbol: Decoration.Shape, color: Decoration.Color) {
		const gridX = x * 2 + ((symbol & IntersectionFlags.COLUMN) != 0 ? 0 : 1);
		const gridY = y * 2 + ((symbol & IntersectionFlags.ROW) != 0 ? 0 : 1);
		if ((symbol & IntersectionFlags.DOT) != 0) {
			if (color === Decoration.Color.Blue || color === Decoration.Color.Cyan)
				color = IntersectionFlags.DOT_IS_BLUE as unknown as Decoration.Color;
			else if (color === Decoration.Color.Orange || color === Decoration.Color.Yellow)
				color = IntersectionFlags.DOT_IS_ORANGE as unknown as Decoration.Color;
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
		if (this._startpoints.some(point => (point.first === x && point.second === y))) {
			this._startpoints = this._startpoints.filter(point => !(point.first === x && point.second === y));
		} else if (this._endpoints.some(point => point.GetX() === x && point.GetY() === y)) {
			this._endpoints = this._endpoints.filter(point => !(point.GetX() === x && point.GetY() === y));
		}
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
		// if (this._width != this._height || width != height) {
		//     const maxDim = Math.max(this.maxx - this.minx, this.maxy - this.miny);
		//     const unitSize = maxDim / Math.max(width - 1, height - 1);
		//     this.minx = 0.5 - unitSize * (width - 1) / 2;
		//     this.maxx = 0.5 + unitSize * (width - 1) / 2;
		//     this.miny = 0.5 - unitSize * (height - 1) / 2;
		//     this.maxy = 0.5 + unitSize * (height - 1) / 2;
		// }
		if (Point.pillarWidth != 0) Point.pillarWidth = width;
		this._width = width;
		this._height = height;
		this._grid = Array(this._width)
			.fill(null)
			.map(() => Array(this._height).fill(0));
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
				return new Point(x, y === Math.trunc(this._height / 2) ? Math.trunc(this._height / 2) : (y + Math.trunc((this._height + 1) / 2)) % (this._height + 1));
			case Panel.Symmetry.ParallelV:
				return new Point(x === Math.trunc(this._width / 2) ? Math.trunc(this._width / 2) : (x + Math.trunc((this._width + 1) / 2)) % (this._width + 1), y);
			case Panel.Symmetry.ParallelHFlip:
				return new Point(this._width - 1 - x, y === this._height / 2 ? this._height / 2 : (y + (this._height + 1) / 2) % (this._height + 1));
			case Panel.Symmetry.ParallelVFlip:
				return new Point(x === this._width / 2 ? this._width / 2 : (x + (this._width + 1) / 2) % (this._width + 1), this._height - 1 - y);
			case Panel.Symmetry.Pillar:
				return new Point(x, y);
			case Panel.Symmetry.PillarParallel:
				return new Point(x + Math.trunc(this._width / 2), y);
			case Panel.Symmetry.PillarHorizontal:
				return new Point(x + Math.trunc(this._width / 2), this._height - 1 - y);
			case Panel.Symmetry.PillarVertical:
				return new Point(Math.trunc(this._width / 2) - x, y);
			case Panel.Symmetry.PillarRotational:
				return new Point(Math.trunc(this._width / 2) - x, this._height - 1 - y);
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
			// console.info(endpoint.GetX());
		}
		panel.Endpoints = endpoints;

		return panel;
	}

	public static PanelToObject(panel: Panel): object {
		return {...panel};
	}

	public serialize(): string {
		// symmetry 最大值为15 占用1字节
		// ColorMode 最大值为5 占用1字节
		// decorationsOnly 和 enableFlash 占用1字节
		// _width 最大值为21 占用1字节
		// _height 最大值为21 占用1字节
		// _grid中元素占用4字节 采用不为0的元素数量和坐标进行压缩
		// (x,y,symbol) (1字节，1字节，4字节)
		// (x,y,_startpoints) (1字节，1字节，4字节)
		// (x,y,_endpoints) (1字节，1字节，4字节) dir在反序列化时候自动计算
		// _style 4字节
		// id 4字节
		const symmetryBytes = 1;
		const colorModeBytes = 1;
		const flagsBytes = 1;
		const widthBytes = 1;
		const heightBytes = 1;
		const styleBytes = 4;
		const idBytes = 4;
		let gridBytes = 0;

		const hashmap = new Map<number, Point[]>();
		for (let x = 0; x < this._width; x++) {
			for (let y = 0; y < this._height; y++) {
				const cell = this._grid[x][y];
				if (cell !== 0 && cell !== IntersectionFlags.INTERSECTION && cell !== Decoration.Shape.Start) {
					if (!hashmap.has(cell)) {
						gridBytes += 4; // symbol占4字节
						gridBytes += 1; // 序列终止符占1字节
						hashmap.set(cell, []);
					}
					hashmap.get(cell)!.push(new Point(x, y));
					gridBytes += widthBytes + heightBytes; // x,y坐标一共占2字节
				}
			}
		}
		gridBytes += this._startpoints.length * (widthBytes + heightBytes) + 4 + 1; // 每个startpoint存储x,y (1字节，1字节，4字节) + 1字节的终止符
		gridBytes += this._endpoints.length * (widthBytes + heightBytes) + 4 + 1; // 每个endpoint存储x,y (1字节，1字节，4字节) + 1字节的终止符
		gridBytes += 1; // grid数据末尾的终止符占1字节

		const totalBytes =
			1 + // 版本号占1字节
			symmetryBytes + colorModeBytes + flagsBytes +
			widthBytes + heightBytes + gridBytes +
			styleBytes + idBytes;

		const buffer = new Uint8Array(totalBytes);
		let offset = 0;

		buffer[offset++] = 1; // 版本号
		buffer[offset++] = this.symmetry;
		buffer[offset++] = this.colorMode;
		buffer[offset++] = (this.decorationsOnly ? 0x1 : 0) | (this.enableFlash ? 0x10 : 0);
		buffer[offset++] = this._width;
		buffer[offset++] = this._height;

		const id = this.id;
		buffer[offset++] = (id >> 24) & 0xFF;
		buffer[offset++] = (id >> 16) & 0xFF;
		buffer[offset++] = (id >> 8) & 0xFF;
		buffer[offset++] = id & 0xFF;

		for (const [symbol, pos] of hashmap.entries()) {
			buffer[offset++] = (symbol >> 24) & 0xFF; // symbol 31-24位
			buffer[offset++] = (symbol >> 16) & 0xFF; // symbol 23-16位
			buffer[offset++] = (symbol >> 8) & 0xFF; // symbol 15-8位
			buffer[offset++] = symbol & 0xFF; // symbol 7-0位
			for (const p of pos) {
				buffer[offset++] = p.first;
				buffer[offset++] = p.second;
				console.log(`Set symbol 0x${(symbol & ~0xF).toString(16)} with color ${symbol & 0xF} at (${p.first}, ${p.second})`);
			}
			buffer[offset++] = 59; // ;的ASCII码，表示该symbol的坐标序列结束

		}
		buffer[offset++] = (Decoration.Shape.Start >> 24) & 0xFF; // Start symbol高8位
		buffer[offset++] = (Decoration.Shape.Start >> 16) & 0xFF; // Start symbol高8位
		buffer[offset++] = (Decoration.Shape.Start >> 8) & 0xFF; // Start symbol中8位
		buffer[offset++] = Decoration.Shape.Start & 0xFF; // Start symbol低8位
		for (const startpoint of this._startpoints) {
			buffer[offset++] = startpoint.first;
			buffer[offset++] = startpoint.second;
			console.log(`Set symbol 0x${Decoration.Shape.Start.toString(16)} with color ${Decoration.Color.None} at (${startpoint.first}, ${startpoint.second})`);
		}
		buffer[offset++] = 59; // ;的ASCII码，表示该symbol的坐标序列结束

		buffer[offset++] = (Decoration.Shape.Exit >> 24) & 0xFF; // Exit symbol高8位
		buffer[offset++] = (Decoration.Shape.Exit >> 16) & 0xFF; // Exit symbol高8位
		buffer[offset++] = (Decoration.Shape.Exit >> 8) & 0xFF; // Exit symbol中8位
		buffer[offset++] = Decoration.Shape.Exit & 0xFF; // Exit symbol低8位
		for (const endpoint of this._endpoints) {
			buffer[offset++] = endpoint.GetX();
			buffer[offset++] = endpoint.GetY();
			console.log(`Set symbol 0x${Decoration.Shape.Exit.toString(16)} with color ${Decoration.Color.None} at (${endpoint.GetX()}, ${endpoint.GetY()})`);
		}
		buffer[offset++] = 59; // ;的ASCII码，表示该symbol的坐标序列结束
		buffer[offset++] = 59; // ;的ASCII码，表示该grid序列结束

		const style = this._style;
		buffer[offset++] = (style >> 24) & 0xFF;
		buffer[offset++] = (style >> 16) & 0xFF;
		buffer[offset++] = (style >> 8) & 0xFF;
		buffer[offset++] = style & 0xFF;

		return btoa(String.fromCharCode(...buffer));
	}

	public static deserialize(base64: string): Panel {
		const buffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
		let offset = 0;

		const version = buffer[offset++];
		if (version !== 1) throw new Error('Unsupported version: ' + version);

		const symmetry = buffer[offset++];
		const colorMode = buffer[offset++];
		const flags = buffer[offset++];
		const decorationsOnly = (flags & 0x1) !== 0;
		const enableFlash = (flags & 0x10) !== 0;
		const width = buffer[offset++];
		const height = buffer[offset++];
		const id = (buffer[offset++] << 24) | (buffer[offset++] << 16) | (buffer[offset++] << 8) | buffer[offset++];

		const panel = new Panel(id, width, height, 0, 0, width - 1, height - 1);
		panel.Startpoints = []
		panel.Endpoints = []

		panel.symmetry = symmetry;
		panel.colorMode = colorMode;
		panel.decorationsOnly = decorationsOnly;
		panel.enableFlash = enableFlash;

		for (let x = 0; x < panel.Width; x++) {
			for (let y = 0; y < panel.Height; y++) {
				if ((x & 1) === 0 && (y & 1) === 0) {
					panel.Grid[x][y] |= IntersectionFlags.INTERSECTION; // 设置交点标志
				}
			}
		}
		// 解析cell，包括起点和终点
		while (buffer[offset] !== 59) {
			const cell = (buffer[offset++] << 24) | (buffer[offset++] << 16) | (buffer[offset++] << 8) | buffer[offset++];
			let symbol = cell & ~0xF as Decoration.Shape;
			let color = cell & 0xF as Decoration.Color;
			if (cell === Decoration.Shape.Start || cell === Decoration.Shape.Exit) {
				symbol = cell
				color = Decoration.Color.None
			}
			while (buffer[offset] !== 59) {
				const x = buffer[offset++];
				const y = buffer[offset++];
				console.log(`Set symbol 0x${symbol.toString(16)} with color ${color} at (${x}, ${y})`);
				panel.SetGridSymbol(x, y, symbol, color);
			}
			offset++; // 跳过分隔符（元素坐标序列结束）
		}
		offset++; // 跳过分隔符（gird列表结束）

		panel.Style = (buffer[offset++] << 24) | (buffer[offset++] << 16) | (buffer[offset++] << 8) | buffer[offset++];
		return panel;
	}
}

export namespace Panel {
	export enum Symmetry { //NOTE - Not all of these are valid symmetries for certain puzzles
		/**
		 * 无对称：对称点与原始点重合。
		 * ```
		 * ● . . .
		 * . . . .
		 * . . . .
		 * ```
		 */
		None,
		/**
		 * 水平镜像（上下翻转）：以横向中轴为对称轴，y → H-1-y。
		 * ```
		 * ● . . .
		 * . . . .
		 * ○ . . .
		 * ```
		 */
		Horizontal,
		/**
		 * 垂直镜像（左右翻转）：以纵向中轴为对称轴，x → W-1-x。
		 * ```
		 * ● . . ○
		 * . . . .
		 * . . . .
		 * ```
		 */
		Vertical,
		/**
		 * 180° 旋转对称：绕中心点旋转半圈，(x,y) → (W-1-x, H-1-y)。
		 * ```
		 * ● . . .
		 * . . . .
		 * . . . ○
		 * ```
		 */
		Rotational,
		/**
		 * 90° 逆时针旋转对称（仅方形面板自洽），(x,y) → (y, W-1-x)。
		 * ```
		 * ● . . ○     (0,0) → (0, W-1)
		 * . . . .
		 * . . . .
		 * ```
		 */
		RotateLeft,
		/**
		 * 90° 顺时针旋转对称（仅方形面板自洽），(x,y) → (H-1-y, x)。
		 * ```
		 * ● . . .     (0,0) → (H-1, 0)
		 * . . . .
		 * ○ . . .
		 * ```
		 * 注：RotateLeft 与 RotateRight 原点对称点相同，区别在于中间点的映射方向相反。
		 */
		RotateRight,
		/**
		 * 主对角线翻转（仅方形面板自洽），(x,y) → (y, x)。
		 * ```
		 * ● . . .
		 * . . . .      ● 在对角线上，自身即对称点
		 * . . . .
		 * ```
		 * 取非对角线上的点，如 (1,0)：
		 * ```
		 * . ● . .
		 * ○ . . .
		 * . . . .
		 * ```
		 */
		FlipXY,
		/**
		 * 副对角线翻转（仅方形面板自洽），(x,y) → (H-1-y, W-1-x)。
		 * ```
		 * ● . . .     (0,0) → (H-1, W-1)
		 * . . . .
		 * . . . ○
		 * ```
		 * 取非对角线上的点，如 (1,0)：
		 * ```
		 * . ● . .     (1,0) → (H-1, W-2)
		 * . . . .
		 * . . ○ .
		 * ```
		 */
		FlipNegXY,
		/**
		 * 上下平行路径：面板横向等分为上下两半，路径在两半中平行出现，y 平移 (H+1)/2。
		 * 中间行（若存在）映射到自身。
		 * ```
		 * ● . . .   ← 上半区某点
		 * - - - -   ← 中线（映射到自身）
		 * ○ . . .   ← 下半区对应点
		 * ```
		 */
		ParallelH,
		/**
		 * 左右平行路径：面板纵向等分为左右两半，路径在两半中平行出现，x 平移 (W+1)/2。
		 * 中间列（若存在）映射到自身。
		 * ```
		 * ● . | ○ .
		 * . . | . .
		 * . . | . .
		 *   ↑中线
		 * ```
		 */
		ParallelV,
		/**
		 * 上下平行 + 左右翻转：ParallelH 的 y 平移基础上再对 x 做镜像，
		 * (x,y) → (W-1-x, (y+(H+1)/2)%(H+1))。
		 * ```
		 * ● . . .   ← 上半区某点
		 * - - - -
		 * . . . ○   ← 下半区，同时 x 镜像
		 * ```
		 */
		ParallelHFlip,
		/**
		 * 左右平行 + 上下翻转：ParallelV 的 x 平移基础上再对 y 做镜像，
		 * (x,y) → ((x+(W+1)/2)%(W+1), H-1-y)。
		 * ```
		 * ● . | . .
		 * . . | . .
		 * . . | . ○   ← x 平移 + y 翻转
		 * ```
		 */
		ParallelVFlip,
		/**
		 * 无对称：对称点与原始点重合。但是是柱状谜题
		 * ```
		 * ● . . .
		 * . . . .
		 * . . . .
		 * ```
		 */
		Pillar,
		/**
		 * 柱面平行路径：左右两端拓扑相连（卷成圆柱），对称点在 x 方向平移半个宽度并环绕，
		 * (x,y) → ((x + W/2) % W, y)。
		 * ```
		 * 展开视图：
		 * ● . . ○ . .    ← y 不变，x 平移 W/2 后环绕
		 * . . . . . .
		 * . . . . . .
		 * ```
		 */
		PillarParallel,
		/**
		 * 柱面水平镜像：柱面环绕 + 上下翻转，
		 * (x,y) → ((x + W/2) % W, H-1-y)。
		 * ```
		 * 展开视图：
		 * ● . . . . .
		 * . . . . . .
		 * . . . ○ . .    ← x 平移 W/2 环绕，同时 y 翻转
		 * ```
		 */
		PillarHorizontal,
		/**
		 * 柱面垂直镜像：沿柱面中轴（x = W/2）做镜像并环绕，
		 * (x,y) → ((W/2 - x + W) % W, y)。
		 * ```
		 * 展开视图：
		 * . . ○ ● . .    ← 关于 x=W/2 对称，y 不变
		 * . . . . . .
		 * . . . . . .
		 * ```
		 */
		PillarVertical,
		/**
		 * 柱面旋转对称：柱面中轴镜像 + 上下翻转，等价于柱面上的 180° 旋转，
		 * (x,y) → ((W/2 - x + W) % W, H-1-y)。
		 * ```
		 * 展开视图：
		 * . . . ● . .
		 * . . . . . .
		 * . . ○ . . .    ← x 关于 W/2 镜像环绕，同时 y 翻转
		 * ```
		 */
		PillarRotational,
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






