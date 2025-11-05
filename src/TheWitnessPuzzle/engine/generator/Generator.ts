import {Color, Decoration, IntersectionFlags, Panel, Point} from "./Panel.ts";
import {PuzzleSymbols} from "./PuzzleSymbols.ts";
import {KeyValuePair} from "./utils/KeyValuePair.ts";
import {Random} from "./utils/Random.ts";
import {SortedSet} from "./utils/SortedSet.ts";

export class Generator {
    // ========================================
    // Public Properties & Fields
    // ========================================

    public get Path(): SortedSet<Point> {
        return this._path;
    }

    public pathWidth: number = 1.0; // Controls how thick the line is on the puzzle

    public hitPoints: Point[] = [];           // The generated path will be forced to hit these points in order
    public openPos: SortedSet<Point> = new SortedSet<Point>();
    public blockPos: SortedSet<Point> = new SortedSet<Point>();
    public customPath: SortedSet<Point> = new SortedSet<Point>();

    public arrowColor!: Color;
    public backgroundColor!: Color;
    public successColor!: Color;

    // ========================================
    // Private Fields
    // ========================================

    private _id: number = 0;
    private _panel: Panel | null = null;
    private _custom_grid: number[][] = [];
    private _width: number = 0;
    private _height: number = 0;
    private _symmetry: Panel.Symmetry = Panel.Symmetry.None; // 假设 Symmetry 是 Panel 的静态 enum/namespace

    private _starts: SortedSet<Point> = new SortedSet<Point>();
    private _exits: SortedSet<Point> = new SortedSet<Point>();
    private _gridpos: SortedSet<Point> = new SortedSet<Point>();
    private _openpos: SortedSet<Point> = new SortedSet<Point>();
    private _path: SortedSet<Point> = new SortedSet<Point>();
    private _path1: SortedSet<Point> = new SortedSet<Point>();
    private _path2: SortedSet<Point> = new SortedSet<Point>();

    private _fullGaps: boolean = false;
    private _bisect: boolean = false;

    private _stoneTypes: number = 0;
    private _config: number = 0;

    private _oneTimeAdd: number = 0;
    private _oneTimeRemove: number = 0;

    private _seed?: string;
    private _random: Random;

    private _splitPoints: Point[] = [];
    private _allowNonMatch: boolean = false; // Used for multi-generator
    private _parity: number = -1;
    private _obstructions: Point[][] = [];

    private colorblind: boolean = false;

    private _areaTotal: number = 0;
    private _genTotal: number = 0;
    private _areaPuzzles: number = 0;
    private _totalPuzzles: number = 0;

    private _areaName: string = "";

    // ========================================
    // Static Constants (Direction Lists)
    // ========================================

    private static readonly _DIRECTIONS1: Point[] = [
        new Point(0, 1),
        new Point(0, -1),
        new Point(1, 0),
        new Point(-1, 0)
    ];

    private static readonly _8DIRECTIONS1: Point[] = [
        new Point(0, 1), new Point(0, -1), new Point(1, 0), new Point(-1, 0),
        new Point(1, 1), new Point(1, -1), new Point(-1, 1), new Point(-1, -1)
    ];

    private static readonly _DIRECTIONS2: Point[] = [
        new Point(0, 2),
        new Point(0, -2),
        new Point(2, 0),
        new Point(-2, 0)
    ];

    private static readonly _8DIRECTIONS2: Point[] = [
        new Point(0, 2), new Point(0, -2), new Point(2, 0), new Point(-2, 0),
        new Point(2, 2), new Point(2, -2), new Point(-2, 2), new Point(-2, -2)
    ];

    private static readonly _DISCONNECT: Point[] = [
        new Point(0, 2), new Point(0, -2), new Point(2, 0), new Point(-2, 0),
        new Point(2, 2), new Point(2, -2), new Point(-2, 2), new Point(-2, -2),
        new Point(0, 2), new Point(0, -2), new Point(2, 0), new Point(-2, 0),
        new Point(2, 2), new Point(2, -2), new Point(-2, 2), new Point(-2, -2),
        new Point(0, 4), new Point(0, -4), new Point(4, 0), new Point(-4, 0)
    ];

    // This will eventually be set to one of the above lists
    private static _SHAPEDIRECTIONS: Point[] = [];

    constructor(seed?: string) {
        this._seed = seed;
        this._random = new Random(seed);

        const transparentBlack = new Color(0, 0, 0, 0);
        this.arrowColor = transparentBlack;
        this.backgroundColor = transparentBlack;
        this.successColor = transparentBlack;
        this.resetConfig();
    }

    public generate(panel: Panel): void;
    public generate(panel: Panel, symbol: number, amount: number): void;
    public generate(panel: Panel, symbol1: number, amount1: number, symbol2: number, amount2: number): void;
    public generate(panel: Panel, symbol1: number, amount1: number, symbol2: number, amount2: number, symbol3: number, amount3: number): void;
    public generate(panel: Panel, symbol1: number, amount1: number, symbol2: number, amount2: number, symbol3: number, amount3: number, symbol4: number, amount4: number): void;
    public generate(panel: Panel, symbol1: number, amount1: number, symbol2: number, amount2: number, symbol3: number, amount3: number, symbol4: number, amount4: number, symbol5: number, amount5: number): void;
    public generate(panel: Panel, symbol1: number, amount1: number, symbol2: number, amount2: number, symbol3: number, amount3: number, symbol4: number, amount4: number, symbol5: number, amount5: number, symbol6: number, amount6: number): void;
    public generate(panel: Panel, symbol1: number, amount1: number, symbol2: number, amount2: number, symbol3: number, amount3: number, symbol4: number, amount4: number, symbol5: number, amount5: number, symbol6: number, amount6: number, symbol7: number, amount7: number): void;
    public generate(panel: Panel, symbol1: number, amount1: number, symbol2: number, amount2: number, symbol3: number, amount3: number, symbol4: number, amount4: number, symbol5: number, amount5: number, symbol6: number, amount6: number, symbol7: number, amount7: number, symbol8: number, amount8: number): void;
    public generate(panel: Panel, symbol1: number, amount1: number, symbol2: number, amount2: number, symbol3: number, amount3: number, symbol4: number, amount4: number, symbol5: number, amount5: number, symbol6: number, amount6: number, symbol7: number, amount7: number, symbol8: number, amount8: number, symbol9: number, amount9: number): void;
    public generate(panel: Panel, ...args: number[]): void {
        let symbols: PuzzleSymbols;
        const symbolVec: Array<KeyValuePair<number, number>> = [];

        switch (args.length) {
            case 18:
                symbolVec.push(new KeyValuePair(args[16], args[17]));
            case 16:
                symbolVec.push(new KeyValuePair(args[14], args[15]));
            case 14:
                symbolVec.push(new KeyValuePair(args[12], args[13]));
            case 12:
                symbolVec.push(new KeyValuePair(args[10], args[11]));
            case 10:
                symbolVec.push(new KeyValuePair(args[8], args[9]));
            case 8:
                symbolVec.push(new KeyValuePair(args[6], args[7]));
            case 6:
                symbolVec.push(new KeyValuePair(args[4], args[5]));
            case 4:
                symbolVec.push(new KeyValuePair(args[2], args[3]));
            case 2:
                symbolVec.push(new KeyValuePair(args[0], args[1]));
            case 0:
                symbolVec.reverse()
                symbols = new PuzzleSymbols(symbolVec);
                break;
            default:
                throw new Error("Invalid arguments");
        }

        while (!this.generateInternal(panel, symbols)) ;
        return;
    }

    /**
     * Make a maze puzzle. The maze will have one solution. panel - panel to generate the puzzle on
     * Setting numStarts or numExits to 0 will keep the starts/exits where they originally were, otherwise the starts/exits originally there will be removed and new ones randomly placed.
     */
    public generateMaze(panel: Panel, numStarts: number = 0, numExits: number = 0): void {
        this.linkPanel(panel);
        while (!this.generate_maze(panel, numStarts, numExits)) ;
    }

    /**
     * Load default panel data, such as dimensions, symmetry, starts/exits, etc. Have to call this after link the Panel
     * @throws {Error} when _panel is null
     * */
    public initPanel(): void {
        if (this._panel === null) {
            throw new Error("ArgumentNullException: _panel cannot be null");
        }
        if (this._width > 0 && this._height > 0 && (this._width !== this._panel.Width || this._height !== this._panel.Height)) {
            this._panel.Resize(Point.pillarWidth !== 0 ? this._width - 1 : this._width, this._height);
        }
        if (this.hasFlag(Config.FixBackground)) {
            this._panel.Resize(this._panel.Width, this._panel.Height); //This will force the panel to have to redraw the background
        }
        if (this.hasFlag(Config.TreehouseLayout)) {
            this.init_treehouse_layout();
        }
        if (this._custom_grid.length > 0) { //If we want to start with a certain default grid when generating
            if (this._custom_grid.length < this._panel.Width || this._custom_grid[0].length < this._panel.Height) {
                this._custom_grid = Array.from(Array(this._panel.Width), () => new Array(this._panel.Height).fill(0));
            }
            if (this.hasFlag(Config.PreserveStructure)) {
                for (let x = 0; x < this._panel.Width; x++)
                    for (let y = 0; y < this._panel.Height; y++)
                        if (this._panel.Grid[x][y] === IntersectionFlags.OPEN || (this._panel.Grid[x][y] & 0x60000f) === IntersectionFlags.NO_POINT || (this._panel.Grid[x][y] & Decoration.Shape.Empty) === Decoration.Shape.Empty)
                            this._custom_grid[x][y] = this._panel.Grid[x][y];
            }
            this._panel.Grid = this._custom_grid;
        }
        //Sync up start/exit points between panel and generator. If both are different, the generator's start/exit point list will be used
        if (this._starts.Count === 0)
            this._starts.UnionWith(this._panel.Startpoints);
        else
            this._panel.Startpoints = [...this._starts];
        if (this._exits.Count === 0) {
            for (const e of this._panel.Endpoints) {
                this._exits.Add(new Point(e.GetX(), e.GetY()));
            }
        } else {
            this._panel.Endpoints.length = 0; // clear
            for (const e of this._exits) {
                this._panel.SetGridSymbol(e.first, e.second, Decoration.Shape.Exit, Decoration.Color.None);
            }
        }
        //Fill gridpos with every available grid block
        this._gridpos.Clear();
        for (let x = 1; x < this._panel.Width; x += 2) {
            for (let y = 1; y < this._panel.Height; y += 2) {
                if (!(this.hasFlag(Config.PreserveStructure) && (this.get(x, y) & Decoration.Shape.Empty) === Decoration.Shape.Empty))
                    this._gridpos.Add(new Point(x, y));
            }
        }
        //Init the open positions available for symbols. Defaults to every grid block unless a custom openpos has been specified
        if (this.openPos.Count > 0) this._openpos = this.openPos;
        else this._openpos = this._gridpos;
        for (const p of this.blockPos) this._openpos.Remove(p); //Remove the points which the user has defined to not place symbols on
        for (const p of this._splitPoints) this._openpos.Remove(p); //The split points will have erasers and cannot have any other symbols placed on them
        this._fullGaps = this.hasFlag(Config.FullGaps);
        if (this._symmetry !== 0 || this._id === 0x00076 || this._id === 0x01D3F) this._panel.symmetry = this._symmetry; //Init user-defined puzzle symmetry if not "None".
        //0x00076 (Symmetry Island Fading Lines 7) and 0x01D3F (Keep Blue Pressure Plates) are exceptions because they need to have symmetry removed
        if (this.pathWidth !== 1) this._panel.pathWidth = this.pathWidth; //Init path scale. "1" is considered the default, and therefore means no change.
    }

    public setPath(path: SortedSet<Point>): void {
        this.customPath = path;
        for (const p of path) this.setSymbol(IntersectionFlags.PATH, p.first, p.second);
    }

    public setFlag(option: Config): void {
        this._config |= option;
    }

    /**
     * Place a specific symbol into the puzzle at the specified location. The generator will add other symbols, but will leave the set ones where they are.
     *
     * @param symbol The symbol to place
     * @param x
     * @param y The coordinates to put it at. (0, 0) is at top left. Lines are at even coordinates and grid blocks at odd coordinates
     */
    public setSymbol(symbol: Decoration.Shape | IntersectionFlags, x: number, y: number): void {
        this._custom_grid = Array.from(Array(Math.max(x + 1, this._custom_grid.length)), () => new Array(Math.max(y + 1, this._custom_grid[0].length)));

        if (symbol === Decoration.Shape.Start) this._starts.Add(new Point(x, y));
        else if (symbol === Decoration.Shape.Exit) this._exits.Add(new Point(x, y));
        else this._custom_grid[x][y] = symbol; //Starts and exits are not set into the grid
    }

    /**
     * Set the size of the grid to generate the puzzle on. The grid size is the number of grid blocks, not the number of lines. This setting will persist between puzzle generation calls. (0, 0) will have the generator use the same dimensions as the orignal puzzle.
     */
    public setGridSize(width: number, height: number): void {
        if (width <= 0 || height <= 0) {
            this._width = 0;
            this._height = 0;
        } else {
            this._width = width * 2 + 1;
            this._height = height * 2 + 1;
        }
    }

    public setFlagOnce(option: Config): void {
        this._config |= option;
        this._oneTimeAdd |= option;
    }

    public hasFlag(option: Config): boolean {
        return (this._config & option) !== 0;
    }

    public removeFlag(option: Config): void {
        this._config &= ~option;
    }

    public resetConfig(): void {
        this.setGridSize(0, 0);
        this._symmetry = Panel.Symmetry.None;
        this.pathWidth = 1;
        if (this.hasFlag(Config.DisableReset)) {
            this.resetVars();
        }
        this._config = 0;
        this._oneTimeAdd = Config.None;
        this._oneTimeRemove = Config.None;
        this.arrowColor = this.backgroundColor = this.successColor = new Color(0, 0, 0, 0);
        ;
    }

    private get(pos: Point): number;
    private get(x: number, y: number): number;
    private get(posOrX: Point | number, y?: number): number {
        let x: number, yy: number;

        if (posOrX instanceof Point) {
            // 调用的是 get(Point)
            const pos = posOrX as Point
            x = pos.first;
            yy = pos.second;
        } else {
            // 调用的是 get(x, y)
            x = posOrX as number;
            yy = y!;
        }

        return this._panel.Grid[x][yy];
    }

    private set(pos: Point, val: number): void
    private set(x: number, y: number, val: number): void
    private set(arg1: Point | number, arg2: number, arg3?: number): void {
        if (arg1 instanceof Point) {
            const pos = arg1;
            const val = arg2;
            this._panel.Grid[pos.first][pos.second] = val;
        } else {
            const x = arg1
            const y = arg2
            const val = arg3
            this._panel.Grid[x][y] = val;
        }
    }


    private get_symbol_type(flags: number): number {
        return flags & 0x700;
    }

    private set_path(pos: Point): void {
        this._panel.Grid[pos.first][pos.second] = IntersectionFlags.PATH;
        this._path.Add(pos);
        if (this._panel.symmetry !== 0) {
            this._path1.Add(pos);
            const sp: Point = this.get_sym_point(pos);
            this._panel.Grid[sp.first][sp.second] = IntersectionFlags.PATH;
            this._path.Add(sp);
            this._path2.Add(sp);
        }
    }

    private get_sym_point(pos: Point): Point {
        return this._panel.get_sym_point(pos);
    }

    private get_parity(pos: Point): number {
        return (Math.trunc(pos.first / 2) + Math.trunc(pos.second / 2)) % 2;
    }

    public linkPanel(panel: Panel): void {
        this._panel = panel;
        this._id = panel.ID;
    }

    private clear(): void {
        if (this._custom_grid.length > 0) {
            this._panel.Grid = this._custom_grid;
        } else for (let x = 0; x < this._panel.Width; x++) {
            for (let y = 0; y < this._panel.Height; y++) {
                if (this.hasFlag(Config.PreserveStructure) && (this._panel.Grid[x][y] === IntersectionFlags.OPEN || (this._panel.Grid[x][y] & 0x60000f) === IntersectionFlags.NO_POINT || (this._panel.Grid[x][y] & Decoration.Shape.Empty) === Decoration.Shape.Empty)) continue;
                this._panel.Grid[x][y] = 0;
            }
        }
        this._panel.Style &= ~0x2ff8; //Remove all element flags
        this._path.Clear();
        this._path1.Clear();
        this._path2.Clear();
    }

    /**
     * Reset generator variables and lists used when generating puzzles. (not config settings)
     */
    private resetVars(): void {
        this._panel = null; //This is needed for the generator to read in the next panel
        this._starts.Clear();
        this._exits.Clear();
        this._custom_grid = [[]];
        this.hitPoints.length = 0;
        this._obstructions.length = 0;
        this.openPos.Clear();
        this.blockPos.Clear();
        this._splitPoints.length = 0;
    }

    /**
     *Place start and exits in central positions like in the treehouse
     */
    private init_treehouse_layout(): void {
        const pivot = this._panel.Endpoints.length > 2;
        this.setSymbol(Decoration.Shape.Start, Math.trunc(this._panel.Width / 2), this._panel.Height - 1);
        this.setSymbol(Decoration.Shape.Exit, Math.trunc(this._panel.Width / 2), 0);
        if (pivot) {
            this.setSymbol(Decoration.Shape.Exit, this._panel.Width - 1, this._panel.Height / 2);
            this.setSymbol(Decoration.Shape.Exit, 0, this._panel.Height / 2);
        }
    }

    private pick_random<T>(vec: Array<T>): T
    private pick_random<T>(set: SortedSet<T>): T
    private pick_random<T>(setOrVec: Array<T> | SortedSet<T>): T {
        if (setOrVec instanceof Array) {
            const vec = setOrVec as Array<T>;
            return vec[this._random.Next(vec.length)];
        } else {
            const set = setOrVec as SortedSet<T>
            const index = this._random.Next(set.Count);
            return set.getElementByPos(index);
        }
    }

    private on_edge(p: Point): boolean {
        return (Point.pillarWidth === 0 && (p.first === 0 || p.first + 1 === this._panel.Width) || p.second === 0 || p.second + 1 === this._panel.Height);
    }

    private off_edge(p: Point): boolean {
        return (p.first < 0 || p.first >= this._panel.Width || p.second < 0 || p.second >= this._panel.Height);
    }

    private generateInternal(panel: Panel, symbols: PuzzleSymbols): boolean {
        this.linkPanel(panel)
        this.initPanel();

        //Multiple erasers are forced to be separate by default. This is because combining them causes unpredictable and inconsistent behavior.
        if (symbols.getNum(Decoration.Shape.Eraser) > 1 && !this.hasFlag(Config.CombineErasers)) {
            this.setSymbol(Decoration.Shape.Gap_Row, 1, 0);
            this.setSymbol(Decoration.Shape.Gap_Row, this._panel.Width - 2, this._panel.Height - 1);
            this._splitPoints = [new Point(1, 1), new Point(this._panel.Width - 2, this._panel.Height - 2)];
            this.initPanel(); //Re-initing to account for the newly added information
        }

        //Init parity for full dot puzzles
        if (symbols.getNum(Decoration.Shape.Dot) >= this._panel.get_num_grid_points() - 2)
            this._parity = (this._panel.get_parity() + (
                !symbols.Any(Decoration.Shape.Start) ? this.get_parity(this.pick_random(this._starts)) :
                    !symbols.Any(Decoration.Shape.Exit) ? this.get_parity(this.pick_random(this._exits)) : this._random.Next(2))) % 2;
        else this._parity = -1; //-1 indicates a non-full dot puzzle

        if (symbols.Any(Decoration.Shape.Start)) this.place_start(symbols.getNum(Decoration.Shape.Start));
        if (symbols.Any(Decoration.Shape.Exit)) this.place_exit(symbols.getNum(Decoration.Shape.Exit));

        //Make a random path unless a fixed one has been defined
        if (this.customPath.Count === 0) {
            let fails = 0;
            while (!this.generate_path(symbols)) {
                if (fails++ > 20) return false; //It gets several chances to make a path so that the whole init process doesn't have to be repeated so many times
            }
        } else this._path = this.customPath;

        const solution = Array<string>(); //For debugging only
        for (let y = 0; y < this._panel.Height; y++) {
            const row = new Array<string>();
            for (let x = 0; x < this._panel.Width; x++) {
                if (this.get(x, y) === IntersectionFlags.PATH) {
                    row.push("xx");
                } else row.push("  ");
            }
            solution.push(row.toString());
        }
        // console.debug(solution)
        //Attempt to add the symbols
        if (!this.place_all_symbols(symbols)) //TODO:关键函数
            return false;

        if (!this.hasFlag(Config.DisableWrite)) this.setAllStyles();
        return true;
    }

    /**
     * Place the provided symbols onto the puzzle. symbols - a structure describing types and amounts of symbols to add.
     */
    private place_all_symbols(symbols: PuzzleSymbols): boolean {
        const eraseSymbols = new Array<number>;
        const eraserColors = new Array<number>;
        //If erasers are present, choose symbols to be erased and remove them pre-emptively
        for (const s of symbols.getSymbols(Decoration.Shape.Eraser)) {
            for (let i = 0; i < s.Value; i++) {
                eraserColors.push(s.Key & 0xf);
                eraseSymbols.push(this.hasFlag(Config.FalseParity) ? Decoration.Shape.Dot_Intersection : symbols.popRandomSymbol());
            }
        }

        //Symbols are placed in stages according to their type
        //In each of these loops, s.Key is the symbol and s.Key is the amount of it to add

        Generator._SHAPEDIRECTIONS = (this.hasFlag(Config.DisconnectShapes) ? Generator._DISCONNECT : Generator._DIRECTIONS2);
        let numShapes = 0, numRotate = 0, numNegative = 0;
        const colors = Array<number>(), negativeColors = Array<number>();
        for (const s of symbols.getSymbols(Decoration.Shape.Poly)) {
            for (let i = 0; i < s.Value; i++) {
                if ((s.Key & Decoration.Shape.Can_Rotate) !== 0) numRotate++;
                if ((s.Key & Decoration.Shape.Negative) !== 0) {
                    numNegative++;
                    negativeColors.push(s.Key & 0xf);
                } else {
                    numShapes++;
                    colors.push(s.Key & 0xf);
                }
            }
        }
        if (numShapes > 0 && !this.place_shapes(colors, negativeColors, numShapes, numRotate, numNegative) || numShapes == 0 && numNegative > 0)
            return false;

        this._stoneTypes = symbols.getSymbols(Decoration.Shape.Stone).length;
        this._bisect = true; //This flag helps the generator prevent making two adjacent regions of stones the same color
        for (const s of symbols.getSymbols(Decoration.Shape.Stone)) if (!this.place_stones(s.Key & 0xf, s.Value))
            return false;
        for (const s of symbols.getSymbols(Decoration.Shape.Triangle)) if (!this.place_triangles(s.Key & 0xf, s.Value, s.Key >> 16))
            return false;
        // for (const s of symbols[Decoration.Shape.Arrow]) if (!this.place_arrows(s.Key & 0xf, s.Value, s.Key >> 12))
        //     return false;
        for (const s of symbols.getSymbols(Decoration.Shape.Star)) if (!this.place_stars(s.Key & 0xf, s.Value))
            return false;
        // if (symbols.style == Panel.Styles.HAS_STARS && this.hasFlag(Config.TreehouseLayout) && !this.checkStarZigzag(this._panel))
        //     return false;
        // if (eraserColors.length > 0 && !this.place_erasers(eraserColors, eraseSymbols))
        //     return false;
        for (const s of symbols.getSymbols(Decoration.Shape.Dot)) if (!this.place_dots(s.Value, (s.Key & 0xf), (s.Key & ~0xf) === Decoration.Shape.Dot_Intersection))
            return false;
        for (const s of symbols.getSymbols(Decoration.Shape.Gap)) if (!this.place_gaps(s.Value))
            return false;
        return true;
    }

    /**
     * 使用给定的symbols生成一条随机的道路
     * 这个道路从一个随机的start开始，不会经过walls和symbols
     */
    private generate_path(symbols: PuzzleSymbols): boolean {
        this.clear();

        if (this._obstructions.length > 0) {
            const walls: Array<Point> = this.pick_random(this._obstructions);
            for (const p of walls) if (this.get(p) === 0) this.set(p, (p.first % 2 === 0 ? Decoration.Shape.Gap_Column : Decoration.Shape.Gap_Row));
            const result = (this.hasFlag(Config.ShortPath) ? this.generate_path_length(1) : this._parity !== -1 ? this.generate_longest_path() :
                this.hitPoints.length > 0 ? this.generate_special_path() : this.generate_path_length(Math.trunc(this._panel.get_num_grid_points() * 3 / 4)));
            for (const p of walls) if ((this.get(p) & Decoration.Shape.Gap) !== 0) this.set(p, 0);
            return result;
        }

        if (this.hitPoints.length > 0) {
            return this.generate_special_path();
        }

        if (this._parity !== -1 || this.hasFlag(Config.LongestPath)) {
            return this.generate_longest_path();
        }

        if (this.hasFlag(Config.ShortPath))
            return this.generate_path_length(1);

        //The diagonal symmetry puzzles have a lot of points that can't be hit, so I have to reduce the path length
        if (this._panel.symmetry === Panel.Symmetry.FlipXY || this._panel.symmetry === Panel.Symmetry.FlipNegXY) {
            return this.generate_path_length(Math.trunc(this._panel.get_num_grid_points() * 3 / 4) - Math.trunc(this._panel.Width / 2));
        }

        //Dot puzzles have a longer path by default. Vertical/horizontal symmetry puzzles are also longer because they tend to be too simple otherwise
        if (this.hasFlag(Config.LongPath) || symbols.style === Panel.Styles.HAS_DOTS && !this.hasFlag(Config.PreserveStructure) &&
            !(this._panel.symmetry === Panel.Symmetry.Vertical && (Math.trunc(this._panel.Width / 2)) % 2 === 0 ||
                this._panel.symmetry === Panel.Symmetry.Horizontal && (Math.trunc(this._panel.Height / 2)) % 2 === 0)) {
            return this.generate_path_length(this._panel.get_num_grid_points() * 7 / 8);
        }

        //For stone puzzles, the path must have a certain number of regions
        if (symbols.style === Panel.Styles.HAS_STONES && this._splitPoints.length === 0)
            return this.generate_path_regions(Math.min(symbols.getNum(Decoration.Shape.Stone), Math.trunc((Math.trunc(this._panel.Width / 2) + Math.trunc(this._panel.Height / 2)) / 2) + 1));

        if (symbols.style === Panel.Styles.HAS_SHAPERS) {
            if (this.hasFlag(Config.SplitShapes)) {
                return this.generate_path_regions(symbols.getNum(Decoration.Shape.Poly) + 1);
            }
            return this.generate_path_length(Math.trunc(this._panel.get_num_grid_points() / 2));
        }

        return this.generate_path_length(Math.trunc(this._panel.get_num_grid_points() * 3 / 4));
    }

    /**
     * 生成一条指定长度的道路,会修改_panel.Grid,道路为0x4,最后会由setAllStyles()变为0x0
     * @param minLength 道路最短长度
     * @param maxLength 道路最长长度
     */
    private generate_path_length(minLength: number, maxLength: number = 10000): boolean {
        let fails = 0;
        let pos = this.adjust_point(this.pick_random(this._starts));
        const exit = this.adjust_point(this.pick_random(this._exits));
        if (this.off_edge(pos) || this.off_edge(exit))
            return false;
        this.set_path(pos);
        while (pos.notEquals(exit)) {
            if (fails++ > 20)
                return false;
            const dir: Point = this.pick_random(Generator._DIRECTIONS2);
            const newPos: Point = Point.add(pos, dir);
            if (this.off_edge(newPos) || this.get(newPos) !== 0 || this.get(Point.add(pos, Point.divide(dir, 2))) !== 0
                || newPos.equals(exit) && Math.trunc(this._path.Count / 2) + 2 < minLength) continue;
            if (this._panel.symmetry !== 0 && (this.off_edge(this.get_sym_point(newPos)) || newPos.equals(this.get_sym_point(newPos))))
                continue;
            this.set_path(newPos);
            this.set_path(Point.add(pos, Point.divide(dir, 2)));
            pos = newPos;
            fails = 0;
        }
        return Math.trunc(this._path.Count / 2) + 1 >= minLength && Math.trunc(this._path.Count / 2) + 1 <= maxLength;
    }

    /**
     * Generate a path with the provided number of regions.
     */
    private generate_path_regions(minRegions: number): boolean {
        let fails = 0;
        let regions = 1;
        let pos = this.adjust_point(this.pick_random(this._starts));
        const exit = this.adjust_point(this.pick_random(this._exits));
        if (this.off_edge(pos) || this.off_edge(exit)) return false;
        this.set_path(pos);
        while (pos.notEquals(exit)) {
            if (fails++ > 20)
                return false;
            const dir = this.pick_random(Generator._DIRECTIONS2);
            const newPos = Point.add(pos, dir);
            if (this.off_edge(newPos) || this.get(newPos) !== 0 || this.get(Point.add(pos, Point.divide(dir, 2))) !== 0
                || newPos.equals(exit) && regions < minRegions)
                continue;
            if (this._panel.symmetry !== 0 && (this.off_edge(this.get_sym_point(newPos)) || newPos.equals(this.get_sym_point(newPos)))) continue;
            this.set_path(newPos);
            this.set_path(Point.add(pos, Point.divide(dir, 2)));
            if (!this.on_edge(newPos) && this.on_edge(pos)) {
                regions++;
                if (this._panel.symmetry !== 0) regions++;
            }
            pos = newPos;
            fails = 0;
        }
        return regions >= minRegions;
    }

    /**
     * Generate path that passes through all the hitPoints in order
     */
    private generate_longest_path(): boolean {
        let pos = this.adjust_point(this.pick_random(this._starts));
        const exit = this.adjust_point(this.pick_random(this._exits));
        if (this.off_edge(pos) || this.off_edge(exit)) return false;
        let block = new Point(-10, -10);
        if (this.hasFlag(Config.FalseParity)) { //If false parity, one dot must be left uncovered
            if (this.get_parity(Point.add(pos, exit)) === this._panel.get_parity())
                return false;
            block = new Point(this._random.Next() % (Math.trunc(this._panel.Width / 2) + 1) * 2, this._random.Next() % (Math.trunc(this._panel.Height / 2) + 1) * 2);
            while (pos.equals(block) || exit.equals(block)) {
                block = new Point(this._random.Next() % (Math.trunc(this._panel.Width / 2) + 1) * 2, this._random.Next() % (Math.trunc(this._panel.Height / 2) + 1) * 2);
            }
            this.set_path(block);
        } else if (this.get_parity(Point.add(pos, exit)) !== this._panel.get_parity())
            return false;
        let fails = 0;
        const reqLength = this._panel.get_num_grid_points() + Math.trunc((this._path.Count) / 2);
        let centerFlag = !this.on_edge(pos);
        this.set_path(pos);
        while (pos.notEquals(exit) && !(this._panel.symmetry !== 0 && this.get_sym_point(pos).equals(exit))) {
            const solution: Array<string> = []; //For debugging only
            for (let y = 0; y < this._panel.Height; y++) {
                const row = Array<string>()
                for (let x = 0; x < this._panel.Width; x++) {
                    if (this.get(x, y) === IntersectionFlags.PATH) {
                        row.push("xx");
                    } else row.push("    ");
                }
                solution.push(row.toString());
                // console.debug(solution)
            }
            if (fails++ > 20)
                return false;
            let dir = this.pick_random(Generator._DIRECTIONS2);
            for (const checkDir of Generator._DIRECTIONS2) {
                const check = Point.add(pos, checkDir);
                if (this.off_edge(check) || this.get(check) !== 0)
                    continue;
                if (check.equals(exit)) continue;
                let open = 0;
                for (const checkDir2 of Generator._DIRECTIONS2) {
                    if (!this.off_edge(Point.add(check, checkDir2)) && this.get(Point.add(check, checkDir2)) === 0) {
                        if (++open >= 2) break;
                    }
                }
                if (open < 2) {
                    dir = checkDir;
                    break;
                }
            }
            const newPos = Point.add(pos, dir);
            //Various checks to see if going this direction will lead to any issues
            if (this.off_edge(newPos) || this.get(newPos) !== 0 || this.get(Point.add(pos, Point.divide(dir, 2))) !== 0
                || newPos.equals(exit) && Math.trunc(this._path.Count / 2) + 3 < reqLength ||
                this._panel.symmetry !== 0 && this.get_sym_point(newPos).equals(exit) && Math.trunc(this._path.Count / 2) + 3 < reqLength) continue;
            if (this._panel.symmetry !== 0 && (this.off_edge(this.get_sym_point(newPos)) || newPos.equals(this.get_sym_point(newPos)))) continue;
            if (this.on_edge(newPos) && Point.pillarWidth === 0 && this._panel.symmetry !== Panel.Symmetry.Horizontal && Point.add(newPos, dir).notEquals(block) && (this.off_edge(Point.add(newPos, dir)) || this.get(Point.add(newPos, dir)) !== 0)) {
                if (centerFlag && this.off_edge(Point.add(newPos, dir))) {
                    centerFlag = false;
                } else {
                    let open = 0;
                    for (const checkDir of Generator._DIRECTIONS2) {
                        if (!this.off_edge(Point.add(newPos, checkDir)) && this.get(Point.add(newPos, checkDir)) === 0) {
                            if (++open >= 2) break;
                        }
                    }
                    if (open >= 2) continue;
                }
            }
            this.set_path(newPos);
            this.set_path(Point.add(pos, Point.divide(dir, 2)));
            pos = newPos;
            fails = 0;
        }
        if (!this.off_edge(block)) //Uncover the one dot for false parity
            this.set(block, 0);
        return Math.trunc(this._path.Count / 2) + 1 === reqLength;
    }

    /**
     * Generate path that passes through all of the hitPoints in order
     */
    private generate_special_path(): boolean {
        let pos = this.adjust_point(this.pick_random(this._starts));
        const exit = this.adjust_point(this.pick_random(this._exits));
        if (this.off_edge(pos) || this.off_edge(exit))
            return false;
        this.set_path(pos);
        for (const p of this.hitPoints) {
            this.set(p, IntersectionFlags.PATH);
        }
        let hitIndex = 0;
        const minLength = Math.trunc(this._panel.get_num_grid_points() * 3 / 4);
        while (pos.notEquals(exit)) {
            let validDir: Array<Point> = [];
            for (const dir of Generator._DIRECTIONS2) {
                const newPos = Point.add(pos, dir);
                if (this.off_edge(newPos)) continue;
                const connectPos = Point.add(pos, Point.divide(dir, 2));
                //Go through the hit point if passing next to it
                if (this.get(connectPos) === IntersectionFlags.PATH && hitIndex < this.hitPoints.length && connectPos.equals(this.hitPoints[hitIndex])) {
                    validDir = [dir];
                    hitIndex++;
                    break;
                }
                if (this.get(newPos) !== 0 || this.get(connectPos) !== 0 || newPos.equals(exit) && (hitIndex !== this.hitPoints.length || Math.trunc(this._path.Count / 2 + 2) < minLength)) continue;
                if (this._panel.symmetry !== 0 && newPos.equals(this.get_sym_point(newPos))) continue;
                let fail = false;
                for (const dir2 of Generator._DIRECTIONS1) {
                    if (!this.off_edge(Point.add(newPos, dir2)) && this.get(Point.add(newPos, dir2)) === IntersectionFlags.PATH && Point.add(newPos, dir2).notEquals(this.hitPoints[hitIndex])) {
                        fail = true;
                        break;
                    }
                }
                if (fail) continue;
                validDir.push(dir);
            }
            if (validDir.length === 0)
                return false;
            const dir3 = this.pick_random(validDir);
            this.set_path(Point.add(pos, dir3));
            this.set_path(Point.add(pos, Point.divide(dir3, 2)));
            pos = Point.add(pos, dir3);
        }
        return hitIndex === this.hitPoints.length && this._path.Count >= minLength;
    }

    /**
     * If a point is on an edge, bump it randomly to an adjacent vertex. Otherwise, the point is untouched
     * */
    private adjust_point(pos: Point): Point {
        if (pos.first % 2 !== 0) {
            if (this.get(pos) !== 0) return new Point(-10, -10);

            this.set_path(pos);
            return new Point(pos.first - 1 + this._random.Next(2) * 2, pos.second);
        }
        if (pos.second % 2 !== 0) {
            if (this.get(pos) !== 0) return new Point(-10, -10);
            this.set_path(pos);
            return new Point(pos.first, pos.second - 1 + this._random.Next(2) * 2);
        }
        if (this._panel.symmetry !== 0 && this._exits.Contains(pos) && !this._exits.Contains(this.get_sym_point(pos))) return new Point(-10, -10);

        return pos;
    }

    /**
     * Get the set of points in region containing the point (pos)
     */
    private get_region(pos: Point): SortedSet<Point> {
        const region = new SortedSet<Point>();
        const check = Array<Point>();
        check.push(pos);
        region.Add(pos);
        while (check.length > 0) {
            const p = check[check.length - 1];
            check.pop(); //TODO 修改过请注意逻辑是否正确
            for (const dir of Generator._DIRECTIONS1) {
                const p1 = Point.add(p, dir);
                if (this.on_edge(p1)) continue;
                if (this.get(p1) === IntersectionFlags.PATH || this.get(p1) === IntersectionFlags.OPEN) continue;
                const p2 = Point.add(p, Point.multiply(dir, 2));
                if ((this.get(p2) & Decoration.Shape.Empty) === Decoration.Shape.Empty) continue;
                if (region.Add(p2)) {
                    check.push(p2);
                }
            }
        }
        return region;
    }

    /**
     * Place a start point in a random location
     */
    private place_start(amount: number): boolean {
        this._starts.Clear();
        this._panel.Startpoints = [];

        while (amount > 0) {
            const pos = new Point(this._random.Next() % Math.trunc(this._panel.Width / 2 + 1) * 2, this._random.Next() % Math.trunc(this._panel.Height / 2 + 1) * 2);
            if (this.hasFlag(Config.StartEdgeOnly))
                switch (this._random.Next(4)) {
                    case 0:
                        pos.first = 0;
                        break;
                    case 1:
                        pos.second = 0;
                        break;
                    case 2:
                        pos.first = this._panel.Width - 1;
                        break;
                    case 3:
                        pos.second = this._panel.Height - 1;
                        break;
                }
            if (this._parity !== -1 && this.get_parity(pos) !== (amount === 1 ? this._parity : (this._parity === 0 ? 1 : 0))) continue;
            if (this._starts.Contains(pos) || this._exits.Contains(pos)) continue;
            if (this._panel.symmetry !== 0 && pos.equals(this.get_sym_point(pos))) continue;
            //Highly discourage putting start points adjacent
            let adjacent = false;
            for (const dir of Generator._DIRECTIONS2) {
                if (!this.off_edge(Point.add(pos, dir)) && this.get(Point.add(pos, dir)) === Decoration.Shape.Start) {
                    adjacent = true;
                    break;
                }
            }
            if (adjacent && this._random.Next() % 10 > 0) continue;
            this._starts.Add(pos);
            this._panel.SetGridSymbol(pos.first, pos.second, Decoration.Shape.Start, Decoration.Color.None);
            amount--;
            if (this._panel.symmetry !== 0) {
                const sp = this.get_sym_point(pos);
                this._starts.Add(sp);
                this._panel.SetGridSymbol(sp.first, sp.second, Decoration.Shape.Start, Decoration.Color.None);
            }
        }
        return true;
    }

    /**
     * Place an exit point in a random location on the edge of the grid
     */
    private place_exit(amount: number): boolean {
        this._exits.Clear();
        this._panel.Endpoints = [];
        while (amount > 0) {
            const pos = new Point(this._random.Next() % Math.trunc(this._panel.Width / 2 + 1) * 2, this._random.Next() % Math.trunc(this._panel.Height / 2 + 1) * 2);
            switch (this._random.Next(4)) {
                case 0:
                    pos.first = 0;
                    break;
                case 1:
                    pos.second = 0;
                    break;
                case 2:
                    pos.first = this._panel.Width - 1;
                    break;
                case 3:
                    pos.second = this._panel.Height - 1;
                    break;
            }
            if (this._parity !== -1 && (this.get_parity(pos) + this._panel.get_parity()) % 2 !== (amount === 1 ? this._parity : (this._parity === 0 ? 1 : 0))) continue;
            if (this._starts.Contains(pos) || this._exits.Contains(pos)) continue;
            if (this._panel.symmetry !== 0 && pos.equals(this.get_sym_point(pos))) continue;
            if (this._panel.symmetry !== 0 && this.get_sym_point(pos).first !== 0 && this.get_sym_point(pos).second !== 0) continue;
            //Prevent putting exit points adjacent
            let adjacent = false;
            for (const dir of Generator._8DIRECTIONS2) {
                if (!this.off_edge(Point.add(pos, dir)) && this.get(Point.add(pos, dir)) === Decoration.Shape.Exit) {
                    adjacent = true;
                    break;
                }
            }
            if (adjacent) continue;
            this._exits.Add(pos);
            this._panel.SetGridSymbol(pos.first, pos.second, Decoration.Shape.Exit, Decoration.Color.None);
            amount--;
            if (this._panel.symmetry !== 0) {
                const sp: Point = this.get_sym_point(pos);
                this._exits.Add(sp);
                this._panel.SetGridSymbol(sp.first, sp.second, Decoration.Shape.Exit, Decoration.Color.None);
            }
        }
        return true;
    }

    /**
     * Check if a dot can be placed at pos.
     * */
    private can_place_dot(pos: Point, intersectionOnly: boolean): boolean {
        if ((this.get(pos) & IntersectionFlags.DOT) !== 0)
            return false;
        if (this._panel.symmetry !== 0) {
            //For symmetry puzzles, make sure the current pos and symmetric pos are both valid
            const symPos = this.get_sym_point(pos);
            if (symPos === pos) return false;
            const backupSym: Panel.Symmetry = this._panel.symmetry;
            this._panel.symmetry = Panel.Symmetry.None; //To prevent endless recursion
            //if (!can_place_dot(get_sym_point(pos))) {
            if (!this.can_place_dot(symPos, intersectionOnly)) {
                this._panel.symmetry = backupSym;
                return false;
            }
            this._panel.symmetry = backupSym;
        }
        if (this._panel.symmetry === Panel.Symmetry.RotateLeft && this._path1.Contains(pos) && this._path2.Contains(pos))
            return false; //Prevent sharing of dots between symmetry lines
        if (this.hasFlag(Config.DisableDotIntersection)) return true;
        for (const dir of Generator._8DIRECTIONS1) {
            const p = Point.add(pos, dir);
            if (!this.off_edge(p) && (this.get(p) & IntersectionFlags.DOT) !== 0) {
                //Don't allow adjacent dots
                if (dir.first === 0 || dir.second === 0)
                    return false;
                //Allow diagonally adjacent placement some of the time
                if (this._random.Next(2) > 0)
                    return false;
            }
        }
        //Allow 2-space horizontal/vertical placement some of the time
        if (this._random.Next() % (intersectionOnly ? 10 : 5) > 0) {
            for (const dir of Generator._DIRECTIONS2) {
                const p = Point.add(pos, dir);
                if (!this.off_edge(p) && (this.get(p) & IntersectionFlags.DOT) !== 0) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Place the given amount of dots at random points on the path
     */
    private place_dots(amount: number, color: number, intersectionOnly: boolean): boolean {
        if (this._parity !== -1) { //For full dot puzzles, don't put dots on the starts and exits unless there are multiple
            for (let x = 0; x < this._panel.Width; x += 2) {
                for (let y = 0; y < this._panel.Height; y += 2) {
                    if (this._starts.Count === 1 && this._starts.Contains(new Point(x, y))) continue;
                    if (this._exits.Count === 1 && this._exits.Contains(new Point(x, y))) continue;
                    if (this.get(x, y) === 0) continue;
                    this.set(x, y, Decoration.Shape.Dot_Intersection);
                }
            }
            amount -= this._panel.get_num_grid_points();
            if (amount <= 0) return true;
            intersectionOnly = false;
            this.setFlagOnce(Config.DisableDotIntersection);
        }

        if (color === Decoration.Color.Blue || color === Decoration.Color.Cyan)
            color = IntersectionFlags.DOT_IS_BLUE;
        else if (color === Decoration.Color.Yellow || color === Decoration.Color.Orange)
            color = IntersectionFlags.DOT_IS_ORANGE;
        else color = 0;

        let open = (color === 0 ? new SortedSet<Point>(this._path) : color === IntersectionFlags.DOT_IS_BLUE ? new SortedSet<Point>(this._path1) : new SortedSet<Point>(this._path2));
        for (const p of this._starts) open.Remove(p);
        for (const p of this._exits) open.Remove(p);
        for (const p of this.blockPos) open.Remove(p);
        if (intersectionOnly) {
            const intersections = new SortedSet<Point>();
            for (const p of open) {
                if (p.first % 2 === 0 && p.second % 2 === 0)
                    intersections.Add(p);
            }
            open = intersections;
        }
        if (this.hasFlag(Config.DisableDotIntersection)) {
            const intersections = new SortedSet<Point>();
            for (const p of open) {
                if (p.first % 2 !== 0 || p.second % 2 !== 0)
                    intersections.Add(p);
            }
            open = intersections;
        }

        while (amount > 0) {
            if (open.Count === 0)
                return false;
            const pos = this.pick_random(open);
            open.Remove(pos);
            if (!this.can_place_dot(pos, intersectionOnly)) continue;
            let symbol = (pos.first & 1) === 1 ? Decoration.Shape.Dot_Row : (pos.second & 1) === 1 ? Decoration.Shape.Dot_Column : Decoration.Shape.Dot_Intersection;
            this.set(pos, symbol | color);
            for (const dir of Generator._DIRECTIONS1) {
                open.Remove(Point.add(pos, dir));
            } //If symmetry, set a flag to break the point symmetric to the dot
            if (this._panel.symmetry !== 0) {
                const sp = this.get_sym_point(pos);
                symbol = (sp.first & 1) === 1 ? Decoration.Shape.Dot_Row : (sp.second & 1) === 1 ? Decoration.Shape.Dot_Column : Decoration.Shape.Dot_Intersection;
                if (symbol !== Decoration.Shape.Dot_Intersection) this.set(sp, symbol & ~Decoration.Shape.Dot);
                open.Remove(sp);
                for (const dir of Generator._DIRECTIONS1) {
                    open.Remove(Point.add(sp, dir));
                }
            }
            amount--;
        }
        return true;
    }

    /**
     * Check if a stone can be placed at pos.
     */
    private can_place_stone(region: SortedSet<Point>, color: number): boolean {
        for (const p of region) {
            const sym = this.get(p);
            if (this.get_symbol_type(sym) === Decoration.Shape.Stone) return (sym & 0xf) === color;
        }
        return true;
    }

    /**
     * Place the given amount of stones with the given color
     */
    private place_stones(color: number, amount: number): boolean {
        const open = new SortedSet<Point>(this._openpos);
        const open2 = new SortedSet<Point>; //Used to store open points removed from the first pass, to make sure a stone is put in every non-adjacent region
        let passCount = 0;
        const originalAmount = amount;
        while (amount > 0) {
            if (open.Count === 0) {
                //Make sure there is room for the remaining stones and enough partitions have been made (based on the grid size)
                if (open2.Count < amount || this._bisect && passCount < Math.min(originalAmount, (this._panel.Width / 2 + this._panel.Height / 2 + 2) / 4))
                    return false;
                //Put remaining stones wherever they will fit
                const pos1 = this.pick_random(open2);
                this.set(pos1, Decoration.Shape.Stone | color);
                this._openpos.Remove(pos1);
                open2.Remove(pos1);
                amount--;
                continue;
            }
            const pos = this.pick_random(open);
            const region: SortedSet<Point> = this.get_region(pos);
            if (!this.can_place_stone(region, color)) {
                for (const p of region) {
                    open.Remove(p);
                }
                continue;
            }
            if (this._stoneTypes > 2) { //If more than two colors, group stones together, otherwise it takes too long to generate.
                open.Clear();
                for (const p of region) {
                    if (this._openpos.Contains(p))
                        open.Add(p);
                }
            }
            open.Remove(pos);
            if (this._panel.symmetry !== 0) {
                open.Remove(this.get_sym_point(pos));
            }
            if (this._stoneTypes === 2) {
                for (const p of region) {
                    if (open.Remove(p)) open2.Add(p);
                } //Remove adjacent regions from the open list
                for (const p of region) {
                    for (const dir of Generator._8DIRECTIONS2) {
                        const pos2 = Point.add(p, dir);
                        if (open.Contains(pos2) && !region.Contains(pos2)) {
                            for (const P of this.get_region(pos2)) {
                                open.Remove(P);
                            }
                        }
                    }
                }
            }
            this.set(pos, Decoration.Shape.Stone | color);
            this._openpos.Remove(pos);
            amount--;
            passCount++;
        }
        this._bisect = false; //After placing one color, adjacent regions are allowed
        this._stoneTypes--;
        return true;
    }

    /**
     * Check if a gap can be placed at pos.
     */
    private can_place_gap(pos: Point): boolean {
        //Prevent putting open gaps at edges of the puzzle
        if (pos.first === 0 || pos.second === 0) {
            if (this.hasFlag(Config.FullGaps)) return false;
        } else if (this._random.Next(2) === 0) return false; //Encourages gaps on outside border
        //Prevent putting a gap on top of a start/end point
        if (this._starts.Contains(pos) || this._exits.Contains(pos))
            return false;
        //For symmetry puzzles, prevent putting two gaps symmetrically opposite
        if (this._panel.symmetry !== 0 && (this.get_sym_point(pos) === pos) || (this.get(this.get_sym_point(pos)) & Decoration.Shape.Gap) !== 0) return false;
        if ((this._panel.symmetry === Panel.Symmetry.ParallelH || this._panel.symmetry === Panel.Symmetry.ParallelHFlip) && pos.second === Math.trunc(this._panel.Height / 2)) return false;
        if ((this._panel.symmetry === Panel.Symmetry.ParallelV || this._panel.symmetry === Panel.Symmetry.ParallelVFlip) && pos.first === Math.trunc(this._panel.Width / 2)) return false;
        if (this._panel.symmetry === Panel.Symmetry.FlipNegXY && (pos.first + pos.second === this._width - 1 || pos.first + pos.second === this._width + 1)) return false;
        if (this._panel.symmetry === Panel.Symmetry.FlipXY && (pos.first - pos.second === 1 || pos.first - pos.second === -1)) return false;
        if (this.hasFlag(Config.FullGaps)) { //Prevent forming dead ends with open gaps
            const checkPoints = (pos.first % 2 === 0 ? [new Point(pos.first, pos.second - 1), new Point(pos.first, pos.second + 1)]
                : [new Point(pos.first - 1, pos.second), new Point(pos.first + 1, pos.second)]);
            for (const check of checkPoints) {
                let valid = 4;
                for (const dir of Generator._DIRECTIONS1) {
                    const p = Point.add(check, dir);
                    if (this.off_edge(p) || (this.get(p) & IntersectionFlags.GAP) !== 0 || this.get(p) === IntersectionFlags.OPEN) {
                        if (--valid <= 2) {
                            return false;
                        }
                    }
                }
            }
        }
        return true;
    }

    /**
     *  Place the given amount of gaps randomly around the puzzle
     * */
    private place_gaps(amount: number): boolean {
        const open = new SortedSet<Point>();
        for (let y = 0; y < this._panel.Height; y++) {
            for (let x = (y + 1) % 2; x < this._panel.Width; x += 2) {
                if (this.get(x, y) === 0 && (!this._fullGaps || !this.on_edge(new Point(x, y)))) {
                    open.Add(new Point(x, y));
                }
            }
        }

        while (amount > 0) {
            if (open.Count === 0)
                return false;
            const pos = this.pick_random(open);
            if (this.can_place_gap(pos)) {
                this.set(pos, this._fullGaps ? IntersectionFlags.OPEN : pos.first % 2 === 0 ? Decoration.Shape.Gap_Column : Decoration.Shape.Gap_Row);
                amount--;
            }
            open.Remove(pos);
        }
        return true;
    }

    /**
     * Count the occurrence of the given symbol color in the given region (for the stars)
     * */
    private count_color(region: SortedSet<Point>, color: number): number {
        let count = 0;
        for (const p of region) {
            const sym = this.get(p);
            if (sym != 0 && (sym & 0xf) == color)
                if (count++ == 2) return count;
        }
        return count;
    }

    /**
     * Place the given amount of stars with the given color
     */
    private place_stars(color: number, amount: number): boolean {
        const open = new SortedSet<Point>(this._openpos);
        while (amount > 0) {
            if (open.Count == 0)
                return false;
            let pos = this.pick_random(open);
            const region = this.get_region(pos);
            const open2 = new SortedSet<Point>(); //All the open points in that region
            for (const p of region) {
                if (open.Remove(p)) open2.Add(p);
            }
            const count = this.count_color(region, color);
            if (count >= 2) continue; //Too many of that color
            if (open2.Count + count < 2) continue; //Not enough space to get 2 of that color
            if (count == 0 && amount == 1) continue; //If one star is left, it needs a pair
            this.set(pos, Decoration.Shape.Star | color);
            this._openpos.Remove(pos);
            amount--;
            if (count == 0) { //Add a second star of the same color
                open2.Remove(pos);
                if (open2.Count == 0)
                    return false;
                pos = this.pick_random(open2);
                this.set(pos, Decoration.Shape.Star | color);
                this._openpos.Remove(pos);
                amount--;
            }
        }
        return true;
    }

    /**
     * Place the given amount of triangles with the given color.
     * @param targetCount how many triangles are in the symbol, 0 for random
     * */
    private place_triangles(color: number, amount: number, targetCount: number): boolean {
        if (this._panel.ID == 0x033EA) { //Keep Yellow Pressure Plate
            const count = this.count_sides(new Point(1, 3));
            this.set(new Point(1, 3), Decoration.Shape.Triangle | color | (count << 16));
            this._openpos.Remove(new Point(1, 3));
        }
        const open = new SortedSet<Point>(this._openpos);
        let count1 = 0, count2 = 0, count3 = 0;
        while (amount > 0) {
            if (open.Count == 0)
                return false;
            const pos = this.pick_random(open);
            const count = this.count_sides(pos);
            open.Remove(pos);
            if (this._panel.symmetry != 0) {
                open.Remove(this.get_sym_point(pos));
            }
            if (count == 0 || targetCount != 0 && count != targetCount) continue;
            if (this.hasFlag(Config.TreehouseLayout) || this._panel.ID == 0x289E7) { //If the block is adjacent to a start or exit, don't place a triangle there
                let found = false;
                for (const dir of Generator._DIRECTIONS1) {
                    if (this._starts.Contains(Point.add(pos, dir)) || this._exits.Contains(Point.add(pos, dir))) {
                        found = true;
                        break;
                    }
                }
                if (found) continue;
            }
            if (count == 1) {
                if (targetCount == 0 && count1 * 2 > count2 + count3 && this._random.Next(2) == 0) continue;
                count1++;
            }
            if (count == 2) {
                if (targetCount == 0 && count2 * 2 > count1 + count3 && this._random.Next(2) % 2 == 0) continue;
                count2++;
            }
            if (count == 3) {
                if (targetCount == 0 && count3 * 2 > count1 + count2 && this._random.Next(2) % 2 == 0) continue;
                count3++;
            }
            this.set(pos, Decoration.Shape.Triangle | color | (count << 16));
            this._openpos.Remove(pos);
            amount--;
        }
        return true;
    }

    /**
     * Count how many sides are touched by the line (for the triangles)
     * */
    private count_sides(pos: Point): number {
        let count = 0;
        for (const dir of Generator._DIRECTIONS1) {
            const p = Point.add(pos, dir);
            if (!this.off_edge(p) && this.get(p) == IntersectionFlags.PATH) {
                count++;
            }
        }
        return count;
    }

    // =============================================
    private setAllStyles(): void {
        //erase path - set 0x4 to 0x0
        for (let y = 0; y < this._panel.Height; y++) {
            for (let x = 0; x < this._panel.Width; x++) {
                if (this.get(x, y) === IntersectionFlags.PATH) {
                    this.set(x, y, 0);
                }
            }
        }
        if (this.hasFlag(Config.ResetColors)) {
            this._panel.colorMode = Panel.ColorMode.Reset;
        } else if (this.hasFlag(Config.AlternateColors)) {
            this._panel.colorMode = Panel.ColorMode.Alternate;
        } else if (this.hasFlag(Config.WriteColors)) {
            this._panel.colorMode = Panel.ColorMode.WriteColors;
        } else if (this.hasFlag(Config.TreehouseColors)) {
            this._panel.colorMode = this.colorblind ? Panel.ColorMode.TreehouseAlternate : Panel.ColorMode.Treehouse;
        }
        //双色道路
        if (this.hasFlag(Config.Write2Color)) {
            //AQUA AND YELLOW
        }
        if (this.hasFlag(Config.WriteInvisible)) {
            //USE DEFAULT
        }
        if (this.hasFlag(Config.WriteDotColor)) {
            this._panel.PATTERN_POINT_COLOR = new Color(0.1, 0.1, 0.1, 1);
        }
        if (this.hasFlag(Config.WriteDotColor2)) {
            this._panel.PATTERN_POINT_COLOR = this._panel.SUCCESS_COLOR_A;
        }
        if (this.arrowColor.a > 0 || this.backgroundColor.a > 0 || this.successColor.a > 0) {
            this._panel.OUTER_BACKGROUND = this.backgroundColor;
            if (this.arrowColor.a === 0)
                this._panel.BACKGROUND_REGION_COLOR = this._panel.SUCCESS_COLOR_A;
            this._panel.BACKGROUND_REGION_COLOR = this.arrowColor;
            this._panel.OUTER_BACKGROUND_MODE = 1;
            if (this.successColor.a === 0) this._panel.SUCCESS_COLOR_A = this._panel.BACKGROUND_REGION_COLOR;
            else this._panel.SUCCESS_COLOR_A = this.successColor;
            this._panel.SUCCESS_COLOR_B = this._panel.SUCCESS_COLOR_A;
            this._panel.ACTIVE_COLOR = new Color(1, 1, 1, 1);
            this._panel.REFLECTION_PATH_COLOR = new Color(1, 1, 1, 1);
        }
        if (this.hasFlag(Config.TreehouseLayout)) {
            this._panel.SPECULAR_ADD = 0.001;
        }

        this._panel.decorationsOnly = this.hasFlag(Config.DecorationsOnly);
        this._panel.enableFlash = this.hasFlag(Config.EnableFlash);
        this._panel.GRID_SIZE_X = Math.trunc((this._panel.Width + 1) / 2);
        this._panel.GRID_SIZE_Y = Math.trunc((this._panel.Height + 1) / 2);
        /*
        if (_resized && _memory->ReadPanelData<int>(id, NUM_COLORED_REGIONS) > 0)
        {
            //Make two triangles that cover the whole panel
            std::vector<int> newRegions = { 0, xy_to_loc(_width - 1, 0), xy_to_loc(0, 0), 0, xy_to_loc(_width - 1, _height - 1), xy_to_loc(_width - 1, 0), 0, 0 };
            _memory->WritePanelData<int>(id, NUM_COLORED_REGIONS, { static_cast<int>(newRegions.size()) / 4 });
            _memory->WriteArray(id, COLORED_REGIONS, newRegions);
        }
        */
        if (!this._panel.decorationsOnly) this.setIntersections();
        else {
            //std::vector<int> iflags = _memory->ReadArray<int>(id, DOT_FLAGS, _memory->ReadPanelData<int>(id, NUM_DOTS));
            //for (int x = 0; x < _width; x += 2)
            //{
            //    for (int y = 0; y < _height; y += 2)
            //    {
            //        if (_panel.Grid[x, y] & Decoration.Shape.Dot)
            //        {
            //            iflags[x / 2 + (y / 2) * (_width / 2 + 1)] = _panel.Grid[x, y];
            //            _style |= Style::HAS_DOTS;
            //        }
            //    }
            //}
            //_memory->WriteArray<int>(id, DOT_FLAGS, iflags);
        }
        this.setDecorations();
        if (this._panel.enableFlash) this._panel.Style &= ~Panel.Styles.NO_BLINK;
        this._panel.STYLE_FLAGS = this._panel.Style;
        if (this.pathWidth !== 1) this._panel.PATH_WIDTH_SCALE = this.pathWidth;
        //_memory->WritePanelData<int>(id, NEEDS_REDRAW, { 1 });

    }

    /**
     * Set startPoints
     * TODO: 检查正确性
     */
    private setIntersections(): void {
        for (const p of this._panel.Startpoints) {
            this._panel.Grid[p.first][p.second] |= IntersectionFlags.STARTPOINT;
        }

        this._panel.Style &= ~Panel.Styles.HAS_DOTS;

        for (let y = this._panel.Height - 1; y >= 0; y -= 2) {
            for (let x = 0; x < this._panel.Width; x += 2) {
                if ((this._panel.Grid[x][y] & IntersectionFlags.NO_POINT) === 0) this._panel.Grid[x][y] |= IntersectionFlags.INTERSECTION;
                if ((this._panel.Grid[x][y] & IntersectionFlags.DOT) !== 0) {
                    this._panel.Style |= Panel.Styles.HAS_DOTS;
                    if ((this._panel.Grid[x][y] & IntersectionFlags.DOT_IS_BLUE) !== 0 || (this._panel.Grid[x][y] & IntersectionFlags.DOT_IS_ORANGE) !== 0)
                        this._panel.Style |= Panel.Styles.IS_2COLOR;
                }
            }
        }

        if (this._panel.symmetry !== 0) {
            //Rearrange exits to be in symmetric pairs
            for (let i = 0; i < this._panel.Endpoints.length; i += 2) {
                const sp = this._panel.get_sym_point(this._panel.Endpoints[i].GetX(), this._panel.Endpoints[i].GetY());
                for (let j = i + 1; j < this._panel.Endpoints.length; j++) {
                    if (this._panel.Endpoints[j].GetX() === sp.first && this._panel.Endpoints[j].GetY() === sp.second) {
                        [this._panel.Endpoints[i + 1], this._panel.Endpoints[j]] = [this._panel.Endpoints[j], this._panel.Endpoints[i + 1]];
                        break;
                    }
                }
            }
        }

        // Dots/Gaps
        for (let y = this._panel.Height - 1; y >= 0; y--) {
            for (let x = 0; x < this._panel.Width; x++) {
                if (x % 2 === y % 2) continue;
                if (this._panel.Grid[x][y] === 0 || this._panel.Grid[x][y] === IntersectionFlags.OPEN) continue;
                if ((this._panel.Grid[x][y] & IntersectionFlags.DOT) !== 0) {
                    this._panel.Style |= Panel.Styles.HAS_DOTS;
                    if (((this._panel.Grid[x][y] & IntersectionFlags.DOT_IS_BLUE)) !== 0 || (this._panel.Grid[x][y] & IntersectionFlags.DOT_IS_ORANGE) !== 0)
                        this._panel.Style |= Panel.Styles.IS_2COLOR;
                }
            }
        }
    }

    private setDecorations(): void {
        this._panel.Style &= ~0x3fc0;
    }

}


export enum Config {
    None = 0,
    FullGaps = 0x1,
    StartEdgeOnly = 0x2,
    DisableWrite = 0x4,
    PreserveStructure = 0x8,
    MakeStonesUnsolvable = 0x10,
    SmallShapes = 0x20,
    DisconnectShapes = 0x40,
    ResetColors = 0x80,
    DisableCancelShapes = 0x100,
    RequireCancelShapes = 0x200,
    BigShapes = 0x400,
    SplitShapes = 0x800,
    RequireCombineShapes = 0x1000,
    TreehouseLayout = 0x2000,
    TreehouseColors = 0x4000,
    AlternateColors = 0x8000,
    WriteColors = 0x10000,
    Write2Color = 0x20000,
    FixBackground = 0x40000,
    CombineErasers = 0x80000,
    LongPath = 0x100000,
    ShortPath = 0x200000,
    EnableFlash = 0x400000,
    DecorationsOnly = 0x800000,
    FalseParity = 0x1000000,
    DisableDotIntersection = 0x2000000,
    WriteDotColor = 0x4000000,
    WriteDotColor2 = 0x8000000,
    LongestPath = 0x10000000,
    WriteInvisible = 0x20000000,
    DisableReset = 0x40000000,
    MountainFloorH = 0x80000000
}





