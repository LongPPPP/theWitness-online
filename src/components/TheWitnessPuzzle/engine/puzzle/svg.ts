import {isRotated, polyominoFromPolyshape} from "./polyominos.ts";
import type {EndDirection} from "./cell.ts";

export type SVGType =
    'square' | 'dot' | 'gap' | 'star' | 'poly' | 'ylop' |
    'nega' | 'nonce' | 'triangle' | 'crayon' | 'start' | 'end' |
    'drag' | 'plus' | 'minus' | 'bridge' | 'arrow' | 'sizer';

export type Params = {
    type: SVGType,
    width: number,
    height: number,
    x: number,
    y: number,
    class?: string,
    color?: string,
    polyshape?: number,
    count?: number,
    text?: string,
    dir?: EndDirection,
    rot?: number,
    stroke?: string,
    strokeWidth?: number,
}

export function createElement(type: string) {
    return document.createElementNS('http://www.w3.org/2000/svg', type)
}

export function drawSymbol(params: Params, customMechanics: boolean) {
    const svg = createElement('svg')
    svg.setAttribute('viewBox', '0 0 ' + params.width + ' ' + params.height)
    if (!params.x) params.x = 0
    if (!params.y) params.y = 0
    drawSymbolWithSvg(svg, params, customMechanics)
    return svg
}

export function drawSymbolWithSvg(svg: HTMLElement | SVGElement, params: Params, customMechanics: boolean = false) {
    if (params.type == 'square') square(svg, params)
    else if (params.type == 'dot') dot(svg, params)
    else if (params.type == 'gap') gap(svg, params)
    else if (params.type == 'star') star(svg, params)
    else if (params.type == 'poly') poly(svg, params)
    else if (params.type == 'ylop') ylop(svg, params)
    else if (params.type == 'nega') nega(svg, params)
    else if (params.type == 'nonce') { /* Do nothing */
    } else if (params.type == 'triangle') triangle(svg, params)
    else if (params.type == 'crayon') crayon(svg, params)
    else if (params.type == 'start') start(svg, params)
    else if (params.type == 'end') end(svg, params)
    else if (params.type == 'drag') drag(svg, params)
    else if (params.type == 'plus') plus(svg, params)
    else if (params.type == 'minus') minus(svg, params)
    else if (params.type == 'bridge' && customMechanics) bridge(svg, params)
    else if (params.type == 'arrow' && customMechanics) arrow(svg, params)
    else if (params.type == 'sizer' && customMechanics) sizer(svg, params)
    else {
        console.error('Cannot draw unknown SVG type: ' + params.type)
    }
}

function square(svg: HTMLElement | SVGElement, params: Params) {
    const rect = createElement('rect')
    svg.appendChild(rect)
    rect.setAttribute('width', String(28))
    rect.setAttribute('height', String(28))
    rect.setAttribute('x', String(params.width / 2 - 14 + params.x))
    rect.setAttribute('y', String(params.height / 2 - 14 + params.y))
    rect.setAttribute('rx', String(7))
    rect.setAttribute('ry', String(7))
    rect.setAttribute('fill', params.color)
    rect.setAttribute('class', params.class)
}

function star(svg: HTMLElement | SVGElement, params: Params) {
    const poly = createElement('polygon')
    svg.appendChild(poly)
    const points = [
        '-10.5 -10.5', // Top left
        '-9.5 -4',
        '-15 0',
        '-9.5 4',
        '-10.5 10.5', // Bottom left
        '-4 9.5',
        '0 15',
        '4 9.5',
        '10.5 10.5', // Bottom right
        '9.5 4',
        '15 0',
        '9.5 -4',
        '10.5 -10.5', // Top right
        '4, -9.5',
        '0 -15',
        '-4 -9.5',
    ]
    poly.setAttribute('transform', 'translate(' + (params.width / 2 + params.x) + ', ' + (params.height / 2 + params.y) + ')')
    poly.setAttribute('points', points.join(', '))
    poly.setAttribute('fill', params.color)
    poly.setAttribute('class', params.class)
}

function poly(svg: HTMLElement | SVGElement, params: Params) {
    if (params.polyshape === 0) return
    const size = 10 // Side length of individual squares in the polyomino
    const space = 4 // Gap between squares in the polyomino
    const polyomino = polyominoFromPolyshape(params.polyshape)

    const bounds = {'xmin': 0, 'xmax': 0, 'ymin': 0, 'ymax': 0}
    for (let i = 0; i < polyomino.length; i++) {
        const pos = polyomino[i]
        bounds.xmin = Math.min(bounds.xmin, pos.x)
        bounds.xmax = Math.max(bounds.xmax, pos.x)
        bounds.ymin = Math.min(bounds.ymin, pos.y)
        bounds.ymax = Math.max(bounds.ymax, pos.y)
    }
    const offset = (size + space) / 2 // Offset between elements to create the gap
    const centerX = (params.width - size - offset * (bounds.xmax + bounds.xmin)) / 2 + params.x
    const centerY = (params.height - size - offset * (bounds.ymax + bounds.ymin)) / 2 + params.y

    for (let i = 0; i < polyomino.length; i++) {
        const pos = polyomino[i]
        if (pos.x % 2 !== 0 || pos.y % 2 !== 0) continue
        const rect = createElement('rect')
        rect.style.pointerEvents = 'none'
        let transform = 'translate(' + (centerX + pos.x * offset) + ', ' + (centerY + pos.y * offset) + ')'
        if (isRotated(params.polyshape)) {
            // -30 degree rotation around the midpoint of the square
            transform = 'rotate(-30, ' + (params.width / 2 + params.x) + ', ' + (params.height / 2 + params.y) + ') ' + transform
        }
        rect.setAttribute('transform', transform)
        rect.setAttribute('height', String(size))
        rect.setAttribute('width', String(size))
        rect.setAttribute('fill', params.color)
        rect.setAttribute('class', params.class)
        svg.appendChild(rect)
    }
}

function ylop(svg: HTMLElement | SVGElement, params: Params) {
    let pos;
    if (params.polyshape === 0) return
    const size = 12 // Side length of individual squares in the polyomino
    const space = 2 // Gap between squares in the polyomino
    const polyomino = polyominoFromPolyshape(params.polyshape)

    const bounds = {'xmin': 0, 'xmax': 0, 'ymin': 0, 'ymax': 0}
    for (let i = 0; i < polyomino.length; i++) {
        pos = polyomino[i];
        bounds.xmin = Math.min(bounds.xmin, pos.x)
        bounds.xmax = Math.max(bounds.xmax, pos.x)
        bounds.ymin = Math.min(bounds.ymin, pos.y)
        bounds.ymax = Math.max(bounds.ymax, pos.y)
    }
    const offset = (size + space) / 2 // Offset between elements to create the gap
    const centerX = (params.width - size - offset * (bounds.xmax + bounds.xmin)) / 2 + params.x
    const centerY = (params.height - size - offset * (bounds.ymax + bounds.ymin)) / 2 + params.y

    for (let i = 0; i < polyomino.length; i++) {
        pos = polyomino[i];
        if (pos.x % 2 !== 0 || pos.y % 2 !== 0) continue
        const poly = createElement('polygon');
        poly.style.pointerEvents = 'none'
        const points = [
            '0 0', '12 0', '12 12', '0 12', '0 3',
            '3 3', '3 9', '9 9', '9 3', '0 3',
        ];
        poly.setAttribute('points', points.join(', '))
        let transform = 'translate(' + (centerX + pos.x * offset) + ', ' + (centerY + pos.y * offset) + ')';
        if (isRotated(params.polyshape)) {
            // -30 degree rotation around the midpoint of the square
            transform = 'rotate(-30, ' + (params.width / 2 + params.x) + ', ' + (params.height / 2 + params.y) + ') ' + transform
        }
        poly.setAttribute('transform', transform)
        poly.setAttribute('fill', params.color)
        poly.setAttribute('class', params.class)
        svg.appendChild(poly)
    }
}

function nega(svg: HTMLElement | SVGElement, params: Params) {
    const poly = createElement('polygon');
    svg.appendChild(poly)
    const points = [
        '2.9 -2',
        '2.9 -10.4',
        '-2.9 -10.4',
        '-2.9 -2',
        '-10.2 2.2',
        '-7.3 7.2',
        '0 3',
        '7.3 7.2',
        '10.2 2.2',
    ];
    poly.setAttribute('transform', 'translate(' + (params.width / 2 + params.x) + ', ' + (params.height / 2 + params.y) + ')')
    poly.setAttribute('points', points.join(', '))
    poly.setAttribute('fill', params.color)
    poly.setAttribute('class', params.class)
}

const triangleDistributions = [
    [],         // 0 个三角形
    [1],        // 1层 1个三角形
    [2],        // 1层 2个三角形
    [3],        // 1层 3个三角形
    [2, 2],     // 2层 每层2个三角形
    [2, 3],     // 2层 第1层2个，第2层3个
    [3, 3],     // 2层 每层3个三角形
    [2, 3, 2],
    [3, 2, 3],
    [3, 3, 3]
];

function triangle(svg: HTMLElement | SVGElement, params: Params) {
    const distribution = triangleDistributions[params.count];
    const high = distribution.length;
    for (let y = 0; y < high; y++) {
        const wide = distribution[y];
        for (let x = 0; x < wide; x++) {
            const poly = createElement('polygon')
            svg.appendChild(poly)
            const Xcoord = params.x + params.width / 2 + 11 * (2 * x - wide + 1)
            const Ycoord = params.y + params.height / 2 + 10 * (2 * y - high + 1)
            poly.setAttribute('transform', 'translate(' + Xcoord + ', ' + Ycoord + ')')
            poly.setAttribute('points', '0 -8, -8 6, 8 6')
            poly.setAttribute('fill', params.color)
            poly.setAttribute('class', params.class)
        }
    }
}

function crayon(svg: HTMLElement | SVGElement, params: Params) {
    const height = params.height;

    const poly = createElement('polygon');
    svg.appendChild(poly)
    const points = [
        '0 ' + (height / 2),
        (height / 2) + ' 0',
        (height / 2) + ' ' + height,
    ];
    poly.setAttribute('points', points.join(', '))
    poly.setAttribute('fill', params.color)
    const txt = createElement('text');
    svg.appendChild(txt)
    txt.setAttribute('fill', 'var(--text-color)')
    txt.setAttribute('transform', 'translate(' + (height / 2 + 10) + ', ' + (height / 2 + 6) + ')')
    txt.textContent = params.text
}

function start(svg: HTMLElement | SVGElement, params: Params) {
    const circ = createElement('circle');
    svg.appendChild(circ)
    circ.setAttribute('r', String(24))
    circ.setAttribute('fill', 'var(--foreground)')
    circ.setAttribute('cx', String(params.height / 2 + params.x))
    circ.setAttribute('cy', String(params.width / 2 + params.y))
}

function end(svg: HTMLElement | SVGElement, params: Params) {
    const rect = createElement('rect');
    svg.appendChild(rect)
    rect.setAttribute('width', String(24))
    rect.setAttribute('height', String(24))
    rect.setAttribute('fill', 'var(--foreground)')
    rect.setAttribute('x', String(params.height / 2 - 12 + params.x))
    rect.setAttribute('y', String(params.width / 2 - 12 + params.y))

    const circ = createElement('circle');
    svg.appendChild(circ)
    circ.setAttribute('r', String(12))
    circ.setAttribute('fill', 'var(--foreground)')
    circ.setAttribute('cx', String(params.height / 2 + params.x))
    circ.setAttribute('cy', String(params.width / 2 + params.y))

    if (params.dir === 'left') {
        rect.setAttribute('x', String(parseInt(rect.getAttribute('x')!, 10) - 12))
        circ.setAttribute('cx', String(parseInt(circ.getAttribute('cx')!, 10) - 24))
    } else if (params.dir === 'right') {
        rect.setAttribute('x', String(parseInt(rect.getAttribute('x')!, 10) + 12))
        circ.setAttribute('cx', String(parseInt(circ.getAttribute('cx')!, 10) + 24))
    } else if (params.dir === 'top') {
        rect.setAttribute('y', String(parseInt(rect.getAttribute('y')!, 10) - 12))
        circ.setAttribute('cy', String(parseInt(circ.getAttribute('cy')!, 10) - 24))
    } else if (params.dir === 'bottom') {
        rect.setAttribute('y', String(parseInt(rect.getAttribute('y')!, 10) + 12))
        circ.setAttribute('cy', String(parseInt(circ.getAttribute('cy')!, 10) + 24))
    } else {
        console.error('Endpoint direction not defined!', JSON.stringify(params))
    }
}

function dot(svg: HTMLElement | SVGElement, params: Params) {
    const hex = createElement('polygon');
    svg.appendChild(hex)
    hex.setAttribute('points', '5.2 9, 10.4 0, 5.2 -9, -5.2 -9, -10.4 0, -5.2 9')
    hex.setAttribute('transform', 'translate(' + (params.width / 2 + params.x) + ', ' + (params.height / 2 + params.y) + ')')
    hex.setAttribute('fill', params.color)
    hex.setAttribute('class', params.class)
    hex.setAttribute('stroke', params.stroke)
    hex.setAttribute('stroke-width', String(params.strokeWidth))
    hex.setAttribute('style', 'pointer-events:none;')
}

function gap(svg: HTMLElement | SVGElement, params: Params) {
    if (!params.rot) params.rot = 0
    const centerX = params.height / 2 + params.x;
    const centerY = params.width / 2 + params.y;
    const rotate = function (degrees: number) {
        return 'rotate(' + degrees + ', ' + centerX + ', ' + centerY + ')'
    };

    let rect = createElement('rect');
    svg.appendChild(rect)
    rect.setAttribute('width', String(32))
    rect.setAttribute('height', String(24))
    rect.setAttribute('fill', 'var(--foreground)')
    rect.setAttribute('transform', rotate(90 * params.rot))
    rect.setAttribute('x', String(centerX - 40))
    rect.setAttribute('y', String(centerY - 12))
    rect.setAttribute('shape-rendering', 'crispedges')

    rect = createElement('rect');
    svg.appendChild(rect)
    rect.setAttribute('width', String(32))
    rect.setAttribute('height', String(24))
    rect.setAttribute('fill', 'var(--foreground)')
    rect.setAttribute('transform', rotate(90 * params.rot))
    rect.setAttribute('x', String(centerX + 9))
    rect.setAttribute('y', String(centerY - 12))
    rect.setAttribute('shape-rendering', 'crispedges')
}

function drag(svg: HTMLElement | SVGElement, params: Params) {
    if (!params.rot) params.rot = 0

    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 2; j++) {
            const rect = createElement('rect');
            svg.appendChild(rect)
            rect.setAttribute('width', String(2))
            rect.setAttribute('height', String(2))
            if (params.rot === 0) {
                rect.setAttribute('x', String(i * 4))
                rect.setAttribute('y', String(j * 4))
            } else {
                rect.setAttribute('y', String(i * 4))
                rect.setAttribute('x', String(j * 4))
            }
            rect.setAttribute('fill', 'var(--page-background)')
        }
    }
}

function plus(svg: HTMLElement | SVGElement, params: Params) {
    const verti = createElement('rect');
    svg.appendChild(verti)
    verti.setAttribute('x', String(params.width / 2 - 1))
    verti.setAttribute('y', String(3))
    verti.setAttribute('width', String(2))
    verti.setAttribute('height', String(params.height - 6))
    verti.setAttribute('fill', 'var(--text-color)')
    minus(svg, params)
}

function minus(svg: HTMLElement | SVGElement, params: Params) {
    const horiz = createElement('rect');
    svg.appendChild(horiz)
    horiz.setAttribute('x', String(3))
    horiz.setAttribute('y', String(params.height / 2 - 1))
    horiz.setAttribute('width', String(params.width - 6))
    horiz.setAttribute('height', String(2))
    horiz.setAttribute('fill', 'var(--text-color)')
}

function bridge(svg: HTMLElement | SVGElement, params: Params) {
    const poly = createElement('polygon');
    svg.appendChild(poly)
    const points = [
        '-10.58 14.56',
        '-17.12 -5.56',
        '0 -18',
        '17.12 -5.56',
        '10.58 14.56',
        '5.29 7.28',
        '8.56 -2.78',
        '0 -9',
        '-8.56 -2.78',
        '-5.29 7.28',
    ];
    poly.setAttribute('transform', 'translate(' + (params.width / 2 + params.x) + ', ' + (params.height / 2 + params.y) + ')')
    poly.setAttribute('points', points.join(', '))
    poly.setAttribute('fill', params.color)
    poly.setAttribute('class', params.class)
}

function arrow(svg: HTMLElement | SVGElement, params: Params) {
    if (!params.rot) params.rot = 0

    const centerX = params.height / 2 + params.x;
    const centerY = params.width / 2 + params.y
    const rotate = function (degrees: number) {
        return 'rotate(' + degrees + ', ' + centerX + ', ' + centerY + ')'
    }

    const rect = createElement('rect')
    svg.appendChild(rect)
    rect.setAttribute('width', String(8))
    rect.setAttribute('height', String(46))
    rect.setAttribute('fill', params.color)
    rect.setAttribute('class', params.class)
    rect.setAttribute('transform', rotate(45 * params.rot))
    rect.setAttribute('x', String(centerX - 4))
    rect.setAttribute('y', String(centerY - 22))

    for (let i = 0; i < params.count; i++) {
        const arrowhead = createElement('polygon');
        svg.appendChild(arrowhead)
        const points = [
            '-24 -15',
            '-21.4 -8.6',
            '0 -19',
            '21.4 -8.6',
            '24 -15',
            '0 -27',
        ];
        let transform = rotate(45 * params.rot);
        transform += ' translate(' + (params.width / 2 + params.x) + ', ' + (params.height / 2 + params.y + i * 12) + ')'
        arrowhead.setAttribute('transform', transform)
        arrowhead.setAttribute('points', points.join(', '))
        arrowhead.setAttribute('fill', params.color)
        arrowhead.setAttribute('class', params.class)
    }
}

function sizer(svg: HTMLElement | SVGElement, params: Params) {
    const path = createElement('path');
    svg.appendChild(path)
    path.setAttribute('d',
        'M -24 0 ' +
        'a 24 24 0 0 0  24 -24 ' +
        'a 24 24 0 0 0  24  24 ' +
        'a 24 24 0 0 0 -24  24 ' +
        'a 24 24 0 0 0 -24 -24 ' +
        'z'
    )
    path.setAttribute('fill', params.color)
    path.setAttribute('class', params.class)
    path.setAttribute('transform', 'translate(' + (params.width / 2 + params.x) + ', ' + (params.height / 2 + params.y) + ')')
}