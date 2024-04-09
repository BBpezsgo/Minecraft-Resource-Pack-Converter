const Pack = require('./pack')
const fs = require('fs')
const Path = require('path')
const { paths } = require('./utils')

/**
 * @export
 * @typedef {{
 *  '1.6': PackChangesNullable
 *  '1.7': PackChangesNullable
 *  '1.8': PackChangesNullable
 *  '1.9': PackChangesNullable
 *  '1.10': PackChangesNullable
 *  '1.11': PackChangesNullable
 *  '1.12': PackChangesNullable
 *  '1.13': PackChangesNullable
 *  '1.14': PackChangesNullable
 *  '1.15': PackChangesNullable
 *  '1.16': PackChangesNullable
 *  '1.17': PackChangesNullable
 *  '1.18': PackChangesNullable
 *  '1.19': PackChangesNullable
 *  '1.20': PackChangesNullable
 * }} TheVersionHistory
 */

/**
 * @exports
 * @typedef {`#${string}`} HexColor
 */

/**
 * @exports
 * @template T
 * @typedef {{
*  item?: T
*  block?: T
*  entity?: T
*  gui?: T
* }} TexturesStructureNullable
*/

/**
 * @exports
 * @template T
 * @typedef {{
*  item: T
*  block: T
*  entity: T
*  gui: T
* }} TexturesStructure
*/

/**
 * @exports
 * @template T
 * @typedef {{
 *  models?: {
 *    item?: T
 *    block?: T
 *    entity?: undefined
 *  }
 *  textures?: TexturesStructureNullable<T>
 *  blockstates?: T
 * }} PackStructureNullable
 */


/**
 * @exports
 * @template T
 * @typedef {{
 *  models: {
 *    item: T
 *    block: T
 *    entity: undefined
 *  }
 *  textures: TexturesStructure<T>
 *  blockstates: T
 * }} PackStructure
 */

/**
 * @exports
 * @template [T = string[]]
 * @typedef {{
 *  Added?: T
 *  Deleted?: T
 * }} SimpleChangesNullable
 */

/**
 * @exports
 * @template [T = string[]]
 * @typedef {{
 *  Added: T
 *  Deleted: T
 * }} SimpleChanges
 */

/**
 * @exports
 * @typedef {{
 *  Added?: string[]
 *  Renamed?: import('./basic').Map<string, string>
 *  Deleted?: string[]
 * }} StringChangesNullable
 */

/**
 * @exports
 * @typedef {{
 *  Added: string[]
 *  Renamed: import('./basic').Map<string, string>
 *  Deleted: string[]
 * }} StringChanges
 */

/**
 * @exports
 * @template [T = string[]]
 * @typedef {StringChanges | (SimpleChanges<T> & { Renamed: undefined })} Changes
 */

/**
 * @exports
 * @template [T = string[]]
 * @typedef {StringChangesNullable | (SimpleChangesNullable<T> & { Renamed: undefined })} ChangesNullable
 */

/**
 * @exports
 * @typedef { PackStructure<StringChanges> & {
*  uv: TexturesStructure<import('./basic').Map<string, string>>
*  tints: TexturesStructure<SimpleChanges<import('./basic').Map<string, HexColor>>>
* }} PackChanges
*/

/**
 * @exports
 * @typedef { PackStructureNullable<StringChangesNullable> & {
*  uv?: TexturesStructureNullable<import('./basic').Map<string, string>>
*  tints?: TexturesStructureNullable<SimpleChangesNullable<import('./basic').Map<string, HexColor>>>
* }} PackChangesNullable
*/

/**
 * @exports
 * @typedef { '1.6' |
 *  '1.7' |
 *  '1.8' |
 *  '1.9' |
 *  '1.10' |
 *  '1.11' |
 *  '1.12' |
 *  '1.13' |
 *  '1.14' |
 *  '1.15' |
 *  '1.16' |
 *  '1.17' |
 *  '1.18' |
 *  '1.19' |
 *  '1.20'
 * } Version
 */

/** @returns {import('./changes').PackChanges} */
function noChanges() {
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

let  v1_6 = {
    ...noChanges(),
}
let  v1_7 = {
    ...noChanges(),
}
let  v1_8 = {
    ...noChanges(),
}
let  v1_9 = {
    ...noChanges(),
}
let  v1_10 = {
    ...noChanges(),
}
let  v1_11 = {
    ...noChanges(),
}
let  v1_12 = {
    ...noChanges(),
}
let  v1_13 = {
    ...noChanges(),
}
let  v1_14 = {
    ...noChanges(),
}
let  v1_15 = {
    ...noChanges(),
}
let  v1_16 = {
    ...noChanges(),
}
let  v1_17 = {
    ...noChanges(),
}
let  v1_18 = {
    ...noChanges(),
}
let  v1_19 = {
    ...noChanges(),
}
let  v1_20 = {
    ...noChanges(),
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
    const path = Path.join(paths.versionChanges, version + '.js')
    if (!fs.existsSync(path)) {
        // console.error(`Changes for version ${version} not found`)
        continue
    }
    const js = fs.readFileSync(path, 'utf8')
    const res = eval(js)
    if (res) {
        versionHistory[version] = {
            ...noChanges(),
            ...res,
        }
    }
}

/** @returns {import('./changes').PackStructure<string[]>} */
function base() {
    const path = Path.join(paths.versionChanges, 'base' + '.js')
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
function inverseSimpleChanges(changes) {
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
function inverseStringChanges(changes) {
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
function inverseUVs(uvs) {
    /** @type {import('./basic').Map<string, string>} */
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
function inversePack(changes) {
    return {
        models: {
            block: inverseStringChanges(changes.models.block),
            item: inverseStringChanges(changes.models.item),
            entity: undefined,
        },
        textures: {
            block: inverseStringChanges(changes.textures.block),
            item: inverseStringChanges(changes.textures.item),
            entity: inverseStringChanges(changes.textures.entity),
            gui: inverseStringChanges(changes.textures.gui),
        },
        uv: {
            block: inverseUVs(changes.uv.block),
            item: inverseUVs(changes.uv.item),
            entity: inverseUVs(changes.uv.entity),
            gui: inverseUVs(changes.uv.gui),
        },
        tints: {
            block: inverseSimpleChanges(changes.tints.block),
            item: inverseSimpleChanges(changes.tints.item),
            entity: inverseSimpleChanges(changes.tints.entity),
            gui: inverseSimpleChanges(changes.tints.gui),
        },
        blockstates: toNonullStringChanges(changes.blockstates),
    }
}

/**
 * @param {import('./changes').StringChangesNullable | null | undefined} changes
 * @returns {import('./changes').StringChanges}
 */
function toNonullStringChanges(changes) {
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
function toNonullSimpleChanges(changes, def) {
    return {
        Added: changes?.Added ?? def,
        Deleted: changes?.Deleted ?? def,
    }
}

/**
 * @param {import('./changes').PackChangesNullable | null | undefined} changes
 * @returns {import('./changes').PackChanges}
 */
function toNonullPack(changes) {
    return {
        models: {
            block: toNonullStringChanges(changes?.models?.block),
            item: toNonullStringChanges(changes?.models?.item),
            entity: undefined,
        },
        textures: {
            block: toNonullStringChanges(changes?.textures?.block),
            item: toNonullStringChanges(changes?.textures?.item),
            entity: toNonullStringChanges(changes?.textures?.entity),
            gui: toNonullStringChanges(changes?.textures?.gui),
        },
        uv: {
            // @ts-ignore
            block: toNonullStringChanges(changes?.uv?.block),
            // @ts-ignore
            item: toNonullStringChanges(changes?.uv?.item),
            // @ts-ignore
            entity: toNonullStringChanges(changes?.uv?.entity),
            // @ts-ignore
            gui: toNonullStringChanges(changes?.uv?.gui),
        },
        tints: {
            block: toNonullSimpleChanges(changes?.tints?.block, { }),
            item: toNonullSimpleChanges(changes?.tints?.item, { }),
            entity: toNonullSimpleChanges(changes?.tints?.entity, { }),
            gui: toNonullSimpleChanges(changes?.tints?.gui, { }),
        },
        blockstates: toNonullStringChanges(changes?.blockstates),
    }
}

/**
 * @param {import('./changes').StringChanges} changesA
 * @param {import('./changes').StringChangesNullable | undefined} changesB
 */
function chainStringChanges(changesA, changesB) {
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
function chainSimpleChanges(changesA, changesB) {
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
function chainUVs(uvsA, uvsB) {
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
function chainPackChanges(from, to) {
    const fromIndex = (typeof from === 'string') ? Pack.versions.indexOf(from) : from
    const toIndex = (typeof to === 'string') ? Pack.versions.indexOf(to) : to

    if (fromIndex === -1 || toIndex === -1) {
        throw new Error('Failed to get version index')
    }

    if (fromIndex == toIndex) {
        throw new Error('Current version is same as target version')
    }

    /** @type {import('./changes').PackChanges} */
    const changes = noChanges()

    for (let i = fromIndex; i < toIndex; i++) {
        const version = Pack.versions[i]
        if (!version) { continue }
        const currentChanges = versionHistory[version]

        changes.models.block = chainStringChanges(changes.models.block, currentChanges.models?.block)
        changes.models.item = chainStringChanges(changes.models.item, currentChanges.models?.item)

        changes.textures.block = chainStringChanges(changes.textures.block, currentChanges.textures?.block)
        changes.textures.item = chainStringChanges(changes.textures.item, currentChanges.textures?.item)
        changes.textures.entity = chainStringChanges(changes.textures.entity, currentChanges.textures?.entity)
        changes.textures.gui = chainStringChanges(changes.textures.gui, currentChanges.textures?.gui)

        changes.tints.block = chainSimpleChanges(changes.tints.block, currentChanges.tints?.block)

        changes.uv.block = chainUVs(changes.uv.block, currentChanges.uv?.block)
        changes.uv.item = chainUVs(changes.uv.item, currentChanges.uv?.item )
        changes.uv.entity = chainUVs(changes.uv.entity, currentChanges.uv?.entity)
        changes.uv.gui = chainUVs(changes.uv.gui, currentChanges.uv?.gui)
    }

    return changes
}

/**
 * @param {import('./changes').Version} from
 * @param {import('./changes').Version} to
 */
function collectPackChanges(from, to) {
    const fromFormat = Pack.versionToPackFormat[from]
    const toFormat = Pack.versionToPackFormat[to]
    if (!fromFormat) throw new Error(`Failed to get pack format from version ${from}`)
    if (!toFormat) throw new Error(`Failed to get pack format from version ${to}`)
    if (fromFormat == toFormat) throw new Error(`Pack formats are the same`)

    const fromIndex = Pack.versions.indexOf(from)
    const toIndex = Pack.versions.indexOf(to)
    
    let changes
    if (fromFormat < toFormat) {
        changes = chainPackChanges(fromIndex, toIndex + 1)
    } else {
        changes = chainPackChanges(toIndex + 1, fromIndex)
        changes = inversePack(changes)
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
function evaluate(changes, value) {
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
    versionHistory,
    noChanges,
    base,
    collectPackChanges,
    evaluate,
}
