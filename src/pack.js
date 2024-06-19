const fs = require('fs')
const path = require('path')
const StreamZip = require('node-stream-zip')

const utils = {
    readJson: /** @type {(file: string) => (null | any)} */ (file) => {
        if (!fs.existsSync(file)) return null
        return JSON.parse(fs.readFileSync(file, 'utf8'))
    },
    readJsons: /** @type {(folder: string) => (null | { [id: string]: any })} */ (folder) => {
        if (!fs.existsSync(folder)) return null
        const files = fs.readdirSync(folder)
        const result = {}
        for (const file of files) {
            if (typeof file !== 'string') continue

            const filePath = path.join(folder, file)
            if (path.extname(filePath) !== '.json') continue

            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))

            result[path.parse(file).name] = data
        }
        return result
    },
    readTexts: /** @type {(folder: string) => (null | { [id: string]: string })} */ (folder) => {
        if (!fs.existsSync(folder)) return null
        const files = fs.readdirSync(folder)
        const result = {}
        for (const file of files) {
            if (typeof file !== 'string') continue

            const filePath = path.join(folder, file)
            if (path.extname(filePath) !== '.txt') continue

            const data = fs.readFileSync(filePath, 'utf8')

            result[path.parse(file).name] = data
        }
        // @ts-ignore
        return result
    },
    readFiles: /** @type {(folder: string, extension: string = null) => (null | { [file: string]: string })} */ (folder, extension = undefined) => {
        if (!fs.existsSync(folder)) return null
        const files = fs.readdirSync(folder)
        const result = {}
        for (const file of files) {
            if (typeof file !== 'string') continue
            if (extension && path.extname(file) !== extension) continue
            result[path.parse(file).name] = path.join(folder, file)
        }
        // @ts-ignore
        return result
    },
    readFilesRecursive: /** @type {(folder: string, extension: string = null) => (null | import('./pack-types').Directory)} */ (folder, extension = undefined) => {
        if (!fs.existsSync(folder)) return null
        const files = fs.readdirSync(folder)
        /** @type {import('./pack-types').Directory} */
        const result = {}
        for (const file of files) {
            if (typeof file !== 'string') continue
            const info = fs.statSync(path.join(folder, file))
            if (info.isDirectory()) {
                const subfolder = utils.ReadFilesRecursive(path.join(folder, file), extension)
                if (subfolder) {
                    result[path.parse(file).name] = subfolder
                }
            } else if (info.isFile()) {
                if (extension && path.extname(file) !== extension) continue
                result[path.parse(file).name] = path.join(folder, file)
            }
        }
        return result
    },
}

/**
 * @abstract
 * @template {NamespaceAny} [TNamespace = NamespaceAny]
 */
class ResourcePackAny {
    /**
     * @readonly
     * @type {string}
     * @abstract
     */
    get name() { debugger; throw 'Not implemented' }

    /**
     * @readonly
     * @type {{ [namespace: string]: TNamespace }}
     */
    namespaces

    constructor() {
        this.namespaces = {}
    }

    /**
     * @param {string} relativePath
     * @param {string | null} defaultNamespace
     */
    getNamespace(relativePath, defaultNamespace = 'minecraft') {
        let namespace = defaultNamespace
        if (relativePath.includes(':')) { namespace = relativePath.split(':')[0] }
        if (!namespace) { return null }
        return this.namespaces[namespace] ?? null
    }

    /**
     * @param {string} relativePath
     * @param {string} folderName
     */
    static fullyQualify(relativePath, folderName) {
        if (!relativePath.includes(':')) { return relativePath }

        const namespaceName = relativePath.split(':')[0]
        relativePath = relativePath.replace(namespaceName + ':', '')
        if (relativePath.startsWith('/')) { relativePath = relativePath.substring(1) }
        relativePath = `assets/${namespaceName}/${folderName}/${relativePath}`
        return relativePath
    }

    /**
     * @param {string} relativePath
     * @returns {Buffer | null}
     */
    getContent(relativePath) {
        relativePath = relativePath.replace(/\\/g, '/')
        if (relativePath.startsWith('/')) { relativePath = relativePath.substring(1) }

        if (relativePath.includes(':')) {
            const namespaceName = relativePath.split(':')[0]
            const namespace = this.namespaces[namespaceName]
            if (!namespace) { return null }
            return namespace.getContent(relativePath.split(':')[1])
        }

        const namespaceName = relativePath.split('/')[1]
        const namespace = this.namespaces[namespaceName]
        if (!namespace) { return null }
        return namespace.getContent(relativePath.replace(`assets/${namespaceName}/`, ''))
    }
}

/**
 * @extends {ResourcePackAny<NamespaceFolder>}
 */
class ResourcePackFolder extends ResourcePackAny {
    /**
     * @readonly
     * @type {string}
     */
    path

    /**
     * @readonly
     * @override
     * @type {string}
     */
    get name() { return path.basename(this.path) }

    /**
     * @param {string} packPath
     */
    constructor(packPath) {
        super()

        this.path = packPath

        const namespacesPath = path.join(packPath, 'assets')

        if (!fs.existsSync(namespacesPath)) { return }
        if (!fs.statSync(namespacesPath).isDirectory()) { return }

        const namespaceNames = fs.readdirSync(namespacesPath)

        for (const namespace of namespaceNames) {
            const namespacePath = path.join(namespacesPath, namespace)
            const info = fs.statSync(namespacePath)
            if (!info.isDirectory()) { continue }

            this.namespaces[namespace] = new NamespaceFolder(namespacePath)
        }
    }
}

/**
 * @extends {ResourcePackAny<NamespaceZip>}
 */
class ResourcePackZip extends ResourcePackAny {
    /**
     * @readonly
     * @type {StreamZip}
     */
    zip

    /**
     * @private
     * @readonly
     * @type {string}
     */
    path

    /**
     * @readonly
     * @override
     * @type {string}
     */
    get name() { return path.basename(this.path) }

    /**
     * @param {StreamZip} zip
     * @param {string} zipPath
     */
    constructor(zip, zipPath) {
        super()

        this.zip = zip
        this.path = zipPath

        const entries = this.zip.entries()

        for (const entryName in entries) {
            const entry = entries[entryName]
            if (!entry.name.startsWith('assets/')) { continue }
            const namespaceName = entry.name.split('/')[1]
            if (!this.namespaces[namespaceName]) {
                this.namespaces[namespaceName] = new NamespaceZip(this.zip, namespaceName)
            }
        }
    }

    /**
     * @param {string} file
     * @returns {Promise<ResourcePackZip>}
     */
    static read(file) {
        return new Promise((resolve, reject) => {
            const zip = new StreamZip({
                file: file,
                storeEntries: true,
            })
            zip.on('error', reject)
            zip.on('ready', () => { resolve(new ResourcePackZip(zip, file)) })
        })
    }
}

/**
 * @abstract
 */
class NamespaceAny {
    /**
     * @readonly
     * @abstract
     * @type {string}
     */
    get name() { debugger; throw 'Not implemented' }

    constructor() {

    }

    /**
     * @protected
     * @abstract
     * @param {string} relativePath
     * @returns {string}
     */
    toAbsolutePath(relativePath) { debugger; throw 'Not implemented' }

    /**
     * @abstract
     * @param {string} relativePath
     * @returns {Buffer | null}
     */
    getContent(relativePath) { debugger; throw 'Not implemented' }

    /**
     * @abstract
     * @param {string} relativePath
     * @returns {Array<string>}
     */
    getFiles(relativePath) { debugger; throw 'Not implemented' }

    /**
     * @abstract
     * @param {string} relativePath
     * @returns {import('./basic').Map<string, string> | null}
     */
    getFilesRecursive(relativePath) { debugger; throw 'Not implemented' }

    /**
     * @abstract
     * @param {string} relativePath
     * @returns {boolean}
     */
    isFileExists(relativePath) { debugger; throw 'Not implemented' }

    /**
     * @param {string} relativePath
     * @returns {string | null}
     */
    getFile(relativePath) {
        if (!this.isFileExists(relativePath)) { return null }
        return this.toAbsolutePath(relativePath)
    }

    /**
     * @param {string} relativePath
     * @returns {{ path: string; animation: import('./pack-types').Animation | null; } | null}
     */
    getTexture(relativePath) {
        relativePath = path.join('textures', relativePath)

        if (!this.isFileExists(relativePath)) { return null }
        const absolutePath = this.toAbsolutePath(relativePath)

        /** @type {import('./pack-types').Animation | null} */
        let animation = null

        const animationData = this.getContent(absolutePath + '.mcmeta')?.toString('utf8')
        if (animationData) {
            try {
                animation = JSON.parse(animationData)
            } catch (error) {
                console.warn(error)
            }
        }

        return {
            path: absolutePath,
            animation: animation,
        }
    }

    /**
     * @param {string} relativePath
     * @returns {import('./basic').Map<string, string>}
     */
    getTextures(relativePath) {
        const files = this.getFiles(path.join('textures', relativePath))
            .filter(file => {
                if (!file.endsWith('.png')) { return false }
                return true
            })

        /** @type {import('./basic').Map<string, string>} */
        const result = {}

        for (const file of files) {
            result[path.basename(file).replace('.png', '')] = file
        }

        return result
    }

    /**
     * @param {string} relativePath
     * @returns {string | null}
     */
    getModel(relativePath) {
        relativePath = path.join('models', relativePath)
        if (!this.isFileExists(relativePath)) { return null }
        return this.toAbsolutePath(relativePath)
    }

    /**
     * @param {string} relativePath
     * @returns {import('./basic').Map<string, string>}
     */
    getModels(relativePath) {
        const files = this.getFiles(path.join('models', relativePath))
            .filter(file => {
                if (!file.endsWith('.json')) { return false }
                return true
            })

        /** @type {import('./basic').Map<string, string>} */
        const result = {}

        for (const file of files) {
            result[path.basename(file).replace('.json', '')] = file
        }

        return result
    }
}

/**
 * @extends {NamespaceAny}
 */
class NamespaceFolder extends NamespaceAny {
    /**
     * @readonly
     * @type {string}
     */
    path

    /**
     * @readonly
     * @type {string}
     * @override
     */
    get name() { return path.basename(this.path) }

    /**
     * @param {string} namespacePath
     */
    constructor(namespacePath) {
        super()

        this.path = namespacePath
    }

    /**
     * @protected
     * @override
     * @param {string} relativePath
     */
    toAbsolutePath(relativePath) {
        if (relativePath.includes(':')) {
            relativePath = relativePath.substring(relativePath.split(':')[0].length + 1)
        }
        return path.join(this.path, relativePath)
    }

    /**
     * @override
     * @param {string} relativePath
     * @returns {Buffer}
     */
    getContent(relativePath) {
        const absolutePath = this.toAbsolutePath(relativePath)
        return fs.readFileSync(absolutePath)
    }

    /**
     * @override
     * @param {string} relativePath
     * @returns {Array<string>}
     */
    getFiles(relativePath) {
        const directoryPath = this.toAbsolutePath(relativePath)
        if (!fs.existsSync(directoryPath)) { return [] }
        if (!fs.statSync(directoryPath).isDirectory()) { return [] }

        const content = fs.readdirSync(directoryPath)

        /** @type {Array<string>} */
        const result = []

        for (const element of content) {
            const elementPath = path.join(directoryPath, element)
            if (!fs.statSync(elementPath).isFile()) { continue }
            result.push(elementPath)
        }

        return result
    }

    /**
     * @override
     * @param {string} relativePath
     * @returns {boolean}
     */
    isFileExists(relativePath) {
        const absolutePath = this.toAbsolutePath(relativePath)
        if (!fs.existsSync(absolutePath)) { return false }
        if (!fs.statSync(absolutePath).isDirectory()) { return false }

        return true
    }

    /**
     * @param {...string} relativePath
     */
    getFilesRecursive(...relativePath) {
        const directoryPath = this.toAbsolutePath(path.join(...relativePath))
        if (!fs.existsSync(directoryPath)) { return null }
        if (!fs.statSync(directoryPath).isDirectory()) { return null }

        /** @type {import('./basic').Map<string, string>} */
        const result = {}

        const _ = function (/** @type {string[]} */ ...pathElements) {
            const content = fs.readdirSync(path.join(directoryPath, ...pathElements))

            for (const element of content) {
                const elementPath = path.join(directoryPath, ...pathElements, element)
                if (fs.statSync(elementPath).isDirectory()) {
                    _(...pathElements, element)
                    continue
                }
                if (!fs.statSync(elementPath).isFile()) {
                    continue
                }
                if (path.extname(elementPath) !== '.png') {
                    continue
                }
                debugger
                let id = ''
                if (pathElements.length > 0) {
                    id += (pathElements.join('/') + '/')
                }
                id += element.replace('.png', '')
                result[id] = elementPath
            }
        }
        _()

        return result
    }
}

/**
 * @extends {NamespaceAny}
 */
class NamespaceZip extends NamespaceAny {
    /**
     * @readonly
     * @type {StreamZip}
     */
    zip

    /**
     * @readonly
     * @type {{ [name: string]: StreamZip.ZipEntry }}
     */
    entries

    /**
     * @private
     * @readonly
     * @type {string}
     */
    _name

    /**
     * @readonly
     * @override
     * @type {string}
     */
    get name() { return this._name }

    /**
     * @param {StreamZip} zip
     * @param {string} name
     */
    constructor(zip, name) {
        super()

        this.zip = zip
        this._name = name
        this.entries = {}

        const entries = this.zip.entries()
        for (const entryName in entries) {
            const entry = entries[entryName]
            if (!entry.name.startsWith(`assets/${this._name}/`)) { continue }
            this.entries[entryName] = entry
        }
    }

    /**
     * @protected
     * @override
     * @param {string} relativePath
     */
    toAbsolutePath(relativePath) {
        if (relativePath.includes(':')) {
            relativePath = relativePath.substring(relativePath.split(':')[0].length + 1)
        }
        return path.join('assets', this._name, relativePath).replace(/\\/g, '/')
    }

    /**
     * @override
     * @param {string} relativePath
     * @returns {Buffer | null}
     */
    getContent(relativePath) {
        relativePath = relativePath.replace(/\\/g, '/')
        const absolutePath = this.toAbsolutePath(relativePath)
        if (!this.entries[absolutePath]) { return null }
        return this.zip.entryDataSync(this.entries[absolutePath])
    }

    /**
     * @override
     * @param {string} relativePath
     * @returns {Array<string>}
     */
    getFiles(relativePath) {
        const directoryPath = this.toAbsolutePath(relativePath)

        /** @type {Array<string>} */
        const result = []

        for (const entryName in this.entries) {
            const entry = this.entries[entryName]
            if (!entryName.startsWith(directoryPath)) { continue }
            if (!entry.isFile) { continue }
            if (entryName.split('/').length > 5) { continue }
            result.push(entryName)
        }

        return result
    }

    /**
     * @override
     * @param {string} relativePath
     * @returns {boolean}
     */
    isFileExists(relativePath) {
        const absolutePath = this.toAbsolutePath(relativePath)
        if (this.entries[absolutePath]) { return true }
        return false
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
    ResourcePackAny,
    ResourcePackFolder,
    ResourcePackZip,
    NamespaceAny,
    NamespaceFolder,
    NamespaceZip,
    versionToPackFormat,
    packFormatToVersion,
    versions,
    getDefaultPack,
}
