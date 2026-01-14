import {OrderedMap} from "js-sdsl";

export class SortedDictionary<TKey, TValue> extends OrderedMap<TKey, TValue> {
    constructor() {
        super()
    }

    public ContainsKey(k:TKey):boolean {
        return this.getElementByKey(k) !== undefined;
    }

}

