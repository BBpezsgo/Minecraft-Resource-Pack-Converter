const fs = require('fs')
const path = require('path')
const archiver = require('archiver')
const Progress = require('./progress')
const jimp = require('jimp')
const utils = require('./utils')
const JSON5 = require('json5')
const Properties = require('./properties-file')
const { ResourcePack, AssetEntryUtils } = require('./pack')

/**
 * @typedef {{
 *   outputZip: string
 *   input: Array<string>
 *   compression?: number
 *   defaultPack?: ResourcePack
 *   logWarnings?: boolean
 *   removeUnchanged?: boolean
 * }} CombineSettings
 */

// /** @typedef {{ name: string } & ({ filePath: string } | { data: string | Buffer })} Entry */
/** @typedef {import('./pack').NamedAssetEntry} Entry */

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
        filePath = filePath.replace(/\\/g, '/')
        for (const fileToArchive of filesToArchive) {
            if (fileToArchive.name.replace(/\\/g, '/') === filePath) {
                return true
            }
        }
        if (settings.defaultPack && settings.defaultPack.get(filePath, null)) {
            return true
        }
        return false
    }

    /**
     * @param {Entry} oldEntry
     * @param {Entry} newEntry
     */
    function getOverrideReadableText(oldEntry, newEntry) {
        const _old = (oldEntry.type === 'ref' ? oldEntry.file : null)?.replace(sharedStart, '')?.replace(/\\/g, '/')?.split('/')?.[0]
        const _new = (newEntry.type === 'ref' ? newEntry.file : null)?.replace(sharedStart, '')?.replace(/\\/g, '/')?.split('/')?.[0]
        if (_old) {
            if (_new) {
                return `"${_old}" --> "${_new}"`
            } else {
                return `"${_old}" --> <data>`
            }
        } else {
            if (_new) {
                return `<data> --> "${_new}"`
            } else {
                return `<data> --> <data>`
            }
        }
    }

    /**
     * @param {Entry} entry
     */
    function pushEntry(entry) {
        let overrided = false
        for (let i = 0; i < filesToArchive.length; i++) {
            const fileToArchive = filesToArchive[i]
            if (fileToArchive.name !== entry.name) { continue }

            if (fileToArchive.name.startsWith('assets/minecraft/optifine')) {
                console.warn(`[Combine]: Optifine combining not supported (${getOverrideReadableText(fileToArchive, entry)})`)
            }

            {
                const _old = (fileToArchive.type === 'ref' ? fileToArchive.file : null)?.replace(sharedStart, '')?.replace(/\\/g, '/')?.split('/')?.[0]
                const _new = (entry.type === 'ref' ? entry.file : null)?.replace(sharedStart, '')?.replace(/\\/g, '/')?.split('/')?.[0]
                if (_old) {
                    if (_new) {
                        console.log(`[Combine]: File overridden: "${entry.name}" ("${_old}" --> "${_new}")`)
                    } else {
                        console.log(`[Combine]: File overridden: "${entry.name}" ("${_old}" --> <data>)`)
                    }
                } else {
                    if (_new) {
                        console.log(`[Combine]: File overridden: "${entry.name}" (<data> --> "${_new}")`)
                    } else {
                        console.log(`[Combine]: File overridden: "${entry.name}" (<data> --> <data>)`)
                    }
                }
            }

            filesToArchive[i] = entry
            overrided = true

            break
        }
        
        if (!overrided) {
            filesToArchive.push(entry)
        }

        return overrided
    }

    /**
     * @param {Entry} entry
     */
    async function isChanged(entry) {
        const defaultContent = settings.defaultPack?.get(entry.name, null)
        if (!defaultContent) {
            return true
        }

        if (entry.name.endsWith('.json') || entry.name.endsWith('.mcmeta')) {
            const jsonA = AssetEntryUtils.getJson(defaultContent)
            const jsonB = AssetEntryUtils.getJson(entry)
            if (utils.deepEqual(jsonA, jsonB)) {
                return false
            }
        } else if (entry.name.endsWith('.png')) {
            const imgA = await AssetEntryUtils.getImage(defaultContent)
            const imgB = await AssetEntryUtils.getImage(entry)

            if (imgA.getWidth() !== imgB.getWidth()) { return true }
            if (imgA.getHeight() !== imgB.getHeight()) { return true }
            
            const distance = jimp.distance(imgA, imgB)
            if (distance !== 0) { return true }

            const diff = jimp.diff(imgA, imgB, 0)
            if (diff.percent !== 0) { return true }

            return false
        } else if (entry.name.endsWith('.fsh')) {
        } else if (entry.name.endsWith('.vsh')) {
        } else {
            debugger
        }

        return true
    }

    const sharedStart = utils.sharedStart(...settings.input)

    /**
     * @type {Array<string>}
     */
    const overlayedFiles = [ ]

    console.log('[Combine]: Combining assets ...')
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

            pushEntry({ name: fileName, file: fullPath, type: 'ref' })
        }
    }

    console.log('[Combine]: Combining blockstates ...')
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

                /**
                 * @param {import('./blockstate').Blockstate} blockstate
                 * @param {boolean} force
                 */
                function normalizeBlockstateWeights(blockstate, force) {
                    if (!('variants' in blockstate)) { return }

                    for (const key in blockstate.variants) {
                        const variant = blockstate.variants[key]
                        if (!Array.isArray(variant)) { continue }
                        let weights = [ ]
                        let areTooBig = false
                        for (let i = 0; i < variant.length; i++) {
                            const weight = variant[i].weight ?? 1
                            weights.push(weight)
                            if (weight > 1) { areTooBig = true }
                        }
                        if (areTooBig || force) {
                            const max = Math.max(...weights)
                            weights = weights.map(v => v / max)
                            for (let i = 0; i < variant.length; i++) {
                                variant[i].weight = weights[i]
                            }
                        }
                    }
                }

                /**
                 * Current blockstate
                 * @type {import('./blockstate').Blockstate}
                 */
                const blockstate1 = JSON5.parse(fs.readFileSync(fullPath, 'utf8'))
                // normalizeBlockstateWeights(blockstate1, true)

                /**
                 * Saved blockstate
                 */
                const blockstate2 = blockstates[blockstateName]

                if (!blockstate2 || blockstate1['no_combine'] === true) {
                    blockstates[blockstateName] = blockstate1
                    continue
                }

                if ('variants' in blockstate2) {
                    if (!('variants' in blockstate1)) {
                        console.warn(`[Combine]: :(`)
                        debugger
                        continue
                    }

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
                            const suffix = '_' + utils.nonceFilename(16)
                            newVariantItem.model += suffix
                            const overridden = pushEntry({
                                name: path.join('assets', namespace, 'models', _path + suffix + '.json'),
                                data: compress ?
                                    JSON.stringify(JSON5.parse(fs.readFileSync(newModelFullPath + '.json', 'utf8'))) :
                                    fs.readFileSync(newModelFullPath + '.json', 'utf8'),
                                type: 'text',
                            })
                            if (overridden) {
                                console.warn(`[Combine]: Generated file doesn't have a unique value`)
                            }
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
                    debugger
                }
            }
        }

        // for (const name in blockstates) {
        //     const blockstate = blockstates[name]
        //     if (!('variants' in blockstate)) { continue }
        //     for (const variantName in blockstate.variants) {
        //         const variant = blockstate.variants[variantName]
        //         if (!Array.isArray(variant)) { continue }
        //         for (const model of variant) {
        //             if (!model.weight) { continue }
        //             if (model.weight === 0) { continue }
        //             model.weight = Math.max(1, Math.round(model.weight * 100))
        //         }
        //     }
        // }

        if (settings.defaultPack) {
            const ah = settings.defaultPack.getNamespace('minecraft')
            if (ah) {
                for (const name in blockstates) {
                    if (!ah.get('blockstates', name + '.json')) {
                        console.warn(`[Combine]: Default blockstate "${name}" not found`)
                    }
                }
            }
        }

        for (const name in blockstates) {
            const blockstateFullPath = path.join('assets', 'minecraft', 'blockstates', name + '.json')
            const blockstate = blockstates[name]
            const data = JSON.stringify(blockstate)

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

            pushEntry({ name: blockstateFullPath, data: data, type: 'text' })
        }
    }

    console.log('[Combine]: Combining langs ...')
    {
        /**
         * @type {{ [namespace: string]: { [lang: string]: import('./pack-types').Language } }}
         */
        const langs = { }

        for (const pack of settings.input) {
            const assetsPath = path.join(pack, 'assets')
            if (!fs.existsSync(assetsPath)) { continue }
            const namespaces = fs.readdirSync(assetsPath)
            for (const namespace of namespaces) {
                const langPath = path.join(assetsPath, namespace, 'lang')
                if (!fs.existsSync(langPath)) { continue }
                if (!fs.lstatSync(langPath).isDirectory()) { continue }
    
                const content = fs.readdirSync(langPath, { encoding: 'utf8', recursive: false })
    
                for (const fileName of content) {
                    const fullPath = path.join(langPath, fileName)
                    if (!fs.lstatSync(fullPath).isFile()) { continue }
                    if (!fileName.endsWith('.json')) { continue }
    
                    const langName = fileName.replace('.json', '')
                    const rawLang = fs.readFileSync(fullPath, 'utf8')
                    /** @type {import('./pack-types').Language} */
                    const lang = JSON5.parse(rawLang)

                    langs[namespace] ??= { }
    
                    if (langName in langs[namespace]) {
                        const oldLang = langs[namespace][langName]
                        for (const key in lang) {
                            oldLang[key] = lang[key]
                        }
                    } else {
                        langs[namespace][langName] = lang
                    }
                }
            }
        }

        for (const namespace in langs) {
            const namespaceLangs = langs[namespace]
            for (const lang in namespaceLangs) {
                for (const key in namespaceLangs[lang]) {
                    let value = namespaceLangs[lang][key]
                    value = utils.insertStringVariables(value, v => {
                        if (v.includes(':')) {
                            const _namespace = v.split(':')[0]
                            v = v.substring(_namespace.length)
                            debugger
                            const _namespaceLangs = langs[_namespace]
                            for (const _langName in _namespaceLangs) {
                                const _langs = _namespaceLangs[_langName]
                                if (_langs[v]) {
                                    return _langs[v]
                                }
                            }
                        } else {
                            for (const _langName in namespaceLangs) {
                                const _langs = namespaceLangs[_langName]
                                if (_langs[v]) {
                                    return _langs[v]
                                }
                            }
                            for (const _namespace in langs) {
                                const _namespaceLangs = langs[_namespace]
                                for (const _langName in _namespaceLangs) {
                                    const _langs = _namespaceLangs[_langName]
                                    if (_langs[v]) {
                                        return _langs[v]
                                    }
                                }
                            }
                        }
                    })
                    namespaceLangs[lang][key] = value
                }
            }
        }

        for (const namespace in langs) {
            for (const langName in langs[namespace]) {
                const item = path.join('assets', namespace, 'lang', langName + '.json')
                const data = JSON.stringify(langs[namespace][langName])
                pushEntry({ name: item, data: data, type: 'text' })
            }
        }
    }

    console.log('[Combine]: Combining fonts ...')
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
            const data = JSON.stringify(fonts[name])

            pushEntry({ name: item, data: data, type: 'text' })
        }
    }

    console.log('[Combine]: Removing unnecessary entries ...')
    for (let i = filesToArchive.length - 1; i >= 0; i--) {
        const fileToArchive = filesToArchive[i]

        switch (fileToArchive.type) {
            case 'buffer':
                if (fileToArchive.data.length === 0) {
                    // console.log(`[Combine]: Removed empty buffer file "${fileToArchive.name}"`)
                    filesToArchive.splice(i, 1)
                    continue
                }
                break
            case 'json':
                if (!fileToArchive.data) {
                    // console.log(`[Combine]: Removed empty json file "${fileToArchive.name}"`)
                    filesToArchive.splice(i, 1)
                    continue
                }
                break
            case 'text':
                if (!fileToArchive.data) {
                    // console.log(`[Combine]: Removed empty text file "${fileToArchive.name}"`)
                    filesToArchive.splice(i, 1)
                    continue
                }
                break
            case 'ref':
                if (fs.statSync(fileToArchive.file).size === 0) {
                    // console.log(`[Combine]: Removed empty file "${fileToArchive.file}"`)
                    filesToArchive.splice(i, 1)
                    continue
                }
                if (fileToArchive.file.endsWith('.old') + path.extname(fileToArchive.file)) {
                    // console.log(`[Combine]: Removed old file "${fileToArchive.file}"`)
                    filesToArchive.splice(i, 1)
                    continue
                }
                break
        }

        if (settings.removeUnchanged) {
            if (!(await isChanged(fileToArchive))) {
                console.log(`[Combine]: Asset not changed`, fileToArchive)
                filesToArchive.splice(i, 1)
                continue
            }
        }

        if (fileToArchive.type === 'ref') {
            if (compress && fileToArchive.file.endsWith('.xcf')) {
                filesToArchive.splice(i, 1)
                continue
            }
        }
    }

    console.log('[Archiving]: ...')

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
        switch (fileToArchive.type) {
            case 'ref': {
                if (compress && fileToArchive.file.endsWith('.json')) {
                    const content = fs.readFileSync(fileToArchive.file, 'utf8')
                    const parsedJson = JSON5.parse(content)
                    if (removeCredits) {
                        if ('credit' in parsedJson) { delete parsedJson.credit }
                        if ('_comment' in parsedJson) { delete parsedJson._comment }
                    }
                    const stringifiedJson = JSON.stringify(parsedJson)
                    archive.append(stringifiedJson, { name: fileToArchive.name })
                } else if (compress && fileToArchive.file.endsWith('.properties')) {
                    const content = fs.readFileSync(fileToArchive.file, 'utf8')
                    const parsedProperties = Properties.parse(content)
                    const stringifiedProperties = Properties.stringify(parsedProperties)
                    archive.append(stringifiedProperties, { name: fileToArchive.name })
                } else {
                    archive.file(fileToArchive.file, { name: fileToArchive.name })
                }
                break
            }
            case 'buffer': {
                archive.append(fileToArchive.data, { name: fileToArchive.name })
                break
            }
            case 'text': {
                archive.append(fileToArchive.data, { name: fileToArchive.name })
                break
            }
            case 'image': {
                archive.append(await fileToArchive.data.getBufferAsync('image/png'), { name: fileToArchive.name })
                break
            }
            case 'json': {
                archive.append(JSON.stringify(fileToArchive.data), { name: fileToArchive.name })
                break
            }
            default: {
                throw new Error()
            }
        }
    }

    // let lastProgressTime = performance.now()
    // archive.on('progress', (progress) => {
    //     const now = performance.now()
    //     if (now - lastProgressTime < 5000) { return }
    //     lastProgressTime = now
    //     console.log(`[Archiving]: ${Progress.getPercentString(progress.entries.processed, progress.entries.total)}`)
    // })
    archive.on('close', () => {
        console.log(`[Archiving]: Done`)
    })

    await archive.finalize()
}
