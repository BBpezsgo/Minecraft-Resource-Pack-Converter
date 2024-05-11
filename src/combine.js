const fs = require('fs')
const path = require('path')
const archiver = require('archiver')
const Progress = require('./progress')
const utils = require('./utils')
const crypto = require('crypto')
const JSON5 = require('json5')

module.exports = async function(/** @type {string} */ outputZip, /** @type {Array<string>} */ ...input) {
    const output = fs.createWriteStream(outputZip)
    
    /**
     * @type {Array<{ name: string; } & ({ filePath: string; } | { data: string; })>}
     */
    const filesToArchive = [ ]

    const sharedStart = utils.sharedStart(...input)

    for (const pack of input) {
        if (!fs.existsSync(pack)) {
            console.warn(`Does not exists: ${pack}`)
            continue
        }

        if (!fs.lstatSync(pack).isDirectory()) { continue }

        // @ts-ignore
        const content = fs.readdirSync(pack, { encoding: 'utf8', recursive: true })

        for (const item of content) {
            const fullPath = path.join(pack, item)
            if (!fs.lstatSync(fullPath).isFile()) { continue }

            let overrided = false
            for (const fileToArchive of filesToArchive) {
                if (fileToArchive.name !== item) { continue }
                if ('filePath' in fileToArchive) {
                    console.warn(`File overrided: "${fileToArchive.filePath.replace(sharedStart, '')}" --> "${fullPath.replace(sharedStart, '')}"`)
                    fileToArchive.filePath = fullPath
                } else if ('data' in fileToArchive) {
                    console.warn(`File overrided: "${fileToArchive.name.replace(sharedStart, '')}" --> "${item}"`)
                    fileToArchive.data = fs.readFileSync(fullPath, 'utf8')
                }
                overrided = true
                break
            }
            
            if (!overrided) {
                filesToArchive.push({ name: item, filePath: fullPath })
            }
        }
    }

    {
        /**
         * @type {{ [block: string]: import('./blockstate').Blockstate }}
         */
        const blockstates = { }

        for (const pack of input) {
            const blockstatesPath = path.join(pack, 'assets', 'minecraft', 'blockstates')
            if (!fs.existsSync(blockstatesPath)) { continue }
            if (!fs.lstatSync(blockstatesPath).isDirectory()) { continue }

            // @ts-ignore
            const content = fs.readdirSync(blockstatesPath, { encoding: 'utf8', recursive: false })

            for (const fileName of content) {
                const fullPath = path.join(pack, 'assets', 'minecraft', 'blockstates', fileName)
                if (!fs.lstatSync(fullPath).isFile()) { continue }
                if (!fileName.endsWith('.json')) { continue }

                const blockstateName = fileName.replace('.json', '')
                const rawBlockstate = fs.readFileSync(fullPath, 'utf8')
                /** @type {import('./blockstate').Blockstate} */
                const blockstate = JSON5.parse(rawBlockstate)
                
                if (blockstateName in blockstates) {
                    const oldBlockstate = blockstates[blockstateName]
                    if ('variants' in oldBlockstate &&
                        'variants' in blockstate) {
                        /** @type {import('./blockstate').Blockstate} */
                        let newBlockstate = {
                            variants: {
                                ...oldBlockstate.variants,
                            }
                        }
                        for (const newVariantName in blockstate.variants) {
                            let newVariant = blockstate.variants[newVariantName]
                            if (!Array.isArray(newVariant)) { newVariant = [ newVariant ] }
                            for (let i = 0; i < newVariant.length; i++) {
                                const item = newVariant[i]
                                const namespace = item.model.includes(':') ? item.model.split(':')[0] : 'minecraft'
                                const _path = item.model.includes(':') ? item.model.split(':')[1] : item.model
                                const newModelFullPath = path.join(pack, 'assets', namespace, 'models', _path)
                                if (!fs.existsSync(newModelFullPath + '.json')) {
                                    console.warn(`Model not found: "${(newModelFullPath + '.json').replace(sharedStart, '')}"`)
                                    continue
                                }
                                const suffix = '_' + crypto.randomBytes(16).toString('base64url')
                                item.model += suffix
                                filesToArchive.push({
                                    name: path.join('assets', namespace, 'models', _path + suffix + '.json'),
                                    data: fs.readFileSync(newModelFullPath + '.json', 'utf8'),
                                })
                            }
                            if (newVariantName in newBlockstate.variants) {
                                if (Array.isArray(newBlockstate.variants[newVariantName])) {
                                    // @ts-ignore
                                    newBlockstate.variants[newVariantName].push(...newVariant)
                                } else {
                                    newBlockstate.variants[newVariantName] = [
                                        // @ts-ignore
                                        newBlockstate.variants[newVariantName],
                                        ...newVariant,
                                    ]
                                }
                            } else {
                                newBlockstate.variants[newVariantName] = newVariant
                            }
                        }
                        blockstates[blockstateName] = newBlockstate
                    } else {
                        console.warn(`:(`)
                    }
                } else {
                    blockstates[blockstateName] = blockstate
                }
            }
        }

        for (const name in blockstates) {
            const item = path.join('assets', 'minecraft', 'blockstates', name + '.json')
            let overrided = false
            const data = JSON.stringify(blockstates[name], null, ' ')

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
         * @type {{ [lang: string]: { [key: string]: string } }}
         */
        const langs = { }

        for (const pack of input) {
            const langPath = path.join(pack, 'assets', 'minecraft', 'lang')
            if (!fs.existsSync(langPath)) { continue }
            if (!fs.lstatSync(langPath).isDirectory()) { continue }

            // @ts-ignore
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

        for (const pack of input) {
            const fontsPath = path.join(pack, 'assets', 'minecraft', 'font')
            if (!fs.existsSync(fontsPath)) { continue }
            if (!fs.lstatSync(fontsPath).isDirectory()) { continue }

            // @ts-ignore
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
        zlib: { level: 0 }
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
    
    // @ts-ignore
    archive.pipe(output)

    for (const fileToArchive of filesToArchive) {
        if ('filePath' in fileToArchive) {
            if (fileToArchive.filePath.endsWith('.json')) {
                archive.append(JSON.stringify(JSON5.parse(fs.readFileSync(fileToArchive.filePath, 'utf8'))), { name: fileToArchive.name })
            } else {
                archive.file(fileToArchive.filePath, { name: fileToArchive.name })
            }
        } else if ('data' in fileToArchive) {
            archive.append(fileToArchive.data, { name: fileToArchive.name })
        } else {
            throw 'bruh'
        }
    }

    let lastProgressTime = performance.now()
    archive.on('progress', (progress) => {
        const now = performance.now()
        if (now - lastProgressTime < 5000) { return }
        lastProgressTime = now
        console.log(Progress.getPercentString(progress.entries.processed, progress.entries.total))
    })
    archive.on('close', () => {
        console.log(`100.00 %`)
    })

    await archive.finalize()
}
