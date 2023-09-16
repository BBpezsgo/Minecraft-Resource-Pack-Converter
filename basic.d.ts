
export type Map<TKey, TValue> = {
    /** @ts-ignore */
    [key: TKey]: TValue
}

export type Pair<TKey, TValue> = {
    key: TKey
    value: TValue
}

declare function GetPair<TKey, TValue>(id: TKey | TValue, obj: Map<TKey, TValue>): Pair<TKey, TValue> |null

declare function GetKey<TKey, TValue>(value: TValue, obj: Map<TKey, TValue>) : TKey | null

export {
    GetKey,
    GetPair,
}