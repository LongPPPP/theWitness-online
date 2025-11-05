import {Random as random} from "random";
import seedrandom from 'seedrandom'

export class Random {
    private readonly _random: random;

    constructor(seed?: string) {
        this._random = seed === undefined ? new random() : new random(seedrandom(seed));
    }

    public Next(): number;
    public Next(maxValue: number): number;
    public Next(minValue: number, maxValue: number): number;
    public Next(arg1?: number, arg2?: number): number {
        let min: number;
        let max: number;

        if (arg1 === undefined && arg2 === undefined) {
            // Next()
            min = 0;
            max = 2147483647; // int.MaxValue
        } else if (arg2 === undefined) {
            // Next(maxValue)
            min = 0;
            max = arg1!;
        } else {
            // Next(minValue, maxValue)
            min = arg1!;
            max = arg2;
        }

        if (min >= max) {
            throw new Error('minValue must be less than maxValue');
        }

        return this._random.int(min, max - 1);
    }
}




