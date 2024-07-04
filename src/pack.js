const fs = require('fs')
const path = require('path')
const pathlib = path
const StreamZip = require('node-stream-zip')
const JSON5 = require('json5')
const Jimp = require('jimp')

/**
 * @typedef {{
 *   type: 'buffer'
 *   data: Buffer
 * } | {
 *   type: 'text'
 *   data: string
 * } | {
 *   type: 'json'
 *   data: any
 * } | {
 *   type: 'image'
 *   data: import('jimp')
 * } | {
 *   type: 'ref'
 *   file: string
 * }} AssetEntry
 */

/**
 * @typedef {AssetEntry & { name: string }} NamedAssetEntry
 */

class AssetEntryUtils {
    /**
     * @param {AssetEntry} entry
     */
    static getBuffer(entry) {
        switch (entry.type) {
            case 'buffer': return entry.data
            case 'ref': return fs.readFileSync(entry.file)
            default: throw new Error()
        }
    }
    
    /**
     * @param {AssetEntry} entry
     */
    static async getImage(entry) {
        switch (entry.type) {
            case 'buffer': return Jimp.read(entry.data)
            case 'ref': return Jimp.read(fs.readFileSync(entry.file))
            case 'image': return Jimp.read(entry.data)
            default: throw new Error()
        }
    }
    
    /**
     * @param {AssetEntry} entry
     */
    static getJson(entry) {
        switch (entry.type) {
            case 'buffer': return JSON5.parse(entry.data.toString('utf8'))
            case 'ref': return JSON5.parse(fs.readFileSync(entry.file, 'utf8'))
            case 'json': return JSON.parse(JSON.stringify(entry.data))
            case 'text': return JSON.parse(entry.data)
            default: throw new Error()
        }
    }
}

class ResourcePack {
    /**
     * @private @readonly
     * @type {{ [name: string]: Namespace }}
     */
    _namespaces

    constructor() {
        this._namespaces = { }
    }

    /**
     * @param {string} relativePath
     * @param {string | null} defaultNamespace
     * @returns {AssetEntry | null}
     */
    get(relativePath, defaultNamespace) {
        relativePath = ResourcePack.normalisePath(relativePath)
        let namespace = this.getNamespaceFromPath(relativePath)
        if (!namespace && defaultNamespace) {
            namespace = this._namespaces[defaultNamespace]
        }
        if (!namespace) { return null }
        if (relativePath.includes(':')) {
            relativePath = relativePath.substring(relativePath.split(':')[0].length + 1)
        } else if (relativePath.startsWith('/assets/')) {
            relativePath = relativePath.replace('/assets', '')
            relativePath = relativePath.replace('/' + namespace.name, '')
            return namespace.get(relativePath)
        } else {
            debugger
        }
        debugger
        return null
    }

    /**
     * @param {string} relativePath
     * @returns {Namespace | null}
     */
    getNamespaceFromPath(relativePath) {
        if (relativePath.includes(':')) {
            const namespace = relativePath.split(':')[0]
            if (!namespace) { return null }
            return this._namespaces[namespace] ?? null
        } else {
            relativePath = ResourcePack.normalisePath(relativePath)
            if (!relativePath.startsWith('/assets/')) { return null }
            const namespace = relativePath.split('/')[2]
            return this._namespaces[namespace] ?? null
        }
    }

    /**
     * @param {string | null} name
     * @returns {Namespace | null}
     */
    getNamespace(name) {
        if (!name) { return null }
        return this._namespaces[name] ?? null
    }

    /**
     * @param {Array<Namespace>} namespaces
     */
    pushNamespaces(...namespaces) {
        for (const namespace of namespaces) {
            this._namespaces[namespace.name] = namespace
        }
    }

    /**
     * @param {Array<NamedAssetEntry>} entries
     */
    pushEntries(...entries) {
        for (const entry of entries) {
            let entryName = entry.name
            entryName = entryName.replace(/\\/g, '/')
            if (!entryName.startsWith('/')) { entryName = '/' + entryName }
            if (!entryName.startsWith('/assets/')) { continue }
            const namespaceName = entry.name.split('/')[2]
            if (!namespaceName) { continue }
            this._namespaces[namespaceName] ??= new Namespace(namespaceName)
            this._namespaces[namespaceName].push(entry)
        }
    }

    /**
     * @param {fs.PathLike} folderPath
     */
    static loadFolder(folderPath) {
        const result = new ResourcePack()
        const files = fs.readdirSync(folderPath, { recursive: true, encoding: 'utf8' })
        for (const file of files) {
            debugger
        }
        return result
    }

    /**
     * @param {string | StreamZip} zip
     */
    static loadZip(zip) {
        return new Promise((resolve, reject) => {
            if (zip instanceof StreamZip) {
                const result = new ResourcePack()
                const entries = zip.entries()
                for (const name in entries) {
                    const value = entries[name]
                    if (value.isDirectory) { continue }
                    let normalName = name.replace(/\\/g, '/')
                    if (!normalName.startsWith('/')) { normalName = '/' + normalName }
                    if (!normalName.startsWith('/assets')) { continue }

                    result.pushEntries({
                        name: normalName,
                        type: 'buffer',
                        data: zip.entryDataSync(value),
                    })
                }
                resolve(result)
            } else {
                const _zip = new StreamZip({
                    file: zip,
                    storeEntries: true,
                })
                _zip.on('error', reject)
                _zip.on('ready', () => {
                    this.loadZip(_zip)
                        .then(resolve)
                        .catch(reject)
                })
            }
        })
    }

    /**
     * @template {string} TNamespace
     * @param {string} path
     * @param {TNamespace} [defaultNamespace]
     * @returns {{ path: string; namespace?: string }}
     */
    static parsePath(path, defaultNamespace = undefined) {
        if (!path.includes(':')) {
            return {
                path: path,
                namespace: defaultNamespace,
            }
        } else {
            const namespace = path.split(':')[0]
            return {
                path: path.substring(namespace.length + 1),
                namespace: namespace,
            }
        }
    }

    /**
     * @param {Array<string>} path
     * @returns {string}
     */
    static normalisePath(...path) {
        let normalPath = pathlib.join(...path)
        normalPath = normalPath.replace(/\\/g, '/')
        if (!normalPath.startsWith('/')) { normalPath = '/' + normalPath }
        return normalPath
    }
}

class Namespace {
    /**
     * @private @readonly
     * @type {{ [name: string]: AssetEntry }}
     */
    _entries

    /**
     * @readonly
     */
    get entries() {
        return {
            ...this._entries,
        }
    }

    /**
     * @readonly
     * @type {string}
     */
    name

    /**
     * @param {string} name
     */
    constructor(name) {
        this._entries = { }
        this.name = name
    }

    /**
     * @param {Array<NamedAssetEntry>} entries
     */
    push(...entries) {
        for (const entry of entries) {
            let entryName = ResourcePack.normalisePath(entry.name)
            if (!entryName.startsWith('/assets/' + this.name)) { continue }
            entryName = entryName.replace('/assets/' + this.name, '')
            if (!entryName.startsWith('/')) { entryName = '/' + entryName }
            this._entries[entryName] = entry
        }
    }

    /**
     * @param {Array<string>} path
     * @returns {AssetEntry |null}
     */
    get(...path) {
        let fullPath = ResourcePack.normalisePath(...path)
        const entry = this._entries[fullPath]
        return entry ?? null
    }

    /**
     * @param {string} path
     * @returns {import('./model').AnyModel |null}
     */
    getModel(path) {
        if (ResourcePack.parsePath(path).namespace && ResourcePack.parsePath(path).namespace !== this.name) { return null }
        const entry = this.get('models', path + '.json')
        if (!entry) { return null }
        switch (entry.type) {
            case 'buffer': return JSON5.parse(entry.data.toString('utf8'))
            case 'json': return JSON.parse(JSON.stringify(entry.data))
            case 'text': return JSON5.parse(entry.data)
            case 'ref': return JSON5.parse(fs.readFileSync(entry.file, 'utf8'))
            default: throw new Error()
        }
    }

    /**
     * @param {string} path
     */
    getTexture(path) {
        if (ResourcePack.parsePath(path).namespace && ResourcePack.parsePath(path).namespace !== this.name) { return null }
        const entry = this.get('textures', path + '.png')
        if (!entry) { return null }
        switch (entry.type) {
            case 'buffer': return entry.data
            case 'ref': return fs.readFileSync(entry.file)
            default: throw new Error()
        }
    }
    
    /**
     * @param {Array<string>} path 
     */
    getTextureNames(...path) {
        const normalPath = ResourcePack.normalisePath('textures', ...path)
        return this.getEntryNames(normalPath, (name) => {
            if (!name.endsWith('.png')) { return false }
            return true
        }, (name) => {
            return name.replace('.png', '')
        })
    }
    
    /**
     * @param {Array<string>} path 
     */
    getModelNames(...path) {
        const normalPath = ResourcePack.normalisePath('models', ...path)
        return this.getEntryNames(normalPath, (name) => {
            if (!name.endsWith('.json')) { return false }
            return true
        }, (name) => {
            return name.replace('.json', '')
        })
    }
    
    /**
     * @param {string} path 
     * @param {(localPath: string) => boolean} filter 
     * @param {(name: string) => string} replacer 
     */
    getEntryNames(path, filter, replacer) {
        const normalPath = ResourcePack.normalisePath(path)
        /** @type {import('./basic').Map<string, string>} */
        const result = { }

        for (const name in this._entries) {
            if (!name.startsWith(normalPath)) { continue }
            if (!filter(name)) { continue }

            result[replacer(pathlib.basename(name))] = name
        }

        return result
    }
}

/**
 * @type {{ [version: string]: PackFormat }}
 */
const versionToPackFormat = {
    '1.6': 1,
    '1.7': 1,
    '1.8': 1,
    '1.9': 2,
    '1.10': 2,
    '1.11': 3,
    '1.12': 3,
    '1.13': 4,
    '1.14': 4,
    '1.15': 5,
    '1.16': 6,
    '1.17': 7,
    '1.18': 8,
    '1.19': 14,
    '1.20': 15,
}

/**
 * @exports
 * @typedef {1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 11 | 12 | 13 | 14 | 15 | 16} PackFormat
 */

/**
 * @type {{ [packFormat: number]: import('./changes').Version }}
 */
const packFormatToVersion = {
    1: '1.8',
    2: '1.10',
    3: '1.12',
    4: '1.14',
    5: '1.15',
    6: '1.16',
    7: '1.17',
    8: '1.18',
    14: '1.19',
    15: '1.20',
}

/** @type {Array<import('./changes').Version>} */
const versions = [
    '1.6',
    '1.7',
    '1.8',
    '1.9',
    '1.10',
    '1.11',
    '1.12',
    '1.13',
    '1.14',
    '1.15',
    '1.16',
    '1.17',
    '1.18',
    '1.19',
    '1.20',
]

/**
 * @param {import('./changes').Version} version
 */
function getDefaultPack(version) {
    const format = versionToPackFormat[version]
    if (!format) throw new Error(`Failed to get pack format from version ${version}`)

    const Changes = require('./changes')

    let base = Changes.base()
    const changes = Changes.collectPackChanges('1.6', version)

    for (let i = base.models.block.length; i >= 0; i--) {
        const evaulated = Changes.evaluate(changes.models.block, base.models.block[i])
        if (evaulated === undefined) continue
        if (evaulated === null) {
            base.models.block.splice(i, 1)
            continue
        }
        base.models.block[i] = evaulated
    }

    for (let i = base.models.item.length; i >= 0; i--) {
        const evaulated = Changes.evaluate(changes.models.item, base.models.item[i])
        if (evaulated === undefined) continue
        if (evaulated === null) {
            base.models.item.splice(i, 1)
            continue
        }
        base.models.item[i] = evaulated
    }

    for (let i = base.textures.block.length; i >= 0; i--) {
        const evaulated = Changes.evaluate(changes.textures.block, base.textures.block[i])
        if (evaulated === undefined) continue
        if (evaulated === null) {
            base.textures.block.splice(i, 1)
            continue
        }
        base.textures.block[i] = evaulated
    }

    for (let i = base.textures.item.length; i >= 0; i--) {
        const evaulated = Changes.evaluate(changes.textures.item, base.textures.item[i])
        if (evaulated === undefined) continue
        if (evaulated === null) {
            base.textures.item.splice(i, 1)
            continue
        }
        base.textures.item[i] = evaulated
    }

    return base
}

module.exports = {
    ResourcePack,
    Namespace,
    versionToPackFormat,
    packFormatToVersion,
    versions,
    getDefaultPack,
    AssetEntryUtils,
}
