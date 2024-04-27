const fs = require('fs')
const Path = require('path')
const pack = require('./pack')
const Changes = require('./changes')
const { versionToPackFormat } = require('./pack')
const utils = require('./utils')
const UV = require('./uv')
const Jimp = require('jimp')

/**
 * @param {string} inputFolder
 * @param {string} outputFolder
 * @param {string} inputFile **Without extension!**
 * @param {string} outputFile **Without extension!**
 */
function copyTexture(inputFolder, outputFolder, inputFile, outputFile) {
    if (!fs.existsSync(inputFolder)) throw new Error('Input folder does not exists')

    const png = '.png'
    const mcm = '.mcmeta'
    const ems = '_e'

    let copies = { }

    if (!fs.existsSync(Path.join(inputFolder, inputFile + png))) throw new Error('Input file does not exists')

    if (!fs.existsSync(Path.dirname(Path.join(outputFolder, outputFile + png)))) { fs.mkdirSync(Path.dirname(Path.join(outputFolder, outputFile + png)), { recursive: true }) }

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
 * @param {string} folderPath
 * @param {string} fileName
 * @param {string} uv
 */
function applyUV(folderPath, fileName, uv) {
    const png = '.png'
    const ems = '_e'

    if (!fs.existsSync(Path.join(folderPath, fileName + png))) { return }

    let convertables = []

    convertables.push(Path.join(folderPath, fileName + png))

    if (fs.existsSync(Path.join(folderPath, fileName + ems + png))) {
        convertables.push(Path.join(folderPath, fileName + ems + png))
    }
    
    const uvPath = Path.join(utils.paths.uvs, uv + '.png')
    if (!fs.existsSync(uvPath)) {
        console.error(`UV texture "${uv}" not found`)
        return
    }

    for (const convertable of convertables) {
        UV.applyUVFile(uvPath, convertable, convertable)
            .catch(console.error)
    }
}

/**
 * @param {string} hex
 */
function HEX2RGB(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : null;
  }

/**
 * @param {string} folderPath
 * @param {string} fileName
 * @param {`#${string}`} tint
 */
function addTint(folderPath, fileName, tint) {
    const png = '.png'
    const ems = '_e'

    if (!fs.existsSync(Path.join(folderPath, fileName + png))) { return }

    let convertables = []

    convertables.push(Path.join(folderPath, fileName + png))

    if (fs.existsSync(Path.join(folderPath, fileName + ems + png))) {
        convertables.push(Path.join(folderPath, fileName + ems + png))
    }
    
    for (const convertable of convertables) {
        Jimp.read(convertable)
            .then(img => {
                img.color([
                    {
                        // @ts-ignore
                        apply: 'mix',
                        params: [ HEX2RGB(tint), 60, ],
                    }
                ])
                img.writeAsync(convertable)
                    .catch(console.error)
            })
            .catch(console.error)
    }
}

/**
 * @param {string} folderPath
 * @param {string} fileName
 * @param {`#${string}`} tint
 */
function removeTint(folderPath, fileName, tint) {
    
}

/**
 * @param {string} directory
 * @param {string?} extension
 * @returns {string[]}
 */
function readDirRecursive(directory, extension = null) {
    const result = []
    
    const Do = function(/** @type {string[]} */ ...pathElements) {
        const content = fs.readdirSync(Path.join(directory, ...pathElements))

        for (const element of content) {
            const elementPath = Path.join(directory, ...pathElements, element)
            if (fs.statSync(elementPath).isDirectory()) {
                Do(...pathElements, element)
                continue
            }
            if (!fs.statSync(elementPath).isFile()) { continue }

            const ext = element.split('.')[element.split('.').length - 1]

            if (extension && ext !== extension) { continue }

            const name = element.substring(0, element.length - 1 - ext.length)
            
            let id = ''
            if (pathElements.length > 0) {
                id += (pathElements.join('/') + '/')
            }
            id += name

            result.push(id)
        }
    }

    Do()

    return result
}

/**
 * @param {string} inputFolder
 * @param {string} outputFolder
 * @param {Changes.StringChanges} changes
 * @param {string[]} base
 * @param {import('./basic').Map<string, string>} uvs
 * @param {Changes.SimpleChanges<import('./basic').Map<string, `#${string}`>>} tints
 * @param {boolean} copyUnknowns
 */
function convertTextures(inputFolder, outputFolder, changes, base, uvs, tints, copyUnknowns) {
    if (!fs.existsSync(inputFolder)) {
        return
    }

    if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder, { recursive: true })
    }

    const files = readDirRecursive(inputFolder, 'png')

    for (const currentTexture of files) {

        let targetTexture = Changes.evaluate(changes, currentTexture)

        if (targetTexture === null) { continue }

        if (targetTexture === undefined) {
            if (copyUnknowns || base.includes(currentTexture)) {
                targetTexture = currentTexture
            } else {
                continue
            }
        }

        copyTexture(inputFolder, outputFolder, currentTexture, targetTexture)

        const uv = uvs[targetTexture]
        if (uv) {
            applyUV(outputFolder, targetTexture, uv)
        }

        /** @type {`#${string}` | undefined} */
        const tintAdded = tints.Added[targetTexture]
        /** @type {`#${string}` | undefined} */
        const tintRemoved = tints.Deleted[targetTexture]

        if (tintAdded && tintRemoved) {

        } else if (tintAdded) {
            addTint(outputFolder, targetTexture, tintAdded)
        } else if (tintRemoved) {
            removeTint(outputFolder, targetTexture, tintRemoved)
        }
    }
}

/**
 * @param {string} path
 * @param {number} format
 */
function convertTexturePath(path, format) {
    if (format < 4) {
        return path.replace('block/', 'blocks/').replace('item/', 'items/')
    } else {
        return path.replace('blocks/', 'block/').replace('items/', 'item/')
    }
}

/**
 * @param {string} relativePath ie.: "block/stone"
 * 
 * @param {string} inputAssetsFolder Must be fully qualified
 * @param {string} outputAssetsFolder Must be fully qualified
 * 
 * @param {string} namespace ie.: "minecraft"
 * 
 * @param {import('./changes').PackChanges} changes
 * @param {import('./changes').PackStructure<string[]>} base
 * 
 * @param {import('./pack').PackFormat} outputFormat
 */
function convertModel(relativePath, inputAssetsFolder, outputAssetsFolder, namespace, changes, base, outputFormat, force = false) {
    const kind = relativePath.split('/')[0]

    if (kind !== 'item' && kind !== 'block') {
        console.error(`[PackConverter]: Unknown model kind "${kind}"`)
        return
    }

    const filename = Path.basename(relativePath)

    let outputFilename = Changes.evaluate(changes.models[kind], filename)
    if (outputFilename === undefined) {
        if (!base.models[kind].includes(filename)) {
            console.log(`[PackConverter]: Unknown model "${relativePath}"`)
        }
        outputFilename = filename
    }
    if (!outputFilename) {
        if (force) {
            outputFilename = filename
        } else {
            return
        }
    }

    /** @type {import('./model').AnyModel} */ 
    let model
    try { model = JSON.parse(fs.readFileSync(Path.join(inputAssetsFolder, namespace, 'models', relativePath + '.json'), 'utf8')) }
    catch (error) {
        console.error(error)
        return
    }

    if (model.parent) {
        const parent = utils.getAsset(model.parent, namespace)

        const parentName = Path.basename(parent.relativePath)
        const parentKind = Path.dirname(parent.relativePath).split('/')[0]

        if (parentKind === 'builtin') {
            
        } else if (parentKind !== 'item' && parentKind !== 'block') {
            console.warn(`[PackConverter]: Unknown model directory name "${parentKind}" in model "${relativePath}"`)
        } else {
            let convertedParent = Changes.evaluate(changes.models[parentKind], parentName)
    
            if (convertedParent === undefined && base.models[kind].includes(parentName)) {
                convertedParent = parentName
            }

            if (convertedParent === null) {
                const parentPath = Path.join(inputAssetsFolder, parent.namespace, 'models', parent.relativePath + '.json')
                if (fs.existsSync(parentPath)) {
                    convertModel(
                        parent.relativePath,
                        inputAssetsFolder,
                        outputAssetsFolder,
                        parent.namespace,
                        changes,
                        base,
                        outputFormat,
                        true
                    )
                    console.log(`[PackConverter]: Model "${parent.relativePath}" has been force-copied because the model "${relativePath}" needs it`)
                } else {
                    console.warn(`[PackConverter]: Model "${parent.relativePath}" has been deleted but the model "${relativePath}" needs it`)
                }
            }
            
            if (convertedParent) {
                model.parent = Path.join(Path.dirname(parent.relativePath), convertedParent).replace(/\\/g, '/')
            }
        }
    }

    if (model.textures) for (const texture in model.textures) {
        const asset = utils.getAsset(model.textures[texture], 'minecraft')

        if (asset.relativePath.startsWith('#')) continue

        if (asset.namespace !== 'minecraft') {
            console.warn(`[PackConverter]: Unknown texture namespace "${asset.namespace}" in model "${relativePath}", skipping texture ...`)
            continue
        }

        const textureKind = Path.dirname(asset.relativePath).split('/')[0]

        if (textureKind !== 'item' && textureKind !== 'block') {
            console.warn(`[PackConverter]: Unknown texture directory name "${textureKind}" in model "${relativePath}", skipping texture ...`)
            continue
        }

        const inputTexturePath = Path.join(inputAssetsFolder, namespace, 'textures', asset.relativePath + '.png')

        /*
        if (!fs.existsSync(inputTexturePath)) {
            console.warn(`[PackConverter]: Texture "${asset.relativePath}" for model "${fileID}" not found, skipping texture ...`)
            continue
        }
        */

        const relativePathOriginal = asset.relativePath
        let relativePathConverted = convertTexturePath(relativePathOriginal, outputFormat)

        let convertedTexture = Changes.evaluate(changes.textures[textureKind], Path.basename(relativePathOriginal))

        if (convertedTexture === null) {
            console.log(`[PackConverter]: Texture "${relativePathOriginal}" has been deleted but the model "${relativePath}" needs it`)
            convertedTexture = Path.basename(relativePathOriginal)
        }

        if (convertedTexture === undefined) {
            if (base.textures[textureKind].includes(Path.basename(relativePathOriginal))) {
                convertedTexture = Path.basename(relativePathOriginal)
            }
        }

        if (convertedTexture) {
            relativePathConverted = Path.join(Path.dirname(convertTexturePath(relativePathOriginal, outputFormat)), convertedTexture).replace(/\\/g, '/')
            model.textures[texture] = relativePathConverted
        }

        const outputTexturePath = Path.join(outputAssetsFolder, namespace, 'textures', relativePathConverted) + '.png'
        // @ts-ignore
        model.textures[texture] = ConvertTexturePath(model.textures[texture], outputFormat)

        if (!fs.existsSync(outputTexturePath)) {
            if (!fs.existsSync(inputTexturePath)) {
                if (convertedTexture && base.textures[textureKind].includes(convertedTexture)) {
                    // console.log(`[PackConverter]: Original texture "${asset.relativePath}" for model "${relativePath}" not found`)
                } else {
                    // console.warn(`[PackConverter]: Original texture "${asset.relativePath}" for model "${relativePath}" not found`)
                }
            } else {
                console.log(`[PackConverter]: Converted texture "${relativePathConverted}" for model "${relativePath}" not found, copy non-converted texture`)
                copyTexture(
                        Path.join(inputAssetsFolder, namespace, 'textures', Path.dirname(relativePathOriginal)),
                        Path.join(outputAssetsFolder, namespace, 'textures', Path.dirname(relativePathConverted)),
                        Path.basename(relativePathOriginal),
                        Path.basename(relativePathConverted)
                    )
            }
        }
    }

    fs.writeFileSync(Path.join(outputAssetsFolder, namespace, 'models', kind, outputFilename + '.json'), JSON.stringify(model, null, ' '), 'utf8')
}

/**
 * @param {'item' | 'block'} kind
 * 
 * @param {string} inputAssetsFolder
 * @param {string} outputAssetsFolder
 * 
 * @param {string} namespace
 * 
 * @param {import('./changes').PackChanges} changes
 * @param {import('./changes').PackStructure<string[]>} base
 * 
 * @param {import('./pack').PackFormat} outputFormat
 */
function convertModels(kind, inputAssetsFolder, outputAssetsFolder, namespace, changes, base, outputFormat) {
    if (!fs.existsSync(inputAssetsFolder)) {
        return
    }

    if (!fs.existsSync(Path.join(outputAssetsFolder, namespace, 'models', kind))) {
        fs.mkdirSync(Path.join(outputAssetsFolder, namespace, 'models', kind), { recursive: true })
    }

    const files = fs.readdirSync(Path.join(inputAssetsFolder, namespace, 'models', kind))

    for (const file of files) {
        const ext = file.split('.')[file.split('.').length - 1]
        if (ext !== 'json') { continue }
        const filename = file.substring(0, file.length - 5)

        convertModel(
            kind + '/' + filename,
            inputAssetsFolder,
            outputAssetsFolder,
            namespace,
            changes,
            base,
            outputFormat,
            false
        )
    }
}

/**
 * @param {string} inputAssetsFolder
 * @param {string} outputAssetsFolder
 * 
 * @param {string} resourcePath
 * 
 * @param {import('./changes').PackChanges} changes
 * @param {import('./changes').PackStructure<string[]>} base
 */
function convertModelName(inputAssetsFolder, outputAssetsFolder, resourcePath, changes, base, namespace = 'minecraft') {
    let model = utils.getAsset(resourcePath, namespace)
    const modelName = Path.basename(model.relativePath)
    const type = model.relativePath.split('/')[0]
    
    if (model.relativePath === type + '/' + modelName) {
        let convertedModelName = Changes.evaluate(changes.models['block'], modelName)

        if (convertedModelName === undefined && base.models['block'].includes(modelName)) {
            convertedModelName = modelName
        }
        
        if (convertedModelName) {
            const convertedModel = Path.join(Path.dirname(model.relativePath), convertedModelName).replace(/\\/g, '/')
            if (!fs.existsSync(Path.join(inputAssetsFolder, model.namespace, 'models', convertedModel + '.json'))) {
                console.warn(`[PackConverter]: Model ${model.namespace}:${convertedModel} not found`)
            }
            return `${model.namespace}:${convertedModel}`
        }
    } else {
        return `${model.namespace}:${model.relativePath}`
    }

}
/**
 * @param {string} inputAssetsFolder
 * @param {string} outputAssetsFolder
 * 
 * @param {string} namespace
 * 
 * @param {import('./changes').PackChanges} changes
 * @param {import('./changes').PackStructure<string[]>} base
 * 
 * @param {import('./pack').PackFormat} outputFormat
 */
function convertBlockstates(inputAssetsFolder, outputAssetsFolder, namespace, changes, base, outputFormat) {
    const files = fs.readdirSync(Path.join(inputAssetsFolder, 'minecraft', 'blockstates'))
    for (const file of files) {
        if (!file.endsWith('.json')) { continue }
        const filePath = Path.join(inputAssetsFolder, 'minecraft', 'blockstates', file)
        const contentText = fs.readFileSync(filePath, 'utf8')
        try {
            /** @type {import('./blockstate').Blockstate} */
            const content = JSON.parse(contentText)   
            
            if (typeof content !== 'object') {
                console.warn(`[PackConverter]: Blockstate is not an object (\"${filePath}\")`)
                continue
            }
            
            if ('multipart' in content) {
                for (let i = 0; i < content.multipart.length; i++) {
                    const multipart = content.multipart[i]
                    if (!multipart.apply) debugger
                    if (Array.isArray(multipart.apply)) {
                        for (let j = 0; j < multipart.apply.length; j++) {
                            const apply = multipart.apply[j]
                            if (!apply.model) debugger

                            const _p = parsePath(apply.model)

                            convertModel(
                                _p.path,
                                inputAssetsFolder,
                                outputAssetsFolder,
                                _p.namespace ?? namespace,
                                changes,
                                base,
                                outputFormat)

                            let convertedModel = convertModelName(inputAssetsFolder, outputAssetsFolder, apply.model, changes, base)
                        
                            if (convertedModel && normalizePath(convertedModel) !== normalizePath(apply.model)) {
                                debugger
                            }
                        }
                    } else {
                        if (!multipart.apply.model) debugger
                        
                        const _p = parsePath(multipart.apply.model)

                        convertModel(
                            _p.path,
                            inputAssetsFolder,
                            outputAssetsFolder,
                            _p.namespace ?? namespace,
                            changes,
                            base,
                            outputFormat)

                        let convertedModel = convertModelName(inputAssetsFolder, outputAssetsFolder, multipart.apply.model, changes, base)
                                                
                        if (convertedModel && normalizePath(convertedModel) !== normalizePath(multipart.apply.model)) {
                            debugger
                        }
                    }
                }
            } else if ('variants' in content) {

            } else if ('parent' in content) {
                
            }
        } catch (error) { console.error(error) }
    }
}

/**
 * @param {import('./changes').Version} inputVersion
 * @param {import('./changes').Version} outputVersion
 * @param {string} input
 * @param {string} output
 */
function convert(inputVersion, outputVersion, input, output) {
    const inputFormat = versionToPackFormat[inputVersion]
    const outputFormat = versionToPackFormat[outputVersion]

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

    const changes = Changes.collectPackChanges(inputVersion, outputVersion)
    const base = pack.getDefaultPack(outputVersion)

    if (!fs.existsSync(outputMinecraft)) { fs.mkdirSync(outputMinecraft, { recursive: true }) }

    const inputTextures = Path.join(inputMinecraft, 'textures')
    const outputTextures = Path.join(outputMinecraft, 'textures')

    if (!fs.existsSync(outputTextures)) { fs.mkdirSync(outputTextures, { recursive: true }) }

    const inputTexturesItem = Path.join(inputTextures, (inputFormat < 4) ? 'items' : 'item')
    const outputTexturesItem = Path.join(outputTextures, (outputFormat < 4) ? 'items' : 'item')

    convertTextures(inputTexturesItem, outputTexturesItem, changes.textures.item, base.textures.item, changes.uv.item, changes.tints.item, true)

    const inputTexturesBlock = Path.join(inputTextures, (inputFormat < 4) ? 'blocks' : 'block')
    const outputTexturesBlock = Path.join(outputTextures, (outputFormat < 4) ? 'blocks' : 'block')

    convertTextures(inputTexturesBlock, outputTexturesBlock, changes.textures.block, base.textures.block, changes.uv.block, changes.tints.block, true)

    const inputTexturesEntity = Path.join(inputTextures, 'entity')
    const outputTexturesEntity = Path.join(outputTextures, 'entity')

    convertTextures(inputTexturesEntity, outputTexturesEntity, changes.textures.entity, base.textures.entity, changes.uv.entity, changes.tints.entity, true)

    const inputTexturesGui = Path.join(inputTextures, 'gui')
    const outputTexturesGui = Path.join(outputTextures, 'gui')

    convertTextures(inputTexturesGui, outputTexturesGui, changes.textures.gui, base.textures.gui, changes.uv.gui, changes.tints.gui, false)

    const inputModels = Path.join(inputMinecraft, 'models')
    const outputModels = Path.join(outputMinecraft, 'models')

    if (!fs.existsSync(outputModels)) { fs.mkdirSync(outputModels, { recursive: true }) }

    const modelsKindBlock = 'block'
    convertModels(modelsKindBlock, Path.join(input, 'assets'), Path.join(output, 'assets'), 'minecraft', changes, base, outputFormat)

    const modelsKindItem = 'item'
    convertModels(modelsKindItem,  Path.join(input, 'assets'), Path.join(output, 'assets'), 'minecraft', changes, base, outputFormat)

    const inputBlockstates = Path.join(inputMinecraft, 'blockstates')
    const outputBlockstates = Path.join(outputMinecraft, 'blockstates')

    if (!fs.existsSync(outputBlockstates)) { fs.mkdirSync(outputBlockstates, { recursive: true }) }

    convertBlockstates(Path.join(input, 'assets'), Path.join(output, 'assets'), 'minecraft', changes, base, outputFormat)
}

/**
 * @param {string} path
 * @param {string} namespace
 */
function normalizePath(path, namespace = 'minecraft') {
    if (path.includes(':')) {
        return path
    } else {
        return namespace + ':' + path
    }
}

/**
 * @param {string} path
 * @returns {{ namespace: string | null, path: string }}
 */
function parsePath(path) {
    if (path.includes(':')) {
        const namespace = path.split(':')[0]
        const _path = path.substring(namespace.length + 1)
        return {
            namespace: namespace,
            path: _path,
        }
    } else {
        return {
            namespace: null,
            path: path,
        }
    }
}

module.exports = {
    convert,
}
