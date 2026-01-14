import {SortedDictionary} from "./utils/SortedDictionary.ts";
import {Decoration, Panel} from "./Panel.ts";
import {KeyValuePair} from "./utils/KeyValuePair.ts";
import {Random} from "./utils/Random";

export class PuzzleSymbols {
    style: number;
    private symbols: SortedDictionary<number, Array<KeyValuePair<number, number>>> = new SortedDictionary<number, Array<KeyValuePair<number, number>>>();

    constructor(symbolVec: Array<KeyValuePair<number, number>>) {
        for (const s of symbolVec) {
            if (s.Key === Decoration.Shape.Gap || s.Key === Decoration.Shape.Start || s.Key === Decoration.Shape.Exit) {
                if (!this.symbols.ContainsKey(s.Key)) this.symbols.setElement(s.Key, []);
                this.symbols.getElementByKey(s.Key).push(s);
            } else if ((s.Key & Decoration.Shape.Dot) != 0) {
                if (!this.symbols.ContainsKey(Decoration.Shape.Dot)) this.symbols.setElement(Decoration.Shape.Dot, []);
                this.symbols.getElementByKey(Decoration.Shape.Dot).push(s);
            } else {
                if (!this.symbols.ContainsKey(s.Key & 0x700)) this.symbols.setElement(s.Key & 0x700, []);
                this.symbols.getElementByKey(s.Key & 0x700).push(s);
            }
        }

        this.style = 0;
        if (this.Any(Decoration.Shape.Dot)) this.style |= Panel.Styles.HAS_DOTS;
        if (this.Any(Decoration.Shape.Stone)) this.style |= Panel.Styles.HAS_STONES;
        if (this.Any(Decoration.Shape.Star)) this.style |= Panel.Styles.HAS_STARS;
        if (this.Any(Decoration.Shape.Poly)) this.style |= Panel.Styles.HAS_SHAPERS;
        if (this.Any(Decoration.Shape.Triangle)) this.style |= Panel.Styles.HAS_TRIANGLES;
        if (this.Any(Decoration.Shape.Arrow)) this.style |= Panel.Styles.HAS_TRIANGLES;
    }

    public getSymbols(symbolType: number | Decoration.Shape): Array<KeyValuePair<number, number>> {
        if (!this.symbols.ContainsKey(symbolType)) {
            this.symbols.setElement(symbolType, []);
        }
        return this.symbols.getElementByKey(symbolType);
    }

    public getNum(symbolType: number | Decoration.Shape) {
        if (!this.symbols.ContainsKey(symbolType)) return 0;
        let total = 0;
        for (const pair of this.symbols.getElementByKey(symbolType)) {
            total += pair.Value;
        }
        return total;
    }

    public Any(symbolType: number | Decoration.Shape) {
        if (!this.symbols.ContainsKey(symbolType)) return false;
        return this.symbols.getElementByKey(symbolType).length > 0;
    }

    public popRandomSymbol() {
        const types: Array<number> = [];
        for (const pair of this.symbols) {
            if (pair[1].length > 0 && pair[0] !== Decoration.Shape.Start && pair[0] !== Decoration.Shape.Exit && pair[0] !== Decoration.Shape.Gap && pair[0] !== Decoration.Shape.Eraser) {
                types.push(pair[0]);
            }
        }
        const random = new Random();
        let randType = types[random.Next(types.length)];
        let randIndex = random.Next(this.symbols.getElementByKey(randType).length);
        while (this.symbols.getElementByKey(randType)[randIndex].Value === 0 || this.symbols.getElementByKey(randType)[randIndex].Value >= 25) {
            randType = types[random.Next(types.length)];
            randIndex = random.Next(this.symbols.getElementByKey(randType).length);
        }
        this.symbols.getElementByKey(randType)[randIndex] = new KeyValuePair<number, number>(this.symbols.getElementByKey(randType)[randIndex].Key, this.symbols.getElementByKey(randType)[randIndex].Value - 1);
        return this.symbols.getElementByKey(randType)[randIndex].Key;
    }
}
