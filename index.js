console.clear()

const fs = require('fs')
const Path = require('path')
const Pack = require('./pack')
const PackConverter = require('./pack-converter')
const Changes = require('./changes')
const VersionHistory = Changes.VersionHistory
const Utils = require('./utils')
const {
    DefaultResourcePacksPath,
    MinecraftRoot,
    Packs,
} = require('./constants')

const VanillaResourcePacksPath = MinecraftRoot + 'resourcepacks\\'

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
    }
    
    const texturesB = {
        item: packB.GetTextures(formatB < 4 ? 'items' : 'item') ?? { },
        block: packB.GetTextures(formatB < 4 ? 'blocks' : 'block') ?? { },
    }

    const modelsA = {
        item: packA.GetModels('item') ?? { },
        block: packA.GetModels('block') ?? { },
    }
    
    const modelsB = {
        item: packB.GetModels('item') ?? { },
        block: packB.GetModels('block') ?? {},
    }

    const generatedResult = Changes.EmptyChanges

    const Check = function(
        /** @type {import('./changes').Map<string, string>} */ collectionA,
        /** @type {import('./changes').Map<string, string>} */ collectionB,
        /** @type {import('./changes').PackChangesNullable} */ changes,
        /** @type {'texture' | 'model'} */ kind1,
        /** @type {'item' | 'block'} */ kind2) {

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
                generatedResult[_kind1][kind2].Deleted.push(name)
            } else {
                if (deleted.includes(name)) {
                    console.log(`${label} \"${name}\" is not deleted`)
                }
                if (renamed[name]) {
                    console.log(`${label} \"${name}\" is not renamed to \"${renamed[name]}\"`)
                }
            }
        }
        
        for (const name in collectionB) {
            const key = Changes.GetKey(name, renamed)
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
                generatedResult[_kind1][kind2].Added.push(name)
            } else {
                if (added.includes(name)) {
                    console.log(`${label} \"${name}\" is not added`)
                }
                if (key) {
                    console.log(`${label} \"${key}\" is not renamed to \"${name}\"`)
                }
            }
        }
    }

    Check(texturesA.item, texturesB.item, changes, 'texture', 'item')
    Check(texturesA.block, texturesB.block, changes, 'texture', 'block')
    Check(modelsA.item, modelsB.item, changes, 'model', 'item')
    Check(modelsA.block, modelsB.block, changes, 'model', 'block')

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

        CheckFull('1.12', '1.13')

        const convertable = '1.20'
        // PackConverter.Convert('1.20', '1.12', Packs[convertable], Path.join(VanillaResourcePacksPath, convertable))
