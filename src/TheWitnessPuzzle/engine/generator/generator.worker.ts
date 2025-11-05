import {Generator} from "./Generator.ts";
import {Panel} from "./Panel.ts";

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
            console.info("Generating new generator...");
            const arg = event.data.args as string;
            generator = new Generator(arg);
        }
    } catch (e) {
        self.postMessage({type: 'error', message: e.message})
    }

}