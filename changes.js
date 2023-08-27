/** @type {import('./changes').PackChanges} */
const none = {
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
    },
}

const fs = require('fs')
const Path = require('path')

let  v1_6 = {
    ...none,
}
let  v1_7 = {
    ...none,
}
let  v1_8 = {
    ...none,
}
let  v1_9 = {
    ...none,
}
let  v1_10 = {
    ...none,
}
let  v1_11 = {
    ...none,
}
let  v1_12 = {
    ...none,
}
let  v1_13 = {
    ...none,
}
let  v1_14 = {
    ...none,
}
let  v1_15 = {
    ...none,
}
let  v1_16 = {
    ...none,
}
let  v1_17 = {
    ...none,
}
let  v1_18 = {
    ...none,
}
let  v1_19 = {
    ...none,
}
let  v1_20 = {
    ...none,
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
            ...none,
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
 * @param {import('./changes').PackChanges} changes
 * @returns {import('./changes').PackChanges}
 */
function InversePack(changes) {
    return {
        models: {
            block: Inverse(changes.models.block),
            item: Inverse(changes.models.item),
        },
        textures: {
            block: Inverse(changes.textures.block),
            item: Inverse(changes.textures.item),
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
        },
        textures: {
            block: ToNonull(changes?.textures?.block),
            item: ToNonull(changes?.textures?.item),
        },
    }
}

module.exports = {
    VersionHistory: versionHistory,
    EmptyChanges: none,
    GetKey,
    GetPair,
    Inverse,
    InversePack,
    ToNonull,
    ToNonullPack,
    Base,
}
