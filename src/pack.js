const fs = require('fs')
const path = require('path')

const utils = {
    readJson: /** @type {(file: string) => (null | any)} */ (file) => {
        if (!fs.existsSync(file)) return null
        return JSON.parse(fs.readFileSync(file, 'utf8'))
    },
    readJsons: /** @type {(folder: string) => (null | { [id: string]: any })} */ (folder) => {
        if (!fs.existsSync(folder)) return null
        const files = fs.readdirSync(folder)
        const result = { }
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
        const result = { }
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
        const result = { }
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
        const result = { }
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
 * @param {string} packPath
 * @returns {ResourcePack | null}
 */
function readResourcePack(packPath) {
    const mcmetaPath = path.join(packPath, 'pack.mcmeta')

    const mcmetaContents = fs.existsSync(mcmetaPath) ? fs.readFileSync(mcmetaPath, 'utf8') : null

    /** @type {import('./pack-types').McMeta | null} */
    const mcmeta = mcmetaContents ? (function () {
        try {
            return JSON.parse(mcmetaContents)
        } catch (error) {
            console.warn(error)
            return null
        }
    })() : null

    const newResourcePack = new ResourcePack(packPath, mcmeta)
    
    const iconPath = path.join(packPath, 'pack.png')
    const iconExists = fs.existsSync(iconPath)

    newResourcePack.Icon = iconExists ? iconPath : null

    const assetsPath = path.join(packPath, 'assets')
    
    if (!fs.existsSync(assetsPath)) {
        newResourcePack.Assets = { }
        return newResourcePack
    }

    const namespaceNames = fs.readdirSync(assetsPath)

    /** @type {{ [namespace: string]: Namespace }} */
    const namespaces = { }

    for (const namespace of namespaceNames) {
        const namespacePath = path.join(assetsPath, namespace)

        const info = fs.statSync(namespacePath)

        if (!info.isDirectory()) {
            continue
        }

        namespaces[namespace] = new Namespace(namespacePath)
    }

    newResourcePack.Assets = namespaces
    return newResourcePack
}

class ResourcePack {
    /**
     * @readonly
     * @type {string}
     */
    Path

    /**
     * @readonly
     * @type {import('./pack-types').McMeta |null}
     */
    Mcmeta

    /**
     * **This is a path!**
     * @type {string | null}
     */
    Icon

    /**
     * @type {{ [namespace: string]: Namespace }}
     */
    Assets
    
    /**
     * @param {string} path
     * @param {import('./pack-types').McMeta | null} mcmeta
     */
    constructor(path, mcmeta) {
        this.Path = path

        this.Mcmeta = mcmeta
        /** @type {string | null} */
        this.Icon = null
        this.Assets = { }
    }

    /**
     * @param {string} relativePath
     * @param {string} defaultNamespace
     */
    findTexture(relativePath, defaultNamespace) {
        let namespace = defaultNamespace
        if (relativePath.includes(':')) {
            namespace = relativePath.split(':')[0]
            relativePath = relativePath.substring(namespace.length + 1)
        }
        if (!this.Assets[namespace]) {
            return null
        }
        return this.Assets[namespace].findTexture(relativePath)
    }
}

class Namespace {
    /**
     * @readonly
     * @type {string}
     */
    Path

    /**
     * @param {string} _path
     */
    constructor(_path) {
        this.Path = _path
    }

    /**
     * @param {string} relativePath
     */
    findTexture(relativePath) {
        if (relativePath.includes(':')) {
            relativePath = relativePath.substring(relativePath.split(':')[0].length + 1)
        }
        const texturePath = path.join(this.Path, 'textures', relativePath)
        if (!fs.existsSync(texturePath)) {
            return null
        }

        if (!fs.statSync(texturePath).isFile()) {
            return null
        }

        const animationPath = texturePath + '.mcmeta'

        let animation = null

        if (fs.existsSync(animationPath)) {
            const animationData = fs.readFileSync(animationPath, 'utf8')
            try {
                animation = JSON.parse(animationData)
            } catch (error) {
                console.error(error)
            }
        }

        return {
            path: texturePath,
            animation: animation,
        }
    }

    /**
     * @param {string} relativePath
     */
    getTextures(relativePath) {
        const texturePath = path.join(this.Path, 'textures', relativePath)
        if (!fs.existsSync(texturePath)) {
            return null
        }

        if (!fs.statSync(texturePath).isDirectory()) {
            return null
        }

        const content = fs.readdirSync(texturePath)

        /**
         * @type {import('./basic').Map<string, string>}
         */
        const result = {

        }

        for (const element of content) {
            const elementPath = path.join(texturePath, element)
            if (!fs.statSync(elementPath).isFile()) {
                continue
            }
            if (path.extname(elementPath) !== '.png') {
                continue
            }
            result[element.replace('.png', '')] = elementPath
        }

        return result
    }

    /**
     * @param {string} relativePath
     */
    getTexturesRecursive(relativePath) {
        const texturePath = path.join(this.Path, 'textures', relativePath)
        if (!fs.existsSync(texturePath)) {
            return null
        }

        if (!fs.statSync(texturePath).isDirectory()) {
            return null
        }

        /**
         * @type {import('./basic').Map<string, string>}
         */
        const result = {

        }

        const Do = function(/** @type {string[]} */ ...pathElements) {
            const content = fs.readdirSync(path.join(texturePath, ...pathElements))

            for (const element of content) {
                const elementPath = path.join(texturePath, ...pathElements, element)
                if (fs.statSync(elementPath).isDirectory()) {
                    Do(...pathElements, element)
                    continue
                }
                if (!fs.statSync(elementPath).isFile()) {
                    continue
                }
                if (path.extname(elementPath) !== '.png') {
                    continue
                }
                let id = ''
                if (pathElements.length > 0) {
                    id += (pathElements.join('/') + '/')
                }
                id += element.replace('.png', '')
                result[id] = elementPath
            }
        }

        Do()

        return result
    }

    /**
     * @param {string} relativePath
     */
    findModel(relativePath) {
        const modelPath = path.join(this.Path, 'models', relativePath)
        if (!fs.existsSync(modelPath)) {
            return null
        }

        if (!fs.statSync(modelPath).isFile()) {
            return null
        }

        return modelPath
    }

    /**
     * @param {string} relativePath
     */
    getModels(relativePath) {
        const modelPath = path.join(this.Path, 'models', relativePath)
        if (!fs.existsSync(modelPath)) {
            return null
        }

        if (!fs.statSync(modelPath).isDirectory()) {
            return null
        }

        const content = fs.readdirSync(modelPath)

        /**
         * @type {import('./basic').Map<string, string>}
         */
        const result = {

        }

        for (const element of content) {
            const elementPath = path.join(modelPath, element)
            if (!fs.statSync(elementPath).isFile()) {
                continue
            }
            if (path.extname(elementPath) !== '.json') {
                continue
            }
            result[element.replace('.json', '')] = elementPath
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

/** @type {import('./changes').Version[]} */
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
    readResourcePack,
    getDefaultPack,
}
