export type TheVersionHistory = {
    '1.6': PackChangesNullable
    '1.7': PackChangesNullable
    '1.8': PackChangesNullable
    '1.9': PackChangesNullable
    '1.10': PackChangesNullable
    '1.11': PackChangesNullable
    '1.12': PackChangesNullable
    '1.13': PackChangesNullable
    '1.14': PackChangesNullable
    '1.15': PackChangesNullable
    '1.16': PackChangesNullable
    '1.17': PackChangesNullable
    '1.18': PackChangesNullable
    '1.19': PackChangesNullable
    '1.20': PackChangesNullable
}

export type HexColor = `#${string}`

export type TexturesStructureNullable<T> = {
    item?: T
    block?: T
    entity?: T
    gui?: T
}

export type TexturesStructure<T> = {
    item: T
    block: T
    entity: T
    gui: T
}

export type PackStructureNullable<T> = {
    models?: {
        item?: T
        block?: T
        entity?: undefined
    }
    textures?: TexturesStructureNullable<T>
}

export type PackStructure<T> = {
    models: {
        item: T
        block: T
        entity: undefined
    }
    textures: TexturesStructure<T>
}

export type SimpleChanges<T = string[]> = {
    Added: T
    Deleted: T
}

export type SimpleChangesNullable<T = string[]> = {
    Added?: T
    Deleted?: T
}

export type StringChanges = {
    Added: string[]
    Renamed: Map<string, string>
    Deleted: string[]
}

export type StringChangesNullable = {
    Added?: string[]
    Renamed?: Map<string, string>
    Deleted?: string[]
}

export type Changes<T = string[]> = StringChanges | (SimpleChanges<T> & { Renamed: undefined })

export type ChangesNullable<T = string[]> = StringChangesNullable | (SimpleChangesNullable<T> & { Renamed: undefined })

export type PackChanges = PackStructure<StringChanges> & {
    uv: TexturesStructure<Map<string, string>>
    tints: TexturesStructure<SimpleChanges<Map<string, HexColor>>>
}
export type PackChangesNullable = PackStructureNullable<StringChangesNullable> & {
    uv?: TexturesStructureNullable<Map<string, string>>
    tints?: TexturesStructureNullable<SimpleChangesNullable<Map<string, HexColor>>>
}

export type Version =
    '1.6' |
    '1.7' |
    '1.8' |
    '1.9' |
    '1.10' |
    '1.11' |
    '1.12' |
    '1.13' |
    '1.14' |
    '1.15' |
    '1.16' |
    '1.17' |
    '1.18' |
    '1.19' |
    '1.20'

export type Map<TKey, TValue> = {
    [key: TKey]: TValue
}

export type Pair<TKey, TValue> = {
    key: TKey
    value: TValue
}

function GetPair<TKey, TValue>(id: TKey | TValue, obj: Map<TKey, TValue>): Pair<TKey, TValue> |null

function GetKey<TKey, TValue>(value: TValue, obj: Map<TKey, TValue>) : TKey | null

function Base(): PackStructure<string[]>

function CollectPackChanges(from: Version, to: Version): PackChanges

/**
 * Return values:
 * - `string`: Added or renamed
 * - `null`: Deleted
 * - `undefined`: Unknown or not registered item
 */
function Evaluate(changes: Changes, value: string): string | null | undefined

const VersionHistory: TheVersionHistory

function NoChanges(): PackChanges

export {
    VersionHistory,
    NoChanges,
    GetKey,
    GetPair,
    Base,
    CollectPackChanges,
    Evaluate,
}