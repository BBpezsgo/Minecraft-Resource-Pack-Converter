const fs = require('fs')
const Path = require('path')
const Pack = require('./pack')
const Changes = require('./changes')
const { VersionToPackFormat } = require('./pack')
const Utils = require('./utils')

/**
 * @param {string} inputFolder
 * @param {string} outputFolder
 * @param {string} inputFile **Without extension!**
 * @param {string} outputFile **Without extension!**
 */
function CopyTexture(inputFolder, outputFolder, inputFile, outputFile) {
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
        let targetTexture = Changes.Evaluate(changes, currentTexture)

        if (targetTexture === null) { continue }

        if (targetTexture === undefined) {
            targetTexture = currentTexture
        }

        CopyTexture(inputFolder, outputFolder, currentTexture, targetTexture)
    }
}

/**
 * @param {string} path
 * @param {number} format
 */
function ConvertTexturePath(path, format) {
    if (format < 4) {
        return path.replace('block/', 'blocks/').replace('item/', 'items/')
    } else {
        return path.replace('blocks/', 'block/').replace('items/', 'item/')
    }
}

/**
 * @param {'item' | 'block'} kind
 * 
 * @param {string} inputFolder
 * @param {string} outputFolder
 * 
 * @param {string} inputNamespaceFolder
 * @param {string} outputNamespaceFolder
 * 
 * @param {import('./changes').PackChanges} changes
 * @param {import('./changes').PackStructure<string[]>} base
 * 
 * @param {import('./pack').PackFormat} outputFormat
 */
function ConvertModels(kind, inputFolder, outputFolder, inputNamespaceFolder, outputNamespaceFolder, changes, base, outputFormat) {
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
        const filename = file.substring(0, file.length - 5)

        const fileID = `${Path.basename(inputFolder)}/${filename}`

        let outputFilename = Changes.Evaluate(changes.models[kind], filename)
        if (outputFilename === undefined) {
            outputFilename = filename
        }
        if (!outputFilename) { continue }

        /** @type {import('./model').ModelData} */ 
        let model
        try { model = JSON.parse(fs.readFileSync(Path.join(inputFolder, file), 'utf8')) }
        catch (error) {
            console.error(error)
            continue
        }

        if (model.parent) {
            const parent = Utils.GetAsset(model.parent, 'minecraft')
    
            if (parent.namespace !== 'minecraft') {
                console.warn(`[PackConverter]: Model "${fileID}" has unknown namespace "${parent.namespace}", skipping ...`)
                continue
            }
    
            const parentName = Path.basename(parent.relativePath)
            const parentKind = Path.dirname(parent.relativePath).split('/')[0]

            if (parentKind !== 'item' && parentKind !== 'block') {
                console.warn(`[PackConverter]: Unknown model directory name "${parentKind}" in model ${fileID}`)
            } else {
                /*
                const parentPath = Path.join(outputNamespaceFolder, parent.relativePath)
                if (parent.relativePath !== 'item/generated' && !fs.existsSync(parentPath + '.json')) {
                    console.warn(`[PackConverter]: Parent "${parent.relativePath}" for model "${fileID}" not found, skipping ...`)
                    continue
                }
                */
    
                let convertedParent = Changes.Evaluate(changes.models[parentKind], parentName)
        
                if (convertedParent === undefined && base.models[kind].includes(parentName)) {
                    convertedParent = parentName
                }
    
                if (convertedParent === null) {
                    console.warn(`[PackConverter]: Model "${parent.relativePath}" has been deleted but the model "${fileID}" needs it`)
                }
                
                if (convertedParent) {
                    model.parent = Path.join(Path.dirname(parent.relativePath), convertedParent).replace(/\\/g, '/')
                }
            }
        }

        if (model.textures) for (const texture in model.textures) {
            const asset = Utils.GetAsset(model.textures[texture], 'minecraft')

            if (asset.relativePath.startsWith('#')) continue

            if (asset.namespace !== 'minecraft') {
                console.warn(`[PackConverter]: Unknown texture namespace "${asset.namespace}" in model "${fileID}", skipping texture ...`)
                continue
            }

            const parentKind = Path.dirname(asset.relativePath).split('/')[0]

            if (parentKind !== 'item' && parentKind !== 'block') {
                console.warn(`[PackConverter]: Unknown texture directory name "${parentKind}" in model ${fileID}, skipping texture ...`)
                continue
            }

            const inputTexturePath = Path.join(inputNamespaceFolder, 'textures', asset.relativePath + '.png')

            /*
            if (!fs.existsSync(inputTexturePath)) {
                console.warn(`[PackConverter]: Texture "${asset.relativePath}" for model "${fileID}" not found, skipping texture ...`)
                continue
            }
            */

            const relativePathOriginal = asset.relativePath
            let relativePathConverted = ConvertTexturePath(relativePathOriginal, outputFormat)

            let convertedTexture = Changes.Evaluate(changes.textures[parentKind], Path.basename(relativePathOriginal))

            if (convertedTexture === null) {
                console.warn(`[PackConverter]: Texture "${relativePathOriginal}" has been deleted but the model "${fileID}" needs it`)
            }

            if (convertedTexture === undefined) {
                if (base.textures[kind].includes(Path.basename(relativePathOriginal))) {
                    convertedTexture = Path.basename(relativePathOriginal)
                }
            }

            if (convertedTexture) {
                relativePathConverted = Path.join(Path.dirname(ConvertTexturePath(relativePathOriginal, outputFormat)), convertedTexture).replace(/\\/g, '/')
                model.textures[texture] = relativePathConverted
            }

            const outputTexturePath = Path.join(outputNamespaceFolder, 'textures', relativePathConverted) + '.png'
            // @ts-ignore
            model.textures[texture] = ConvertTexturePath(model.textures[texture], outputFormat)

            if (!fs.existsSync(outputTexturePath)) {
                console.log(`[PackConverter]: Converted texture "${relativePathConverted}" for model "${file}" not found, copy non-converted texture`)
                
                if (!fs.existsSync(inputTexturePath)) {
                    console.warn(`[PackConverter]: Original texture "${asset.relativePath}" for model "${file}" not found`)
                } else {
                    CopyTexture(
                            Path.join(inputNamespaceFolder, 'textures', Path.dirname(relativePathOriginal)),
                            Path.join(outputNamespaceFolder, 'textures', Path.dirname(relativePathConverted)),
                            Path.basename(relativePathOriginal),
                            Path.basename(relativePathConverted)
                        )
                }
            }
        }

        fs.writeFileSync(Path.join(outputFolder, outputFilename + '.json'), JSON.stringify(model, null, ' '), 'utf8')
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

    if (!inputFormat) throw new Error(`Failed to get pack format from version ${inputVersion}`)
    if (!outputFormat) throw new Error(`Failed to get pack format from version ${outputVersion}`)

    if (inputFormat == outputFormat) throw new Error(`Pack formats are the same`)

    if (!fs.existsSync(output)) { fs.mkdirSync(output, { recursive: true }) }

    fs.writeFileSync(Path.join(output, 'pack.mcmeta'), JSON.stringify({
        pack: {
            description: 'Generated',
            pack_format: outputFormat,
        }
    }, null, ' '), 'utf8')

    const inputMinecraft = Path.join(input, 'assets', 'minecraft')
    const outputMinecraft = Path.join(output, 'assets', 'minecraft')

    if (!fs.existsSync(inputMinecraft)) {
        console.log(`[PackConverter]: Namespace "minecraft" not found`)
        return
    }

    const changes = Changes.CollectPackChanges(inputVersion, outputVersion)
    const base = Pack.GetDefaultPack(outputVersion)

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

    const modelsKindBlock = 'block'
    ConvertModels(modelsKindBlock, Path.join(inputModels, modelsKindBlock), Path.join(outputModels, modelsKindBlock), inputMinecraft, outputMinecraft, changes, base, outputFormat)

    const modelsKindItem = 'item'
    ConvertModels(modelsKindItem,  Path.join(inputModels, modelsKindItem),  Path.join(outputModels, modelsKindItem),  inputMinecraft, outputMinecraft, changes, base, outputFormat)
}

module.exports = {
    Convert,
}
