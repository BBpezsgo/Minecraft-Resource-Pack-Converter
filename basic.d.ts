
export type Map<TKey, TValue> = {
    [key: TKey]: TValue
}

export type Pair<TKey, TValue> = {
    key: TKey
    value: TValue
}

declare function GetKey<TKey, TValue>(value: TValue, obj: Map<TKey, TValue>) : TKey | null

export {
    GetKey,
}