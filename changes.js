const Pack = require('./pack')

/** @returns {import('./changes').PackChanges} */
function NoChanges() {
    return {
        models: {
            item: {
                Added: [],
                Renamed: {},
                Deleted: [],
            },
            block: {
                Added: [],
                Renamed: {},
                Deleted: [],
            },
            entity: undefined,
        },
        textures: {
            item: {
                Added: [],
                Renamed: {},
                Deleted: [],
            },
            block: {
                Added: [],
                Renamed: {},
                Deleted: [],
            },
            entity: {
                Added: [],
                Renamed: {},
                Deleted: [],
            },
        },
        uv: {
            block: { },
            item: { },
            entity: { },
        },
    }
}

const fs = require('fs')
const Path = require('path')

let  v1_6 = {
    ...NoChanges(),
}
let  v1_7 = {
    ...NoChanges(),
}
let  v1_8 = {
    ...NoChanges(),
}
let  v1_9 = {
    ...NoChanges(),
}
let  v1_10 = {
    ...NoChanges(),
}
let  v1_11 = {
    ...NoChanges(),
}
let  v1_12 = {
    ...NoChanges(),
}
let  v1_13 = {
    ...NoChanges(),
}
let  v1_14 = {
    ...NoChanges(),
}
let  v1_15 = {
    ...NoChanges(),
}
let  v1_16 = {
    ...NoChanges(),
}
let  v1_17 = {
    ...NoChanges(),
}
let  v1_18 = {
    ...NoChanges(),
}
let  v1_19 = {
    ...NoChanges(),
}
let  v1_20 = {
    ...NoChanges(),
}

/** @type {import('./changes').TheVersionHistory} */
const versionHistory = {
    '1.6': v1_6,
    '1.7': v1_7,
    '1.8': v1_8,
    '1.9': v1_9,
    '1.10': v1_10,
    '1.11': v1_11,
    '1.12': v1_12,
    '1.13': v1_13,
    '1.14': v1_14,
    '1.15': v1_15,
    '1.16': v1_16,
    '1.17': v1_17,
    '1.18': v1_18,
    '1.19': v1_19,
    '1.20': v1_20,
}

for (const version in versionHistory) {
    const path = Path.join(__dirname, 'changes', version + '.js')
    if (!fs.existsSync(path)) {
        // console.error(`Changes for version ${version} not found`)
        continue
    }
    const js = fs.readFileSync(path, 'utf8')
    const res = eval(js)
    if (res) {
        versionHistory[version] = {
            ...NoChanges(),
            ...res,
        }
    }
}

/** @returns {import('./changes').PackStructure<string[]>} */
function Base() {
    const path = Path.join(__dirname, 'changes', 'base' + '.js')
    if (!fs.existsSync(path)) {
        throw new Error('base.js not found')
    }
    const js = fs.readFileSync(path, 'utf8')
    const res = eval(js)
    if (res) {
        return res
    }
    throw new Error('Invalid base.js file')
}

/**
 * @param {string} id
 * @param {{ [id: string]: string }} obj
 */
function GetPair(id, obj) {
    if (obj[id]) {
        return {
            key: id,
            value: obj[id],
        }
    }

    const keys = Object.keys(obj)
    for (const key of keys) {
        if (obj[key] === id) {
            return {
                key: key,
                value: obj[key],
            }
        }
    }

    return null
}

/**
 * @param {string} value
 * @param {{ [id: string]: string }} obj
 */
function GetKey(value, obj) {
    const keys = Object.keys(obj)
    for (const key of keys) {
        if (obj[key] === value) {
            return key
        }
    }

    return null
}

/**
 * @param {import('./changes').Changes} changes
 */
function Inverse(changes) {
    /** @type {import('./changes').Changes} */
    let inversed = {
        Added: [],
        Renamed: {},
        Deleted: [],
    }

    for (const added of changes.Added) {
        inversed.Deleted.push(added)
    }

    for (const renamedFrom in changes.Renamed) {
        const renamedTo = changes.Renamed[renamedFrom]
        inversed.Renamed[renamedTo] = renamedFrom
    }

    for (const deleted of changes.Deleted) {
        inversed.Added.push(deleted)
    }

    return inversed
}

/**
 * @param {import('./changes').Map<string, string>} uvs
 * @returns {import('./changes').Map<string, string>}
 */
function InverseUVs(uvs) {
    const result = { }

    for (const key in uvs) {
        /** @type {string} */
        let value = uvs[key]
        if (value.endsWith('-inverted')) {
            value = value.substring(0, value.length - '-inverted'.length)
        } else {
            value = value + '-inverted'
        }
        result[key] = value
    }

    return result
}

/**
 * @param {import('./changes').PackChanges} changes
 * @returns {import('./changes').PackChanges}
 */
function InversePack(changes) {
    return {
        models: {
            block: Inverse(changes.models.block),
            item: Inverse(changes.models.item),
            entity: undefined,
        },
        textures: {
            block: Inverse(changes.textures.block),
            item: Inverse(changes.textures.item),
            entity: Inverse(changes.textures.entity),
        },
        uv: {
            block: InverseUVs(changes.uv.block),
            item: InverseUVs(changes.uv.item),
            entity: InverseUVs(changes.uv.entity),
        },
    }
}

/**
 * @param {import('./changes').ChangesNullable | null | undefined} changes
 * @returns {import('./changes').Changes}
 */
function ToNonull(changes) {
    return {
        Added: changes?.Added ?? [],
        Renamed: changes?.Renamed ?? {},
        Deleted: changes?.Deleted ?? [],
    }
}

/**
 * @param {import('./changes').PackChangesNullable | null | undefined} changes
 * @returns {import('./changes').PackChanges}
 */
function ToNonullPack(changes) {
    return {
        models: {
            block: ToNonull(changes?.models?.block),
            item: ToNonull(changes?.models?.item),
            entity: undefined,
        },
        textures: {
            block: ToNonull(changes?.textures?.block),
            item: ToNonull(changes?.textures?.item),
            entity: ToNonull(changes?.textures?.entity),
        },
        uv: {
            block: ToNonull(changes?.uv?.block),
            item: ToNonull(changes?.uv?.item),
            entity: ToNonull(changes?.uv?.entity),
        },
    }
}

/**
 * @param {import('./changes').Changes} changesA
 * @param {import('./changes').ChangesNullable | undefined} changesB
 */
function ChainChanges(changesA, changesB) {
    if (!changesB) return changesA

    let result = {
        ...changesA,
    }

    if (changesB.Added) for (const added of changesB.Added) {
        if (!result.Added.includes(added)) {
            result.Added.push(added)
        }
    }

    if (changesB.Renamed) for (const renamedFrom in changesB.Renamed) {
        const renamedTo = changesB.Renamed[renamedFrom]
        result.Renamed[renamedFrom] = renamedTo
    }

    if (changesB.Deleted) for (const deleted of changesB.Deleted) {
        for (let i = result.Added.length - 1; i >= 0; i--) {
            if (result.Added[i] === deleted) {
                result.Added.splice(i, 1)
            }
        }
        if (!result.Deleted.includes(deleted)) {
            result.Deleted.push(deleted)
        }
    }

    return result
}

/**
 * @param {import('./changes').Map<string, string>} uvsA
 * @param {import('./changes').Map<string, string> | undefined} uvsB
 * @returns {import('./changes').Map<string, string>}
 */
function ChainUVs(uvsA, uvsB) {
    if (!uvsB) return uvsA

    let result = {
        ...uvsA,
    }

    for (const key in uvsB) {
        if (result[key]) {
            console.error(`[Changes]: Can not chain multiple uv-s`)
        } else {
            result[key] = uvsB[key]
        }
    }

    return result
}

/**
 * @param {import('./changes').Version} from
 * @param {import('./changes').Version} to
 */
function ChainPackChanges(from, to) {
    const fromIndex = Pack.Versions.indexOf(from)
    const toIndex = Pack.Versions.indexOf(to)

    if (fromIndex === -1 || toIndex === -1) {
        throw new Error('Failed to get version index')
    }

    if (fromIndex == toIndex) {
        throw new Error('Current version is same as target version')
    }

    /** @type {import('./changes').PackChanges} */
    const changes = NoChanges()

    for (let i = fromIndex; i < toIndex; i++) {
        const version = Pack.Versions[i]
        if (!version) { continue }
        const currentChanges = versionHistory[version]

        changes.models.block = ChainChanges(changes.models.block, currentChanges.models?.block)
        changes.models.item = ChainChanges(changes.models.item, currentChanges.models?.item)
        changes.textures.block = ChainChanges(changes.textures.block, currentChanges.textures?.block)
        changes.textures.item = ChainChanges(changes.textures.item, currentChanges.textures?.item)
        changes.textures.entity = ChainChanges(changes.textures.entity, currentChanges.textures?.entity)
        changes.uv.block = ChainUVs(changes.uv.block, currentChanges.uv?.block)
        changes.uv.item = ChainUVs(changes.uv.item, currentChanges.uv?.item )
        changes.uv.entity = ChainUVs(changes.uv.entity, currentChanges.uv?.entity)
    }

    return changes
}

/**
 * @param {import('./changes').Version} from
 * @param {import('./changes').Version} to
 */
function CollectPackChanges(from, to) {
    const fromFormat = Pack.VersionToPackFormat[from]
    const toFormat = Pack.VersionToPackFormat[to]
    if (!fromFormat) throw new Error(`Failed to get pack format from version ${from}`)
    if (!toFormat) throw new Error(`Failed to get pack format from version ${to}`)
    if (fromFormat == toFormat) throw new Error(`Pack formats are the same`)

    let changes
    if (fromFormat < toFormat) {
        changes = ChainPackChanges(from, to)
    } else {
        changes = ChainPackChanges(to, from)
        changes = InversePack(changes)
    }
    return changes
}

/**
 * @param {import('./changes').Changes} changes
 * @param {string} value
 * @returns {string | null | undefined}
 * Return values:
 * - `string`: Added or renamed
 * - `null`: Deleted
 * - `undefined`: Unknown or not registered item
 */
function Evaluate(changes, value) {
    if (changes.Added[value]) {
        return value
    }
    if (changes.Renamed[value]) {
        return changes.Renamed[value]
    }
    if (changes.Deleted.includes(value)) {
        return null
    }
    return undefined
}

module.exports = {
    VersionHistory: versionHistory,
    NoChanges: NoChanges,
    GetKey,
    GetPair,
    Inverse,
    InversePack,
    ToNonull,
    ToNonullPack,
    ChainChanges,
    ChainPackChanges,
    Base,
    CollectPackChanges,
    Evaluate,
}
