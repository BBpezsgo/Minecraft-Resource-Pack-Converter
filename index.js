console.clear()

const fs = require('fs')
const Path = require('path')
const Pack = require('./pack')
const PackConverter = require('./pack-converter')
const LogAnalyser = require('./log-analyser')
const Changes = require('./changes')
const VersionHistory = Changes.VersionHistory
const Utils = require('./utils')
const Colors = require('./colors')
const Basic = require('./basic')
const UV = require('./uv')
const {
    DefaultResourcePacksPath,
    Packs,
} = require('./constants')
const MinecraftRoot = require('./paths')()

const VanillaResourcePacksPath = Path.join(MinecraftRoot, 'resourcepacks')

const VanillaResourcePacks = fs.readdirSync(VanillaResourcePacksPath)

/** @type {{[name:string]:Pack.ResourcePack}} */
const ResourcePacks = { }
for (const ResourcePackFolder of VanillaResourcePacks) {
    const ResourcePack = Pack.ReadResourcePack(Path.join(VanillaResourcePacksPath, ResourcePackFolder))
    if (ResourcePack === null) continue
    ResourcePacks[Path.parse(ResourcePackFolder).name] = ResourcePack
}

/**
 * @type {{
 *   [version: string]: Pack.ResourcePack | undefined
 * }}
 */
const DefaultResourcePacks = {
    '1.11': Pack.ReadResourcePack(Path.join(DefaultResourcePacksPath, '1.11.2')),
    '1.12': Pack.ReadResourcePack(Path.join(DefaultResourcePacksPath, '1.12.2')),
    '1.13': Pack.ReadResourcePack(Path.join(DefaultResourcePacksPath, '1.13.2')),
    '1.14': Pack.ReadResourcePack(Path.join(DefaultResourcePacksPath, '1.14.4')),
    '1.15': Pack.ReadResourcePack(Path.join(DefaultResourcePacksPath, '1.15.2')),
    '1.16': Pack.ReadResourcePack(Path.join(DefaultResourcePacksPath, '1.16.5')),
    '1.17': Pack.ReadResourcePack(Path.join(DefaultResourcePacksPath, '1.17.1')),
    '1.18': Pack.ReadResourcePack(Path.join(DefaultResourcePacksPath, '1.18.2')),
    '1.19': Pack.ReadResourcePack(Path.join(DefaultResourcePacksPath, '1.19.4')),
    '1.20': Pack.ReadResourcePack(Path.join(DefaultResourcePacksPath, '1.20')),
}

/**
 * @param {import('./changes').Version} versionA
 * @param {import('./changes').Version} versionB
 */
function CheckFull(versionA, versionB) {
    const packA = DefaultResourcePacks[versionA]?.Assets?.minecraft
    if (!packA) {
        throw new Error(`Default resource pack for version \"${versionA}\" does not exists or invalid`)
    }
    const packB = DefaultResourcePacks[versionB]?.Assets?.minecraft
    if (!packB) {
        throw new Error(`Default resource pack for version \"${versionB}\" does not exists or invalid`)
    }

    const changes = VersionHistory[versionB]
    
    if (!changes) {
        throw new Error(`Changes for version \"${versionB}\" does not exists`)
    }

    const formatA = Pack.VersionToPackFormat[versionA]
    const formatB = Pack.VersionToPackFormat[versionB]

    if (!formatA ||! formatB) {
        throw new Error(`Failed to get pack format`)
    }

    const texturesA = {
        item: packA.GetTextures(formatA < 4 ? 'items' : 'item') ?? { },
        block: packA.GetTextures(formatA < 4 ? 'blocks' : 'block') ?? { },
        entity: packA.GetTexturesRecursive('entity') ?? { },
        gui: packA.GetTexturesRecursive('gui') ?? { },
    }
    
    const texturesB = {
        item: packB.GetTextures(formatB < 4 ? 'items' : 'item') ?? { },
        block: packB.GetTextures(formatB < 4 ? 'blocks' : 'block') ?? { },
        entity: packB.GetTexturesRecursive('entity') ?? { },
        gui: packB.GetTexturesRecursive('gui') ?? { },
    }

    const modelsA = {
        item: packA.GetModels('item') ?? { },
        block: packA.GetModels('block') ?? { },
    }
    
    const modelsB = {
        item: packB.GetModels('item') ?? { },
        block: packB.GetModels('block') ?? {},
    }

    const generatedResult = Changes.NoChanges()

    const Check = function(
        /** @type {import('./basic').Map<string, string>} */ collectionA,
        /** @type {import('./basic').Map<string, string>} */ collectionB,
        /** @type {import('./changes').PackChangesNullable} */ changes,
        /** @type {'texture' | 'model'} */ kind1,
        /** @type {'item' | 'block' | 'entity' | 'gui'} */ kind2) {

        /** @type {'textures' | 'models'} */
        let _kind1
        switch (kind1) {
            case 'texture':
                _kind1 = 'textures'
                break
            case 'model':
                _kind1 = 'models'
                break
            default:
                throw new Error('bruh')
        }

        const added = changes[_kind1]?.[kind2]?.Added ?? []

        const renamed = changes[_kind1]?.[kind2]?.Renamed ?? { }

        const deleted = changes[_kind1]?.[kind2]?.Deleted ?? []

        const label = Utils.CapitalizeFirst(kind2) + ' ' + kind1

        for (const name in collectionA) {
            if (!collectionB[name]) {
                if (deleted.includes(name)) {
                    if (renamed[name]) {
                        console.log(`${label} \"${name}\" is renamed (to \"${renamed[name]}\") and deleted at the same time`)
                    }

                    continue
                }
                if (renamed[name]) {
                    continue
                }
                console.log(`${label} \"${name}\" is deleted`)
                generatedResult[_kind1][kind2]?.Deleted.push(name)
            } else {
                if (deleted.includes(name)) {
                    // console.log(`${label} \"${name}\" is not deleted`)
                }
                if (renamed[name]) {
                    // console.log(`${label} \"${name}\" is not renamed to \"${renamed[name]}\"`)
                }
            }
        }
        
        for (const name in collectionB) {
            const key = Basic.GetKey(name, renamed)
            if (!collectionA[name]) {
                if (added.includes(name)) {
                    if (key) {
                        console.log(`${label} \"${key}\" is renamed (to \"${name}\") and added at the same time`)
                    }

                    continue
                }
                if (key) {
                    continue
                }
                console.log(`${label} \"${name}\" is added`)
                generatedResult[_kind1][kind2]?.Added.push(name)
            } else {
                if (added.includes(name)) {
                    console.log(`${label} \"${name}\" is not added`)
                }
                if (key) {
                    // console.log(`${label} \"${key}\" is not renamed to \"${name}\"`)
                }
            }
        }
    }

    Check(texturesA.item, texturesB.item, changes, 'texture', 'item')
    Check(texturesA.block, texturesB.block, changes, 'texture', 'block')
    Check(texturesA.entity, texturesB.entity, changes, 'texture', 'entity')
    Check(texturesA.gui, texturesB.gui, changes, 'texture', 'gui')
    Check(modelsA.item, modelsB.item, changes, 'model', 'item')
    Check(modelsA.block, modelsB.block, changes, 'model', 'block')

    // @ts-ignore
    if (generatedResult.models.block.Added.length === 0) { generatedResult.models.block.Added = undefined }
    // @ts-ignore
    if (Object.keys(generatedResult.models.block.Renamed).length === 0) { generatedResult.models.block.Renamed = undefined }
    // @ts-ignore
    if (generatedResult.models.block.Deleted.length === 0) { generatedResult.models.block.Deleted = undefined }

    // @ts-ignore
    if (generatedResult.models.item.Added.length === 0) { generatedResult.models.item.Added = undefined }
    // @ts-ignore
    if (Object.keys(generatedResult.models.item.Renamed).length === 0) { generatedResult.models.item.Renamed = undefined }
    // @ts-ignore
    if (generatedResult.models.item.Deleted.length === 0) { generatedResult.models.item.Deleted = undefined }

    // @ts-ignore
    if (generatedResult.textures.block.Added.length === 0) { generatedResult.textures.block.Added = undefined }
    // @ts-ignore
    if (Object.keys(generatedResult.textures.block.Renamed).length === 0) { generatedResult.textures.block.Renamed = undefined }
    // @ts-ignore
    if (generatedResult.textures.block.Deleted.length === 0) { generatedResult.textures.block.Deleted = undefined }

    // @ts-ignore
    if (generatedResult.textures.item.Added.length === 0) { generatedResult.textures.item.Added = undefined }
    // @ts-ignore
    if (Object.keys(generatedResult.textures.item.Renamed).length === 0) { generatedResult.textures.item.Renamed = undefined }
    // @ts-ignore
    if (generatedResult.textures.item.Deleted.length === 0) { generatedResult.textures.item.Deleted = undefined }

    // @ts-ignore
    if (generatedResult.textures.entity.Added.length === 0) { generatedResult.textures.entity.Added = undefined }
    // @ts-ignore
    if (Object.keys(generatedResult.textures.entity.Renamed).length === 0) { generatedResult.textures.entity.Renamed = undefined }
    // @ts-ignore
    if (generatedResult.textures.entity.Deleted.length === 0) { generatedResult.textures.entity.Deleted = undefined }

    const resultPath = Path.join(__dirname, 'result', versionB + '.js')
    let resultText = `(${JSON.stringify(generatedResult, null, ' ')})`
    fs.writeFileSync(resultPath, resultText)
}

const bruh = () => {
    const csvData = Utils.ParseCSV(fs.readFileSync(Path.join(__dirname, 'ids.csv'), 'utf8'))

    let eh = []

    /** @type {{ type: string, from: string, to: string[] }} */
    let last = {
        type: '',
        from: '',
        to: [],
    }

    for (const records of csvData) {
        const isNew = records[0].length > 0
        if (isNew) {
            if (last.type) { eh.push(last) }
            last = {
                type: '',
                from: '',
                to: [],
            }
            last.type = records[0]
            last.from = records[2]
            last.to = []
        }
        last.to.push(records[4])
    }

    if (last.type) { eh.push(last) }
    last = {
        type: '',
        from: '',
        to: [],
    }

    const res = {
        Separated: {

        },
        Renamed: {

        },
    }

    for (const item of eh) {
        switch (item.type) {
            case 'Separate':
                if (res.Separated[item.from]) {
                    console.warn('Bruh')
                    break
                }
                res.Separated[item.from] = item.to
                break
            
            case 'Rename':
                if (res.Renamed[item.from]) {
                    console.warn('Bruh')
                    break
                }
                res.Renamed[item.from] = item.to[0]
                break

            default:
                console.warn(item.type)
                break
        }
    }

    fs.writeFileSync(Path.join(__dirname, 'result', 'flattening-ids.js'), `(${JSON.stringify(res, null, ' ')})`, 'utf8')
}

function InvertAllUVs() {
    const folder = Path.join(__dirname, 'uvs')
    if (!fs.existsSync(folder)) { return }
    const contents = fs.readdirSync(folder)
    for (const element of contents) {
        if (Path.extname(element) !== '.png') { continue }
        let filename = element.substring(0, element.length - 4)
        if (filename.endsWith('-inverted')) { continue }
        filename += '-inverted'
        UV.InvertUVFile(Path.join(folder, element), Path.join(folder, filename + '.png'))
    }
}

function Entry() {
    if (true) {
        // CheckFull('1.11', '1.12')
    
        // InvertAllUVs()

        LogAnalyser.Clear()
        const convertable = 'Cool Textures'
        PackConverter.Convert('1.20', '1.12', Packs[convertable], Path.join(VanillaResourcePacksPath, convertable))    
    } else {
        LogAnalyser.Print()
    }
}

Entry()
console.log('Done')
