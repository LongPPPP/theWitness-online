import {
    DOT_BLACK,
    DOT_BLUE,
    DOT_INVISIBLE,
    DOT_NONE,
    DOT_YELLOW,
    GAP_BREAK,
    GAP_FULL,
    GAP_NONE,
    LINE_BLACK,
    LINE_BLUE,
    LINE_NONE,
    LINE_YELLOW
} from "./constants.ts";

interface BaseCell {
    type: string;
    // 遗留属性（用于反序列化）
    color?: string;
    rot?: string | 'all';
}

export type LineDirection = 'left' | 'right' | 'top' | 'down';
export type EndDirection = 'left' | 'right' | 'top' | 'bottom';
export type LineType = typeof LINE_NONE | typeof LINE_BLACK | typeof LINE_BLUE | typeof LINE_YELLOW;
export type DotType = typeof DOT_NONE | typeof DOT_BLACK | typeof DOT_BLUE | typeof DOT_YELLOW | typeof DOT_INVISIBLE;
export type GapType = typeof GAP_NONE | typeof GAP_BREAK | typeof GAP_FULL;

export interface LineCell extends BaseCell {
    type: 'line';
    line: LineType;
    dot?: DotType;
    gap?: GapType;
    start?: boolean;
    end?: EndDirection;
    dir?: LineDirection;
}

export interface OtherCell extends BaseCell {
    type: 'nega' | 'square' | 'star';
}

export interface PolyCell extends BaseCell {
    type: 'poly' | 'ylop';
    polyshape: number;
}

export interface TriangleCell extends BaseCell {
    type: 'triangle';
    count: number;
}

export interface EmptyCell extends BaseCell {
    type: 'nonce';
}

export type GridCell = OtherCell | PolyCell | EmptyCell | TriangleCell;

export type Cell = LineCell | GridCell;

