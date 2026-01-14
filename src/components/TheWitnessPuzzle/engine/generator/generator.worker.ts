import {Generator} from "./Generator.ts";
import {Decoration, IntersectionFlags, Panel, Point} from "./Panel.ts";

type messageType = 'generate' | 'setGridSize' | 'new Generator';
type argsType = number[] | string;

let generator: Generator;
const panel = new Panel(0x018AF, 7, 7, 0, 6, 6, 0)

function handleGenerate(args: number[]) {
    if (!generator) {
        throw new Error("Generator not initialized yet");
    }
    // generator.setGridSize(4, 4);
    generator.generate(panel, args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[9], args[10], args[11], args[12], args[13], args[14], args[15], args[16], args[17]);

    self.postMessage({type: 'success', panel});
}

function handleSetGridSize(args: number[]) {
    if (!generator) {
        throw new Error("Generator not initialized yet");
    }

    if (args.length != 2) {
        throw new Error(`Can't set grid: ${args}`);
    }

    generator.setGridSize(args[0], args[1]);
}

// TODO: debug
function handleGetPath() {
    const solution = Array<string>(); //For debugging only
    for (let y = 0; y < panel.Height; y++) {
        const row = new Array<string>();
        for (let x = 0; x < panel.Width; x++) {
            if (generator['_path'].Contains(new Point(x, y))) {
                row.push("xx");
            } else if((panel.Grid[x][y] & 0x0400) === Decoration.Shape.Poly) {
                row.push("T ");
            }
            else row.push("  ");
        }
        solution.push(row.toString());
    }
    console.info(solution)
    for (let y = 0; y < panel.Height; y++) {
        for (let x = 0; x < panel.Width; x++) {
            if((panel.Grid[x][y] & 0x0400) === Decoration.Shape.Poly) {
                let poly = panel.Grid[x][y] >> 16;
                const array: number[][] = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];

                // 遍历4x4网格的所有16个bit（位置0~15）
                for (let pos = 0; pos < 16; pos++) {
                    array[pos % 4][3 - Math.trunc(pos / 4)] = (poly & 1);
                    poly >>= 1;
                }
                console.info(array,(panel.Grid[x][y] >> 16).toString(16))
            }
        }
    }
}

self.onmessage = function (event: { data: { type: messageType; args: argsType; }; }) {
    try {
        if (event.data.type == 'generate') {
            const args = event.data.args as number[];
            handleGenerate(args)
        } else if (event.data.type == 'setGridSize') {
            console.info(`Setting grid size: ${event.data.args}`);
            const args = event.data.args as number[];
            handleSetGridSize(args)
        } else if (event.data.type == 'new Generator') {
            console.info("New Generator...");
            if (event.data.args === undefined) {
                generator = new Generator()
                console.log('success')
            } else {
                const arg = event.data.args as string;
                generator = new Generator(arg);
                console.log('success')
            }
        } else if (event.data.type == 'getPath') {
            handleGetPath()
        }
    } catch (e) {
        self.postMessage({type: 'error', message: e.message})
    }

}