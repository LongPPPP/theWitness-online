import {Decoration, Endpoint, IntersectionFlags, Panel} from "./generator/Panel.ts";
import Puzzle from "./puzzle/puzzle.ts";
import type {EndDirection, GridCell, LineCell} from "./puzzle/cell.ts";
import {DOT_BLACK, GAP_BREAK} from "./puzzle/constants.ts";
import {logHexMatrix} from "./generator/utils/Debug_Tools.ts";

function phaseColor(color: number): string {
    switch (color) {
        case Decoration.Color.None:
            return "transparent";
        case Decoration.Color.Black:
            return "#000000"
        case Decoration.Color.White:
            return "#FFFFFF"
        case Decoration.Color.Red:
            return "#FF0000"
        case Decoration.Color.Purple:
            return "#800080"
        case Decoration.Color.Green:
            return "#00FF00"
        case Decoration.Color.Cyan:
            return "#00FFFF"
        case Decoration.Color.Magenta:
            return "#FF00FF"
        case Decoration.Color.Yellow:
            return "#FFFF00"
        case Decoration.Color.Blue:
            return "#0000FF"
        case Decoration.Color.Orange:
            return "#FFA500"
        case Decoration.Color.X:
        default:
            throw Error("Unknown color " + color.toString(16))
    }
}

/**
 * return cell only
 * */
function phaseCell(decoration: number): GridCell {
    const color: string = phaseColor(decoration & 0xF);
    const shape: number = (decoration & ~0XF);

    switch (shape) {
        case Decoration.Shape.Stone:
            return {type: 'square', color: color};
        case Decoration.Shape.Star:
            return {type: 'star', color: color};
        case (Decoration.Shape.Triangle | 0x10000):
            return {type: 'triangle', count: 1, color: color};
        case (Decoration.Shape.Triangle | 0x20000):
            return {type: 'triangle', count: 2, color: color};
        case (Decoration.Shape.Triangle | 0x30000):
            return {type: 'triangle', count: 3, color: color};
        default:
            break;
    }

    return {type: 'nonce'}
}

/**
 * return path only
 * */
function phasePath(decoration: number): LineCell {
    const color: string = phaseColor(decoration & 0xF);
    const path: number = (decoration & ~0XF);

    switch (path) {
        case Decoration.Shape.Gap_Row:
        case Decoration.Shape.Gap_Column:
            return {type: 'line', line: 0, gap: GAP_BREAK};
        case Decoration.Shape.Dot_Intersection:
            return {type: 'line', line: 0, dot: DOT_BLACK}
        case IntersectionFlags.INTERSECTION:
            return {type: 'line', line: 0}
        default:
            break;
    }

    return {type: 'line', line: 0}
}

/**
 * 转换generator中的panel (16进制表示每一格子是什么) 为puzzle
 * */
export function phasePuzzle(_panel: Panel) {
    const height = Math.trunc((_panel.Height - 1) / 2);
    const width = Math.trunc((_panel.Width - 1) / 2);
    const puzzle = new Puzzle(width, height);
    const grid = _panel.Grid;

    for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row].length; col++) {
            const decoration = grid[row][col];

            if ((row & 1) && (col & 1)) {
                puzzle.setCell(row, col, phaseCell(decoration))
            } else {
                puzzle.setCell(row, col, phasePath(decoration))
            }

        }
    }

    // draw start
    const starts = _panel.Startpoints;
    for (const start of starts) {
        puzzle.markStart(start.first, start.second);
    }

    // draw end
    const ends = _panel.Endpoints;
    console.warn(ends[0])
    for (const end of ends) {
        const dir = end.GetDir()
        let dirs: EndDirection = "top"
        if (dir === Endpoint.Direction.UP || dir === Endpoint.Direction.UP_LEFT) {
            dirs = "top"
        } else if (dir === Endpoint.Direction.DOWN || dir === Endpoint.Direction.DOWN_RIGHT) {
            dirs = "bottom"
        } else if (dir === Endpoint.Direction.LEFT || dir === Endpoint.Direction.DOWN_LEFT) {
            dirs = "left"
        } else if (dir === Endpoint.Direction.RIGHT || dir === Endpoint.Direction.UP_RIGHT) {
            dirs = "right"
        } else {
            console.warn("Unknown Direction " + dir)
        }

        puzzle.markEnd(end.GetX(),end.GetY() , dirs);
    }
    return puzzle
}