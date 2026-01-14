
export class KeyValuePair<TKey, TValue> {
    constructor(public Key: TKey, public Value: TValue) {}

    public toString(): string {
        return `[${this.Key}: ${this.Value}]`;
    }

    public equals(other: KeyValuePair<TKey, TValue>): boolean {
        return this.Key === other.Key && this.Value === other.Value;
    }

    public toObject(): { Key: TKey; Value: TValue } {
        return { Key: this.Key, Value: this.Value };
    }
}