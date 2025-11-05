import {OrderedSet} from "js-sdsl";

export class SortedSet<T> extends OrderedSet<T> {
    constructor(container?:SortedSet<T>) {
        super(container);
    }

    public UnionWith(other: Array<T>): void {
        for (const item of other) {
            this.insert(item);
        }
    }

    public Add(item: T): boolean {
        const l1 = this.length;
        const l2 = this.insert(item);
        return l1 !== l2;
    }

    public Clear():void {
        this.clear();
    }

    public Remove(key:T):boolean {
        return this.eraseElementByKey(key)
    }

    public Contains(key:T):boolean {
        return !this.find(key).equals(this.end())
    }

    public get Count(): number {
        return this.length
    }
}

