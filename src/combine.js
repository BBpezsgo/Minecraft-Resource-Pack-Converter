const fs = require('fs')
const path = require('path')
const archiver = require('archiver')
const Progress = require('./progress')
const jimp = require('jimp')
const utils = require('./utils')
const crypto = require('crypto')
const JSON5 = require('json5')
const Properties = require('./properties-file')
const { ResourcePackAny } = require('./pack')

/**
 * @typedef {{
 *   outputZip: string
 *   input: Array<string>
 *   compression?: number
 *   defaultPack?: ResourcePackAny
 *   logWarnings?: boolean
 * }} CombineSettings
 */

/**
 * @typedef {{
 *   name: string
 * } & ({
 *   filePath: string
 * } | {
 *   data: string | Buffer
 * })} Entry
 */

module.exports = async function(/** @type {CombineSettings} */ settings) {
    const compress = true
    const removeCredits = true
    
    /**
     * @type {Array<Entry>}
     */
    const filesToArchive = [ ]

    /**
     * @param {string} filePath
     */
    function willFileExists(filePath) {
        filePath = filePath.replace(/\//g, '\\')
        for (const fileToArchive of filesToArchive) {
            if (fileToArchive.name.replace(/\//g, '\\') === filePath) {
                return true
            }
        }
        if (settings.defaultPack && settings.defaultPack.getContent(filePath)) {
            return true
        }
        return false
    }

    /**
     * @param {number} length
     */
    function nonceFilename(length) {
        // 'a-z0-9/._-'
        const validCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789._-'
        let result = ''
        for (let i = 0; i < length; i++) {
            const randomI = crypto.randomInt(validCharacters.length)
            if (!validCharacters[randomI]) {
                throw new Error('What?')
            }
            result += validCharacters[randomI]
        }
        return result
    }

    /**
     * @param {Entry} entry
     */
    function pushEntry(entry) {
        let overrided = false
        for (let i = 0; i < filesToArchive.length; i++) {
            const fileToArchive = filesToArchive[i]
            if (fileToArchive.name !== entry.name) { continue }

            filesToArchive[i] = entry
            overrided = true

            break
        }
        
        if (!overrided) {
            filesToArchive.push(entry)
        }
    }

    const sharedStart = utils.sharedStart(...settings.input)

    /**
     * @type {Array<string>}
     */
    const overlayedFiles = [ ]

    console.log('[Combine]: Combining files ...')
    for (const pack of settings.input) {
        if (!fs.existsSync(pack)) {
            console.warn(`[Combine]: Pack does not exists: "${pack}"`)
            continue
        }

        if (!fs.lstatSync(pack).isDirectory()) {
            console.warn(`[Combine]: Pack isn't a directory: "${pack}"`)
            continue
        }

        // @ts-ignore
        const content = fs.readdirSync(pack, { encoding: 'utf8', recursive: true })

        for (const fileName of content) {
            const fullPath = path.join(pack, fileName)
            if (!fs.lstatSync(fullPath).isFile()) { continue }
            if (fileName === 'credits.txt') { continue }

            /*
            if (overlayedFiles.includes(fullPath)) {
                continue
            }

            if (fileName.endsWith('.overlay.json')) {
                const overlayInfo = JSON5.parse(fs.readFileSync(fullPath, 'utf8'))
                let overlayPath = null
                if (typeof overlayInfo === 'object') {
                    if ('overlay' in overlayInfo && overlayInfo.overlay) {
                        if (typeof overlayInfo.overlay === 'string') {
                            overlayPath = path.join(path.dirname(fullPath), overlayInfo.overlay)
                        }
                    }
                }

                if (!overlayPath) {
                    console.warn(`[Overlaying]: Invalid overlay in "${fullPath}"`)
                    continue
                }

                const imagePath = fileName.substring(0, fileName.length - 13)
                const imageFullPath = fullPath.substring(0, fullPath.length - 13)

                if (!fs.existsSync(imageFullPath)) {
                    console.warn(`[Overlaying]: Overlay base "${imageFullPath}" not found`)
                    continue
                }
            
                if (!fs.lstatSync(imageFullPath).isFile()) {
                    console.warn(`[Overlaying]: Overlay base "${imageFullPath}" is not a file`)
                    continue
                }

                if (fs.existsSync(imageFullPath + '.mcmeta')) {
                    console.warn(`[Overlaying]: Overlay base "${imageFullPath}" is animated`)
                    continue
                }

                if (!fs.existsSync(overlayPath)) {
                    console.warn(`[Overlaying]: Overlay "${overlayPath}" not found`)
                    continue
                }

                if (!fs.lstatSync(overlayPath).isFile()) {
                    console.warn(`[Overlaying]: Overlay "${overlayPath}" is not a file`)
                    continue
                }

                const baseImg = await jimp.read(imageFullPath)
                const overlay = await jimp.read(overlayPath)

                if (baseImg.getWidth() !== overlay.getWidth()) {
                    console.warn(`[Overlaying]: Overlay (${overlay.getWidth()}) and base (${baseImg.getWidth()}) width doesn't match at "${overlayPath}"`)
                    continue
                }

                const overlayAnimationPath = path.join(overlayPath + '.mcmeta')

                if (fs.existsSync(overlayAnimationPath) && fs.lstatSync(overlayAnimationPath).isFile()) {
                    const overlayAnimation = JSON5.parse(fs.readFileSync(overlayAnimationPath, 'utf8'))
                    debugger
                } else {
                    if (baseImg.getHeight() !== overlay.getHeight()) {
                        console.warn(`[Overlaying]: Overlay (${overlay.getHeight()}) and base (${baseImg.getHeight()}) height doesn't match at "${overlayPath}"`)
                        continue
                    }
                    const newImg = new jimp(baseImg.getWidth(), baseImg.getHeight())
                    newImg.blit(baseImg, 0, 0)
                    newImg.blit(overlay, 0, 0)
                    pushEntry({ name: imagePath, data: await newImg.getBufferAsync('image/png') })
                    overlayedFiles.push(imageFullPath)
                    overlayedFiles.push(overlayPath)
                }
                continue
            }
            */

            pushEntry({ name: fileName, filePath: fullPath })
        }
    }

    {
        /**
         * @type {import('./basic').Map<string, import('./blockstate').Blockstate>}
         */
        const blockstates = { }

        for (const pack of settings.input) {
            const blockstatesPath = path.join(pack, 'assets', 'minecraft', 'blockstates')
            if (!fs.existsSync(blockstatesPath)) { continue }
            if (!fs.lstatSync(blockstatesPath).isDirectory()) { continue }

            const content = fs.readdirSync(blockstatesPath, { encoding: 'utf8', recursive: false })

            for (const fileName of content) {
                const fullPath = path.join(blockstatesPath, fileName)
                if (!fs.lstatSync(fullPath).isFile()) { continue }
                if (!fileName.endsWith('.json')) {
                    console.warn(`[Combine]: Blockstate isn't a json file: "${fullPath}"`)
                    continue
                }

                const blockstateName = fileName.substring(0, fileName.length - '.json'.length)

                /** @type {import('./blockstate').Blockstate} */
                const blockstate1 = JSON5.parse(fs.readFileSync(fullPath, 'utf8'))

                if (!(blockstateName in blockstates)) {
                    blockstates[blockstateName] = blockstate1
                    continue
                }
                
                const blockstate2 = blockstates[blockstateName]
                if ('variants' in blockstate2 &&
                    'variants' in blockstate1) {
                    /** @type {import('./blockstate').BlockstateVariants} */
                    const newBlockstate = JSON.parse(JSON.stringify(blockstate2))
                    for (const newVariantName in blockstate1.variants) {
                        let newVariant = blockstate1.variants[newVariantName]
                        if (!Array.isArray(newVariant)) { newVariant = [ newVariant ] }
                        for (const newVariantItem of newVariant) {
                            const namespace = newVariantItem.model.includes(':') ? newVariantItem.model.split(':')[0] : 'minecraft'
                            const _path = newVariantItem.model.includes(':') ? newVariantItem.model.split(':')[1] : newVariantItem.model
                            const newModelFullPath = path.join(pack, 'assets', namespace, 'models', _path)
                            if (!fs.existsSync(newModelFullPath + '.json')) {
                                if (settings.logWarnings) {
                                    if (willFileExists(path.join('assets', namespace, 'models', _path + '.json'))) {
                                        // console.log(`[Combine]: Model not found: "${(newModelFullPath + '.json').replace(sharedStart, '')}"`)
                                    } else {
                                        console.warn(`[Combine]: Model not found: "${(newModelFullPath + '.json').replace(sharedStart, '')}"`)
                                    }
                                }
                                continue
                            }
                            const suffix = '_' + nonceFilename(16)
                            newVariantItem.model += suffix
                            filesToArchive.push({
                                name: path.join('assets', namespace, 'models', _path + suffix + '.json'),
                                data: compress ?
                                    JSON.stringify(JSON5.parse(fs.readFileSync(newModelFullPath + '.json', 'utf8'))) :
                                    fs.readFileSync(newModelFullPath + '.json', 'utf8'),
                            })
                        }
                        if (newVariantName in newBlockstate.variants) {
                            const newVariants = newBlockstate.variants[newVariantName]
                            if (Array.isArray(newVariants)) {
                                newVariants.push(...newVariant)
                            } else {
                                newBlockstate.variants[newVariantName] = [
                                    newVariants,
                                    ...newVariant,
                                ]
                                // @ts-ignore
                                newBlockstate.__isCombined = true
                            }
                        } else {
                            newBlockstate.variants[newVariantName] = newVariant
                        }
                    }
                    blockstates[blockstateName] = newBlockstate
                } else {
                    console.warn(`[Combine]: :(`)
                }
            }
        }

        for (const name in blockstates) {
            const blockstateFullPath = path.join('assets', 'minecraft', 'blockstates', name + '.json')
            const blockstate = blockstates[name]
            let overrided = false
            const data = JSON.stringify(blockstate, null, ' ')

            if (settings.logWarnings) {
                if ('variants' in blockstate) {
                    for (const _variants of Object.values(blockstate.variants)) {
                        const variants = Array.isArray(_variants) ? _variants : [ _variants ]
                        for (const model of variants) {
                            const namespace = model.model.includes(':') ? model.model.split(':')[0] : 'minecraft'
                            const _path = model.model.includes(':') ? model.model.split(':')[1] : model.model
                            const modelPath = path.join('assets', namespace, 'models', _path) + '.json'
                            if (!willFileExists(modelPath)) {
                                console.warn(`[Combine]: Model will not exists: "${modelPath}"`)
                            }
                        }
                    }
                }
            }

            for (let i = 0; i < filesToArchive.length; i++) {
                let fileToArchive = filesToArchive[i]
                if (fileToArchive.name !== blockstateFullPath) { continue }
                filesToArchive[i] = {
                    name: fileToArchive.name,
                    data: data,
                }
                overrided = true
                break
            }
            
            if (!overrided) {
                filesToArchive.push({ name: blockstateFullPath, data: data })
            }
        }
    }

    {
        /**
         * @type {{ [lang: string]: { [key: string]: string } }}
         */
        const langs = { }

        for (const pack of settings.input) {
            const langPath = path.join(pack, 'assets', 'minecraft', 'lang')
            if (!fs.existsSync(langPath)) { continue }
            if (!fs.lstatSync(langPath).isDirectory()) { continue }

            const content = fs.readdirSync(langPath, { encoding: 'utf8', recursive: false })

            for (const fileName of content) {
                const fullPath = path.join(pack, 'assets', 'minecraft', 'lang', fileName)
                if (!fs.lstatSync(fullPath).isFile()) { continue }
                if (!fileName.endsWith('.json')) { continue }

                const langName = fileName.replace('.json', '')
                const rawLang = fs.readFileSync(fullPath, 'utf8')
                /** @type {{ [key: string]: string }} */
                const lang = JSON5.parse(rawLang)

                if (langName in langs) {
                    const oldLang = langs[langName]
                    for (const key in lang) {
                        oldLang[key] = lang[key]
                    }
                } else {
                    langs[langName] = lang
                }
            }
        }

        for (const name in langs) {
            const item = path.join('assets', 'minecraft', 'lang', name + '.json')
            let overrided = false
            const data = JSON.stringify(langs[name], null, ' ')

            for (let i = 0; i < filesToArchive.length; i++) {
                let fileToArchive = filesToArchive[i]
                if (fileToArchive.name !== item) { continue }
                filesToArchive[i] = {
                    name: fileToArchive.name,
                    data: data,
                }
                overrided = true
                break
            }
            
            if (!overrided) {
                filesToArchive.push({ name: item, data: data })
            }
        }
    }

    {
        /**
         * @type {{ [font: string]: import('./pack-types').Font }}
         */
        const fonts = { }

        for (const pack of settings.input) {
            const fontsPath = path.join(pack, 'assets', 'minecraft', 'font')
            if (!fs.existsSync(fontsPath)) { continue }
            if (!fs.lstatSync(fontsPath).isDirectory()) { continue }

            const content = fs.readdirSync(fontsPath, { encoding: 'utf8', recursive: false })

            for (const fileName of content) {
                const fullPath = path.join(pack, 'assets', 'minecraft', 'font', fileName)
                if (!fs.lstatSync(fullPath).isFile()) { continue }
                if (!fileName.endsWith('.json')) { continue }
                const fontName = fileName.replace('.json', '')
                const rawFont = fs.readFileSync(fullPath, 'utf8')
                /** @type {import('./pack-types').Font} */
                const font = JSON5.parse(rawFont)

                if (fontName in fonts) {
                    const oldFont = fonts[fontName]
                    oldFont.providers.push(...font.providers)
                } else {
                    fonts[fontName] = font
                }
            }
        }

        for (const name in fonts) {
            const item = path.join('assets', 'minecraft', 'font', name + '.json')
            let overrided = false
            const data = JSON.stringify(fonts[name], null, ' ')

            for (let i = 0; i < filesToArchive.length; i++) {
                let fileToArchive = filesToArchive[i]
                if (fileToArchive.name !== item) { continue }
                filesToArchive[i] = {
                    name: fileToArchive.name,
                    data: data,
                }
                overrided = true
                break
            }
            
            if (!overrided) {
                filesToArchive.push({ name: item, data: data })
            }
        }
    }

    const archive = archiver('zip', {
        zlib: { level: settings.compression ?? 0 },
        comment: 'Minecraft Resource Pack',
    })

    archive.on('warning', function(/** @type {archiver.ArchiverError} */ err) {
        if (err.code === 'ENOENT') {
    
        } else {
            throw err
        }
    })
    
    archive.on('error', function(/** @type {archiver.ArchiverError} */ err) {
        throw err
    })
    
    const output = fs.createWriteStream(settings.outputZip)
    archive.pipe(output)

    for (const fileToArchive of filesToArchive) {
        if ('filePath' in fileToArchive) {
            if (compress && fileToArchive.filePath.endsWith('.xcf')) {
            } else if (compress && fileToArchive.filePath.endsWith('.json')) {
                const content = fs.readFileSync(fileToArchive.filePath, 'utf8')
                const parsedJson = JSON5.parse(content)
                if (removeCredits) {
                    if ('credit' in parsedJson) { delete parsedJson.credit }
                    if ('_comment' in parsedJson) { delete parsedJson._comment }
                }
                const stringifiedJson = JSON.stringify(parsedJson)
                archive.append(stringifiedJson, { name: fileToArchive.name })
            } else if (compress && fileToArchive.filePath.endsWith('.properties')) {
                const content = fs.readFileSync(fileToArchive.filePath, 'utf8')
                const parsedProperties = Properties.parse(content)
                const stringifiedProperties = Properties.stringify(parsedProperties)
                archive.append(stringifiedProperties, { name: fileToArchive.name })
            } else {
                archive.file(fileToArchive.filePath, { name: fileToArchive.name })
            }
        } else {
            archive.append(fileToArchive.data, { name: fileToArchive.name })
        }
    }

    let lastProgressTime = performance.now()
    archive.on('progress', (progress) => {
        const now = performance.now()
        if (now - lastProgressTime < 5000) { return }
        lastProgressTime = now
        console.log(`[Archiving]: ${Progress.getPercentString(progress.entries.processed, progress.entries.total)}`)
    })
    archive.on('close', () => {
        console.log(`[Archiving]: Done`)
    })

    await archive.finalize()
}
