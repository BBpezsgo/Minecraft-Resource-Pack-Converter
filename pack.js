const fs = require('fs')
const Path = require('path')
const Types = require('./pack')

const Utils = {
    ReadJson: /** @type {(file: string) => (null | any)} */ (file) => {
        if (!fs.existsSync(file)) return null
        return JSON.parse(fs.readFileSync(file, 'utf8'))
    },
    ReadJsons: /** @type {(folder: string) => (null | { [id: string]: any })} */ (folder) => {
        if (!fs.existsSync(folder)) return null
        const files = fs.readdirSync(folder, { recursive: false, withFileTypes: false })
        const result = { }
        for (const file of files) {
            if (typeof file !== 'string') continue

            const filePath = Path.join(folder, file)
            if (Path.extname(filePath) !== '.json') continue

            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))

            result[Path.parse(file).name] = data
        }
        return result
    },
    ReadTexts: /** @type {(folder: string) => (null | { [id: string]: string })} */ (folder) => {
        if (!fs.existsSync(folder)) return null
        const files = fs.readdirSync(folder, { recursive: false, withFileTypes: false })
        const result = { }
        for (const file of files) {
            if (typeof file !== 'string') continue

            const filePath = Path.join(folder, file)
            if (Path.extname(filePath) !== '.txt') continue

            const data = fs.readFileSync(filePath, 'utf8')

            result[Path.parse(file).name] = data
        }
        // @ts-ignore
        return result
    },
    ReadFiles: /** @type {(folder: string, extension: string = null) => (null | { [file: string]: string })} */ (folder, extension = undefined) => {
        if (!fs.existsSync(folder)) return null
        const files = fs.readdirSync(folder, { recursive: false, withFileTypes: false })
        const result = { }
        for (const file of files) {
            if (typeof file !== 'string') continue
            if (extension && Path.extname(file) !== extension) continue
            result[Path.parse(file).name] = Path.join(folder, file)
        }
        // @ts-ignore
        return result
    },
    ReadFilesRecursive: /** @type {(folder: string, extension: string = null) => (null | import('./pack').Directory)} */ (folder, extension = undefined) => {
        if (!fs.existsSync(folder)) return null
        const files = fs.readdirSync(folder, { recursive: false, withFileTypes: false })
        /** @type {import('./pack').Directory} */
        const result = { }
        for (const file of files) {
            if (typeof file !== 'string') continue
            const info = fs.statSync(Path.join(folder, file))
            if (info.isDirectory()) {
                const subfolder = Utils.ReadFilesRecursive(Path.join(folder, file), extension)
                if (subfolder) {
                    result[Path.parse(file).name] = subfolder
                }
            } else if (info.isFile()) {
                if (extension && Path.extname(file) !== extension) continue
                result[Path.parse(file).name] = Path.join(folder, file)
            }
        }
        return result
    },
}

/**
 * @param {string} path
 * @returns {ResourcePack | null}
 */
function ReadResourcePack(path) {
    const mcmetaPath = Path.join(path, 'pack.mcmeta')
    // if (!fs.existsSync(mcmetaPath)) return null

    /** @type {Types.McMeta | null} */
    const mcmeta = (fs.existsSync(mcmetaPath)) ? JSON.parse(fs.readFileSync(mcmetaPath, 'utf8')) : null

    const newResourcePack = new ResourcePack(path, mcmeta)
    
    const iconPath = Path.join(path, 'pack.png')
    const iconExists = fs.existsSync(iconPath)

    newResourcePack.Icon = iconExists ? iconPath : null

    const assetsPath = Path.join(path, 'assets')
    
    if (!fs.existsSync(assetsPath)) {
        newResourcePack.Assets = { }
        return newResourcePack
    }

    const namespaceNames = fs.readdirSync(assetsPath)

    /** @type {{[namespace:string]:Namespace}} */
    let namespaces = {

    }

    for (const namespace of namespaceNames) {
        const namespacePath = Path.join(assetsPath, namespace)

        const info = fs.statSync(namespacePath)

        if (!info.isDirectory()) {
            continue
        }

        namespaces[namespace] = ReadNamespace(namespacePath)
    }

    newResourcePack.Assets = namespaces
    return newResourcePack
}

/**
 * @param {string} path
 */
function ReadNamespace(path) {
    const Asset = new Namespace(path)

    Asset.gpu_warnlist = Utils.ReadJson(Path.join(path, 'gpu_warnlist.json'))


    Asset.sounds = Utils.ReadJson(Path.join(path, 'sounds.json'))


    Asset.blockstates = null // Utils.ReadJsons(Path.join(path, 'blockstates'))

    
    Asset.font = Utils.ReadJsons(Path.join(path, 'font'))


    Asset.lang = null // Utils.ReadJsons(Path.join(path, 'lang'))


    /*
    const ModelsPath = Path.join(path, 'models')
    Asset.models = null
    if (false && fs.existsSync(ModelsPath)) {
        Asset.models = {
            block: Utils.ReadJsons(Path.join(ModelsPath, 'block')),
            item: Utils.ReadJsons(Path.join(ModelsPath, 'item')),
        }
    }
    */


    Asset.particles = Utils.ReadJsons(Path.join(path, 'particles'))


    Asset.regional_compliancies = Utils.ReadJson(Path.join(path, 'regional_compliancies.json'))


    Asset.texts = null // Utils.ReadTexts(Path.join(path, 'texts'))


    /*
    const TexturesPath = Path.join(path, 'textures')
    Asset.textures = null
    if (false && fs.existsSync(TexturesPath)) {
        Asset.textures = Utils.ReadFilesRecursive(TexturesPath)
        {
            block: Utils.ReadFiles(Path.join(TexturesPath, 'block'), '.png'),
            colormap: Utils.ReadFiles(Path.join(TexturesPath, 'colormap'), '.png'),
            effect: Utils.ReadFiles(Path.join(TexturesPath, 'effect'), '.png'),
            environment: Utils.ReadFiles(Path.join(TexturesPath, 'environment'), '.png'),
            font: Utils.ReadFiles(Path.join(TexturesPath, 'font'), '.png'),
            item: Utils.ReadFiles(Path.join(TexturesPath, 'item'), '.png'),
            map: Utils.ReadFiles(Path.join(TexturesPath, 'map'), '.png'),
            misc: Utils.ReadFiles(Path.join(TexturesPath, 'misc'), '.png'),
            mob_effect: Utils.ReadFiles(Path.join(TexturesPath, 'mob_effect'), '.png'),
            painting: Utils.ReadFiles(Path.join(TexturesPath, 'painting'), '.png'),
            particle: Utils.ReadFiles(Path.join(TexturesPath, 'particle'), '.png'),
        }
    }
    */

    return Asset
}

class ResourcePack {
    /**
     * @param {string} path
     * @param {Types.McMeta | null} mcmeta
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
    FindTexture(relativePath, defaultNamespace) {
        let namespace = defaultNamespace
        if (relativePath.includes(':')) {
            namespace = relativePath.split(':')[0]
            relativePath = relativePath.substring(namespace.length + 1)
        }
        if (!this.Assets[namespace]) {
            return null
        }
        return this.Assets[namespace].FindTexture(relativePath)
    }
}

class Namespace {
    /**
     * @param {string} path
     */
    constructor(path) {
        this.Path = path

        this.gpu_warnlist = null
        this.sounds = null
        this.blockstates = null
        this.font = null
        this.lang = null
        this.particles = null
        this.regional_compliancies = null
        this.texts = null
    }

    /**
     * @param {string} relativePath
     */
    FindTexture(relativePath) {
        if (relativePath.includes(':')) {
            relativePath = relativePath.substring(relativePath.split(':')[0].length + 1)
        }
        const path = Path.join(this.Path, 'textures', relativePath)
        if (!fs.existsSync(path)) {
            return null
        }

        if (!fs.statSync(path).isFile()) {
            return null
        }

        const animationPath = path + '.mcmeta'

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
            path: path,
            animation: animation,
        }
    }

    /**
     * @param {string} relativePath
     */
    GetTextures(relativePath) {
        const path = Path.join(this.Path, 'textures', relativePath)
        if (!fs.existsSync(path)) {
            return null
        }

        if (!fs.statSync(path).isDirectory()) {
            return null
        }

        const content = fs.readdirSync(path)

        const result = {

        }

        for (const element of content) {
            const elementPath = Path.join(path, element)
            if (!fs.statSync(elementPath).isFile()) {
                continue
            }
            if (Path.extname(elementPath) !== '.png') {
                continue
            }
            result[element.replace('.png', '')] = elementPath
        }

        return result
    }

    /**
     * @param {string} relativePath
     */
    GetTexturesRecursive(relativePath) {
        const path = Path.join(this.Path, 'textures', relativePath)
        if (!fs.existsSync(path)) {
            return null
        }

        if (!fs.statSync(path).isDirectory()) {
            return null
        }

        const result = {

        }

        const Do = function(/** @type {string[]} */ ...pathElements) {
            const content = fs.readdirSync(Path.join(path, ...pathElements))

            for (const element of content) {
                const elementPath = Path.join(path, ...pathElements, element)
                if (fs.statSync(elementPath).isDirectory()) {
                    Do(...pathElements, element)
                    continue
                }
                if (!fs.statSync(elementPath).isFile()) {
                    continue
                }
                if (Path.extname(elementPath) !== '.png') {
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
    FindModel(relativePath) {
        const path = Path.join(this.Path, 'models', relativePath)
        if (!fs.existsSync(path)) {
            return null
        }

        if (!fs.statSync(path).isFile()) {
            return null
        }

        return path
    }

    /**
     * @param {string} relativePath
     */
    GetModels(relativePath) {
        const path = Path.join(this.Path, 'models', relativePath)
        if (!fs.existsSync(path)) {
            return null
        }

        if (!fs.statSync(path).isDirectory()) {
            return null
        }

        const content = fs.readdirSync(path)

        const result = {

        }

        for (const element of content) {
            const elementPath = Path.join(path, element)
            if (!fs.statSync(elementPath).isFile()) {
                continue
            }
            if (Path.extname(elementPath) !== '.json') {
                continue
            }
            result[element.replace('.json', '')] = elementPath
        }

        return result
    }
}

const VersionToPackFormat = {
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

const PackFormatToVersion = {
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
const Versions = [
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
function GetDefaultPack(version) {
    const format = VersionToPackFormat[version]
    if (!format) throw new Error(`Failed to get pack format from version ${version}`)

    const Changes = require('./changes')

    let base = Changes.Base()
    const changes = Changes.CollectPackChanges('1.6', version)

    for (let i = base.models.block.length; i >= 0; i--) {
        const evaulated = Changes.Evaluate(changes.models.block, base.models.block[i])
        if (evaulated === undefined) continue
        if (evaulated === null) {
            base.models.block.splice(i, 1)
            continue
        }
        base.models.block[i] = evaulated
    }
    
    for (let i = base.models.item.length; i >= 0; i--) {
        const evaulated = Changes.Evaluate(changes.models.item, base.models.item[i])
        if (evaulated === undefined) continue
        if (evaulated === null) {
            base.models.item.splice(i, 1)
            continue
        }
        base.models.item[i] = evaulated
    }
    
    for (let i = base.textures.block.length; i >= 0; i--) {
        const evaulated = Changes.Evaluate(changes.textures.block, base.textures.block[i])
        if (evaulated === undefined) continue
        if (evaulated === null) {
            base.textures.block.splice(i, 1)
            continue
        }
        base.textures.block[i] = evaulated
    }
    
    for (let i = base.textures.item.length; i >= 0; i--) {
        const evaulated = Changes.Evaluate(changes.textures.item, base.textures.item[i])
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
    ReadResourcePack,
    ResourcePack,
    Namespace,
    VersionToPackFormat,
    PackFormatToVersion,
    Versions,
    GetDefaultPack,
}