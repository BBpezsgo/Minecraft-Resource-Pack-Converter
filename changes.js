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
            gui: {
                Added: [],
                Renamed: {},
                Deleted: [],
            },
        },
        uv: {
            block: { },
            item: { },
            entity: { },
            gui: { },
        },
        tints: {
            item: {
                Added: { },
                Deleted: { },
            },
            block: {
                Added: { },
                Deleted: { },
            },
            entity: {
                Added: { },
                Deleted: { },
            },
            gui: {
                Added: { },
                Deleted: { },
            },
        },
        blockstates: {
            Added: [],
            Renamed: {},
            Deleted: [],
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
const VersionHistory = {
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

for (const version in VersionHistory) {
    const path = Path.join(__dirname, 'changes', version + '.js')
    if (!fs.existsSync(path)) {
        // console.error(`Changes for version ${version} not found`)
        continue
    }
    const js = fs.readFileSync(path, 'utf8')
    const res = eval(js)
    if (res) {
        VersionHistory[version] = {
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
 * @param {import('./changes').SimpleChanges<any>} changes
 */
function InverseSimpleChanges(changes) {
    /** @type {import('./changes').SimpleChanges<any>} */
    let inversed = {
        Added: Array.isArray(changes.Added) ? [] : {},
        Deleted: Array.isArray(changes.Deleted) ? [] : {},
    }

    if (Array.isArray(changes.Added)) {
        for (const added of changes.Added) {
            inversed.Deleted.push(added)
        }
    } else {
        for (const added in changes.Added) {
            inversed.Deleted[added] = changes.Added[added]
        }
    }
    
    if (Array.isArray(changes.Deleted)) {
        for (const deleted of changes.Deleted) {
            inversed.Added.push(deleted)
        }
    } else {
        for (const deleted in changes.Deleted) {
            inversed.Added[deleted] = changes.Deleted[deleted]
        }
    }

    return inversed
}

/**
 * @param {import('./changes').StringChanges} changes
 */
function InverseStringChanges(changes) {
    /** @type {import('./changes').StringChanges} */
    let inversed = {
        Added: [],
        Renamed: { },
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
 * @param {import('./basic').Map<string, string>} uvs
 * @returns {import('./basic').Map<string, string>}
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
            block: InverseStringChanges(changes.models.block),
            item: InverseStringChanges(changes.models.item),
            entity: undefined,
        },
        textures: {
            block: InverseStringChanges(changes.textures.block),
            item: InverseStringChanges(changes.textures.item),
            entity: InverseStringChanges(changes.textures.entity),
            gui: InverseStringChanges(changes.textures.gui),
        },
        uv: {
            block: InverseUVs(changes.uv.block),
            item: InverseUVs(changes.uv.item),
            entity: InverseUVs(changes.uv.entity),
            gui: InverseUVs(changes.uv.gui),
        },
        tints: {
            block: InverseSimpleChanges(changes.tints.block),
            item: InverseSimpleChanges(changes.tints.item),
            entity: InverseSimpleChanges(changes.tints.entity),
            gui: InverseSimpleChanges(changes.tints.gui),
        },
        blockstates: ToNonullStringChanges(changes.blockstates),
    }
}

/**
 * @param {import('./changes').StringChangesNullable | null | undefined} changes
 * @returns {import('./changes').StringChanges}
 */
function ToNonullStringChanges(changes) {
    return {
        Added: changes?.Added ?? [],
        Renamed: changes?.Renamed ?? {},
        Deleted: changes?.Deleted ?? [],
    }
}

/**
 * @template T
 * @param {import('./changes').SimpleChangesNullable<T> | null | undefined} changes
 * @param {T} def
 * @returns {import('./changes').SimpleChanges<T>}
 */
function ToNonullSimpleChanges(changes, def) {
    return {
        Added: changes?.Added ?? def,
        Deleted: changes?.Deleted ?? def,
    }
}

/**
 * @param {import('./changes').PackChangesNullable | null | undefined} changes
 * @returns {import('./changes').PackChanges}
 */
function ToNonullPack(changes) {
    return {
        models: {
            block: ToNonullStringChanges(changes?.models?.block),
            item: ToNonullStringChanges(changes?.models?.item),
            entity: undefined,
        },
        textures: {
            block: ToNonullStringChanges(changes?.textures?.block),
            item: ToNonullStringChanges(changes?.textures?.item),
            entity: ToNonullStringChanges(changes?.textures?.entity),
            gui: ToNonullStringChanges(changes?.textures?.gui),
        },
        uv: {
            block: ToNonullStringChanges(changes?.uv?.block),
            item: ToNonullStringChanges(changes?.uv?.item),
            entity: ToNonullStringChanges(changes?.uv?.entity),
            gui: ToNonullStringChanges(changes?.uv?.gui),
        },
        tints: {
            block: ToNonullSimpleChanges(changes?.tints?.block, { }),
            item: ToNonullSimpleChanges(changes?.tints?.item, { }),
            entity: ToNonullSimpleChanges(changes?.tints?.entity, { }),
            gui: ToNonullSimpleChanges(changes?.tints?.gui, { }),
        },
        blockstates: ToNonullStringChanges(changes?.blockstates),
    }
}

/**
 * @param {import('./changes').StringChanges} changesA
 * @param {import('./changes').StringChangesNullable | undefined} changesB
 */
function ChainStringChanges(changesA, changesB) {
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
 * @template T
 * @param {import('./changes').SimpleChanges<T>} changesA
 * @param {import('./changes').SimpleChangesNullable<T> | undefined} changesB
 */
function ChainSimpleChanges(changesA, changesB) {
    if (!changesB) return changesA

    let result = {
        ...changesA,
    }

    if (changesB.Added) {
        if (Array.isArray(changesB.Added)) {
            if (!Array.isArray(result.Deleted)) throw new Error()
            if (!Array.isArray(result.Added)) throw new Error()

            for (const added of changesB.Added) {
                if (!result.Added.includes(added)) {
                    result.Added.push(added)
                }
            }
        } else {
            if (Array.isArray(result.Deleted)) throw new Error()
            if (Array.isArray(result.Added)) throw new Error()

            for (const added in changesB.Added) {
                const key = added.toString()
                if (!result.Added[key]) {
                    result.Added[key] = changesB.Added[added]
                }
            }
        }
    }

    if (changesB.Deleted) {
        if (Array.isArray(changesB.Deleted)) {
            if (!Array.isArray(result.Deleted)) throw new Error()
            if (!Array.isArray(result.Added)) throw new Error()

            for (const deleted of changesB.Deleted) {
                for (let i = result.Added.length - 1; i >= 0; i--) {
                    if (result.Added[i] === deleted) {
                        result.Added.splice(i, 1)
                    }
                }
                if (!result.Deleted.includes(deleted)) {
                    result.Deleted.push(deleted)
                }
            }
        } else {
            if (Array.isArray(result.Deleted)) throw new Error()
            if (Array.isArray(result.Added)) throw new Error()

            for (const deleted in changesB.Deleted) {
                const key = deleted.toString()
                result.Added[key] = undefined
                if (!result.Deleted[key]) {
                    result.Deleted[key] = changesB.Deleted[key]
                }
            }
        }
    }

    return result
}

/**
 * @param {import('./basic').Map<string, string>} uvsA
 * @param {import('./basic').Map<string, string> | undefined} uvsB
 * @returns {import('./basic').Map<string, string>}
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
 * @param {import('./changes').Version | number} from
 * @param {import('./changes').Version | number} to
 */
function ChainPackChanges(from, to) {
    const fromIndex = (typeof from === 'string') ? Pack.Versions.indexOf(from) : from
    const toIndex = (typeof to === 'string') ? Pack.Versions.indexOf(to) : to

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
        const currentChanges = VersionHistory[version]

        changes.models.block = ChainStringChanges(changes.models.block, currentChanges.models?.block)
        changes.models.item = ChainStringChanges(changes.models.item, currentChanges.models?.item)

        changes.textures.block = ChainStringChanges(changes.textures.block, currentChanges.textures?.block)
        changes.textures.item = ChainStringChanges(changes.textures.item, currentChanges.textures?.item)
        changes.textures.entity = ChainStringChanges(changes.textures.entity, currentChanges.textures?.entity)
        changes.textures.gui = ChainStringChanges(changes.textures.gui, currentChanges.textures?.gui)

        changes.tints.block = ChainSimpleChanges(changes.tints.block, currentChanges.tints?.block)

        changes.uv.block = ChainUVs(changes.uv.block, currentChanges.uv?.block)
        changes.uv.item = ChainUVs(changes.uv.item, currentChanges.uv?.item )
        changes.uv.entity = ChainUVs(changes.uv.entity, currentChanges.uv?.entity)
        changes.uv.gui = ChainUVs(changes.uv.gui, currentChanges.uv?.gui)
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

    const fromIndex = Pack.Versions.indexOf(from)
    const toIndex = Pack.Versions.indexOf(to)
    
    let changes
    if (fromFormat < toFormat) {
        changes = ChainPackChanges(fromIndex, toIndex + 1)
    } else {
        changes = ChainPackChanges(toIndex + 1, fromIndex)
        changes = InversePack(changes)
    }
    return changes
}

/**
 * @param {import('./changes').StringChanges} changes
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
    VersionHistory,
    NoChanges,
    Base,
    CollectPackChanges,
    Evaluate,
}
