const Pack = require('./pack')
const fs = require('fs')
const Path = require('path')
const Changes = require('./changes')
const { VersionToPackFormat } = require('./pack')
const Utils = require('./utils')

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
        if (!result.Deleted.includes(deleted)) {
            result.Deleted.push(deleted)
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

    /** @type {Changes.PackChanges} */
    const changes = Changes.EmptyChanges

    for (let i = fromIndex; i < toIndex; i++) {
        const version = Pack.Versions[i]
        if (!version) { continue }
        const currentChanges = Changes.VersionHistory[version]

        changes.models.block = ChainChanges(changes.models.block, currentChanges.models?.block)
        changes.models.item = ChainChanges(changes.models.item, currentChanges.models?.item)
        changes.textures.block = ChainChanges(changes.textures.block, currentChanges.textures?.block)
        changes.textures.item = ChainChanges(changes.textures.block, currentChanges.textures?.item)
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

/**
 * @param {Changes.Version} version
 */
function GetDefaultPack(version) {
    const format = VersionToPackFormat[version]
    if (!format) throw new Error(`Failed to get pack format from version ${version}`)

    let base = Changes.Base()
    const changes = CollectPackChanges('1.6', version)

    for (let i = 0; i < base.models.block.length; i++) {
        const evaulated = Evaluate(changes.models.block, base.models.block[i])
        if (evaulated === undefined) continue
        base.models.block[i] = evaulated
    }
    
    for (let i = 0; i < base.models.item.length; i++) {
        const evaulated = Evaluate(changes.models.item, base.models.item[i])
        if (evaulated === undefined) continue
        base.models.item[i] = evaulated
    }
    
    for (let i = 0; i < base.textures.block.length; i++) {
        const evaulated = Evaluate(changes.textures.block, base.textures.block[i])
        if (evaulated === undefined) continue
        base.textures.block[i] = evaulated
    }
    
    for (let i = 0; i < base.textures.item.length; i++) {
        const evaulated = Evaluate(changes.textures.item, base.textures.item[i])
        if (evaulated === undefined) continue
        base.textures.item[i] = evaulated
    }

    return base
}

/**
 * @param {Changes.Version} from
 * @param {Changes.Version} to
 */
function CollectPackChanges(from, to) {
    const fromFormat = VersionToPackFormat[from]
    const toFormat = VersionToPackFormat[to]
    if (!fromFormat) throw new Error(`Failed to get pack format from version ${from}`)
    if (!toFormat) throw new Error(`Failed to get pack format from version ${to}`)
    if (fromFormat == toFormat) throw new Error(`Pack formats are the same`)

    let changes
    if (fromFormat < toFormat) {
        changes = ChainPackChanges(from, to)
    } else {
        changes = ChainPackChanges(to, from)
        changes = Changes.InversePack(changes)
    }
    return changes
}

/**
 * @param {string} inputFolder
 * @param {string} outputFolder
 * @param {string} inputFile **Without extension!**
 * @param {string} outputFile **Without extension!**
 */
function CopyTextureWithOthers(inputFolder, outputFolder, inputFile, outputFile) {
    if (!fs.existsSync(inputFolder)) throw new Error('Input folder does not exists')
    if (!fs.existsSync(outputFolder)) { fs.mkdirSync(outputFolder, { recursive: true }) }

    const png = '.png'
    const mcm = '.mcmeta'
    const ems = '_e'

    let copies = { }

    if (!fs.existsSync(Path.join(inputFolder, inputFile + png))) throw new Error('Input file does not exists')

    copies[png] = png

    if (fs.existsSync(Path.join(inputFolder, inputFile + png + mcm))) {
        copies[png + mcm] = png + mcm
    }

    if (fs.existsSync(Path.join(inputFolder, inputFile + ems + png))) {
        copies[ems + png] = ems + png

        if (fs.existsSync(Path.join(inputFolder, inputFile + ems + png + mcm))) {
            copies[ems + png + mcm] = ems + png + mcm
        }
    }
    
    for (const from in copies) {
        fs.copyFileSync(Path.join(inputFolder, inputFile + from), Path.join(outputFolder, outputFile + copies[from]))
    }
}

/**
 * @param {string} inputFolder
 * @param {string} outputFolder
 * @param {Changes.Changes} changes
 * @param {string[]} base
 */
function ConvertTextures(inputFolder, outputFolder, changes, base) {
    if (!fs.existsSync(inputFolder)) {
        return
    }

    if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder, { recursive: true })
    }

    const files = fs.readdirSync(inputFolder)

    for (const file of files) {
        const ext = file.split('.')[file.split('.').length - 1]
        if (ext !== 'png') { continue }
        const name = file.substring(0, file.length - 4)

        const currentTexture = name
        let targetTexture = Evaluate(changes, currentTexture)

        if (!targetTexture) {
            if (base.includes(currentTexture)) {
                targetTexture = currentTexture
            }
        }

        if (targetTexture) {
            CopyTextureWithOthers(inputFolder, outputFolder, currentTexture, targetTexture)
        }
    }
}

/**
 * @param {string} path
 * @param {import('./pack').PackFormat} format
 */
function ConvertTexturePath(path, format) {
    if (format < 4) {
        path = path.replace('block', 'blocks').replace('item', 'items')
    } else {
        path = path.replace('blocks', 'block').replace('items', 'item')
    }
    return path
}

/**
 * @param {string} inputFolder
 * @param {string} outputFolder
 * @param {Changes.Changes} changes
 * @param {string[]} base
 * @param {string} inputNamespaceFolder
 * @param {string} outputNamespaceFolder
 * @param {Changes.Changes} textureChanges
 * @param {string[]} textureBase
 * @param {import('./pack').PackFormat} outputFormat
 */
function ConvertModels(inputFolder, outputFolder, changes, base, inputNamespaceFolder, outputNamespaceFolder, textureChanges, textureBase, outputFormat) {
    if (!fs.existsSync(inputFolder)) {
        return
    }

    if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder, { recursive: true })
    }

    if (!fs.existsSync(inputNamespaceFolder)) {
        throw new Error('Namespace folder does not exists')
    }

    if (!fs.existsSync(outputNamespaceFolder)) {
        fs.mkdirSync(outputNamespaceFolder, { recursive: true })
    }

    const files = fs.readdirSync(inputFolder)

    for (const file of files) {
        const ext = file.split('.')[file.split('.').length - 1]
        if (ext !== 'json') { continue }
        const name = file.substring(0, file.length - 5)

        const currentModel = name
        let targetModel = Evaluate(changes, currentModel)

        if (!targetModel) {
            if (base.includes(currentModel)) {
                targetModel = currentModel
            }
        }

        if (!targetModel) continue

        let success = true

        /** @type {import('./model').ModelData} */ 
        let model
        try {
            model = JSON.parse(fs.readFileSync(Path.join(inputFolder, file), 'utf8'))
        } catch (error) {
            console.error(error)
            continue
        }

        const parent = Utils.GetAsset(model.parent)

        parent.namespace = parent.namespace ?? 'minecraft'

        if (parent.namespace !== 'minecraft') {
            console.warn(`[PackConverter]: Unknown namespace "${parent.namespace}"`)
            success = false
            break
        }

        if (parent.relativePath) {
            const parentPath = Path.join(outputNamespaceFolder, parent.relativePath)

            if (parent.relativePath !== 'item/generated' && !fs.existsSync(parentPath + '.json')) {
                console.warn(`[PackConverter]: Parent "${parent.relativePath}" for model "${Path.basename(inputFolder)}/${name}" not found`)
                success = false
                continue
            }

            let convertedParent = Evaluate(changes, Path.basename(parentPath))

            if (!convertedParent) {
                if (base.includes(Path.basename(parentPath))) {
                    convertedParent = Path.basename(parentPath)
                }
            }

            if (convertedParent) {
                model.parent = Path.join(Path.dirname(parent.relativePath), convertedParent).replace(/\\/g, '/')
            }
        }

        model.textures = model.textures ?? { }

        for (const texture in model.textures) {
            const asset = Utils.GetAsset(model.textures[texture])
            if (!asset.relativePath) continue

            asset.namespace = asset.namespace ?? 'minecraft'

            if (asset.namespace !== 'minecraft') {
                console.warn(`[PackConverter]: Unknown namespace "${asset.namespace}"`)
                success = false
                break
            }

            const relativePath = asset.relativePath
            
            const texturePath = Path.join(outputNamespaceFolder, 'textures', ConvertTexturePath(relativePath, outputFormat))

            if (!fs.existsSync(texturePath + '.png')) {
                const eeeeeee = Path.join(inputNamespaceFolder, 'textures', relativePath + '.png')
                if (!fs.existsSync(eeeeeee)) {
                    console.warn(`[PackConverter]: Texture "${asset.relativePath}" for model "${file}" not found`)
                    success = false
                    break
                } else {
                    CopyTextureWithOthers(
                        Path.join(inputNamespaceFolder, 'textures', Path.dirname(relativePath)),
                        Path.join(outputNamespaceFolder, 'textures', ConvertTexturePath(Path.dirname(relativePath), outputFormat)),
                        Path.basename(relativePath),
                        ConvertTexturePath(Path.basename(relativePath), outputFormat)
                        )
                    // fs.copyFileSync(eeeeeee, Path.join(outputNamespaceFolder, 'textures', ConvertTexturePath(relativePath, outputFormat) + '.png'))
                }
            }

            let convertedTexture = Evaluate(textureChanges, Path.basename(texturePath))

            if (!convertedTexture) {
                if (textureBase.includes(Path.basename(texturePath))) {
                    convertedTexture = Path.basename(texturePath)
                }
            }

            if (convertedTexture) {
                model.textures[texture] = Path.join(Path.dirname(relativePath), convertedTexture).replace(/\\/g, '/')
            } else {
                model.textures[texture] = ConvertTexturePath(asset.relativePath, outputFormat)
            }
        }

        if (!success) {
            continue
        }

        fs.writeFileSync(Path.join(outputFolder, targetModel + '.json'), JSON.stringify(model, null, ' '), 'utf8')
    }
}

/**
 * @param {import('./changes').Version} inputVersion
 * @param {import('./changes').Version} outputVersion
 * @param {string} input
 * @param {string} output
 */
function Convert(inputVersion, outputVersion, input, output) {
    const inputFormat = VersionToPackFormat[inputVersion]
    const outputFormat = VersionToPackFormat[outputVersion]

    if (!inputFormat) {
        throw new Error(`Failed to get pack format from version ${inputVersion}`)
    }

    if (!outputFormat) {
        throw new Error(`Failed to get pack format from version ${outputVersion}`)
    }

    if (inputFormat == outputFormat) {
        throw new Error(`Pack formats are the same`)
    }

    if (!fs.existsSync(output)) { fs.mkdirSync(output, { recursive: true }) }

    fs.writeFileSync(Path.join(output, 'pack.mcmeta'), JSON.stringify({
        pack: {
            description: 'Generated',
            pack_format: outputFormat,
        }
    }, null, ' '), 'utf8')

    let changes = CollectPackChanges(inputVersion, outputVersion)
    const base = GetDefaultPack(outputVersion)

    const inputMinecraft = Path.join(input, 'assets', 'minecraft')
    const outputMinecraft = Path.join(output, 'assets', 'minecraft')

    if (!fs.existsSync(outputMinecraft)) { fs.mkdirSync(outputMinecraft, { recursive: true }) }

    const inputTextures = Path.join(inputMinecraft, 'textures')
    const outputTextures = Path.join(outputMinecraft, 'textures')

    if (!fs.existsSync(outputTextures)) { fs.mkdirSync(outputTextures, { recursive: true }) }

    const inputTexturesItem = Path.join(inputTextures, (inputFormat < 4) ? 'items' : 'item')
    const outputTexturesItem = Path.join(outputTextures, (outputFormat < 4) ? 'items' : 'item')

    ConvertTextures(inputTexturesItem, outputTexturesItem, changes.textures.item, base.textures.item)

    const inputTexturesBlock = Path.join(inputTextures, (inputFormat < 4) ? 'blocks' : 'block')
    const outputTexturesBlock = Path.join(outputTextures, (outputFormat < 4) ? 'blocks' : 'block')

    ConvertTextures(inputTexturesBlock, outputTexturesBlock, changes.textures.block, base.textures.block)

    const inputModels = Path.join(inputMinecraft, 'models')
    const outputModels = Path.join(outputMinecraft, 'models')

    if (!fs.existsSync(outputModels)) { fs.mkdirSync(outputModels, { recursive: true }) }

    const inputModelsItem = Path.join(inputModels, 'item')
    const outputModelsItem = Path.join(outputModels, 'item')

    ConvertModels(inputModelsItem, outputModelsItem, changes.models.item, base.models.item, inputMinecraft, outputMinecraft, changes.textures.item, base.textures.item, outputFormat)

    return
    
    const inputModelsBlock = Path.join(inputModels, 'block')
    const outputModelsBlock = Path.join(outputModels, 'block')

    if (fs.existsSync(inputModelsBlock)) {
        if (!fs.existsSync(outputModelsBlock)) { fs.mkdirSync(outputModelsBlock, { recursive: true }) }
        const files = fs.readdirSync(inputModelsBlock)

        for (const file of files) {
            const ext = file.split('.')[file.split('.').length - 1]
            if (ext !== 'json') { continue }
            const name = file.substring(0, file.length - 5)

            const currentModel = name
            let targetModel = Evaluate(changes.models.block, currentModel)

            if (!targetModel) {
                if (base.models.block.includes(currentModel)) {
                    targetModel = currentModel
                }
            }

            if (targetModel) {
                fs.copyFileSync(Path.join(inputModelsBlock, currentModel + '.json'), Path.join(outputModelsBlock, targetModel + '.json'))
            }
        }
    }
}

module.exports = {
    Convert,
}
