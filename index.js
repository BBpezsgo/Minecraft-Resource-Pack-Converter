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
const Constants = require('./constants')
const combine = require('./combine')
const compareFolders = require('./sames')
const prugeFolder = require('./pruge-folders')

const VanillaResourcePacksPath = Path.join(Constants.Minecraft, 'resourcepacks')

const VanillaResourcePacks = fs.readdirSync(VanillaResourcePacksPath)

/** @type {{ [name: string]: Pack.ResourcePack }} */
const ResourcePacks = { }
for (const ResourcePackFolder of VanillaResourcePacks) {
    const ResourcePack = Pack.ReadResourcePack(Path.join(VanillaResourcePacksPath, ResourcePackFolder))
    if (ResourcePack === null) continue
    ResourcePacks[Path.parse(ResourcePackFolder).name] = ResourcePack
}

/**
 * @type {{ [version in Changes.Version]: Pack.ResourcePack | undefined }}
 */
const DefaultResourcePacks = {
    '1.6': Pack.ReadResourcePack(Path.join(Constants.DefaultResourcePacksPath, '1.6.4')),
    '1.7': Pack.ReadResourcePack(Path.join(Constants.DefaultResourcePacksPath, '1.7.10')),
    '1.8': Pack.ReadResourcePack(Path.join(Constants.DefaultResourcePacksPath, '1.8.9')),
    '1.9': Pack.ReadResourcePack(Path.join(Constants.DefaultResourcePacksPath, '1.9.3')),
    '1.10': Pack.ReadResourcePack(Path.join(Constants.DefaultResourcePacksPath, '1.10.2')),
    '1.11': Pack.ReadResourcePack(Path.join(Constants.DefaultResourcePacksPath, '1.11.2')),
    '1.12': Pack.ReadResourcePack(Path.join(Constants.DefaultResourcePacksPath, '1.12.2')),
    '1.13': Pack.ReadResourcePack(Path.join(Constants.DefaultResourcePacksPath, '1.13.2')),
    '1.14': Pack.ReadResourcePack(Path.join(Constants.DefaultResourcePacksPath, '1.14.4')),
    '1.15': Pack.ReadResourcePack(Path.join(Constants.DefaultResourcePacksPath, '1.15.2')),
    '1.16': Pack.ReadResourcePack(Path.join(Constants.DefaultResourcePacksPath, '1.16.5')),
    '1.17': Pack.ReadResourcePack(Path.join(Constants.DefaultResourcePacksPath, '1.17.1')),
    '1.18': Pack.ReadResourcePack(Path.join(Constants.DefaultResourcePacksPath, '1.18.2')),
    '1.19': Pack.ReadResourcePack(Path.join(Constants.DefaultResourcePacksPath, '1.19.4')),
    '1.20': Pack.ReadResourcePack(Path.join(Constants.DefaultResourcePacksPath, '1.20')),
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
        block: packB.GetModels('block') ?? { },
    }

    const blockstatesA = [ ]
    const blockstatesB = [ ]

    if (fs.existsSync(Path.join(packA.Path, 'blockstates'))) {
        const _files = fs.readdirSync(Path.join(packA.Path, 'blockstates'))
        for (const _file of _files) {
            if (!_file.endsWith('.json')) { continue }
            const name = _file.substring(0, _file.length - 5)
            blockstatesA.push(name)
        }
    }

    if (fs.existsSync(Path.join(packB.Path, 'blockstates'))) {
        const _files = fs.readdirSync(Path.join(packB.Path, 'blockstates'))
        for (const _file of _files) {
            if (!_file.endsWith('.json')) { continue }
            const name = _file.substring(0, _file.length - 5)
            blockstatesB.push(name)
        }
    }

    const generatedResult = Changes.NoChanges()

    const Check = function(
        /** @type {import('./basic').Map<string, string> | string[]} */ collectionA,
        /** @type {import('./basic').Map<string, string> | string[]} */ collectionB,
        /** @type {import('./changes').PackChangesNullable} */ changes,
        /** @type {'textures' | 'models' | 'blockstates'} */ kind1,
        /** @type {'item' | 'block' | 'entity' | 'gui' | null} */ kind2) {

        /** @type {import('./changes').StringChangesNullable | undefined} */
        const kindChanges =  kind2 ? changes[kind1]?.[kind2] : changes[kind1]

        const added = kindChanges?.Added ?? []
        const renamed = kindChanges?.Renamed ?? { }
        const deleted = kindChanges?.Deleted ?? []

        const label = (kind2 ? (Utils.CapitalizeFirst(kind2) + ' ' + kind1) : kind1)

        if (Array.isArray(collectionA) !== Array.isArray(collectionB)) {
            throw new Error('Different collection types')
        }

        if (Array.isArray(collectionA) && Array.isArray(collectionB)) {
            for (const name of collectionA) {
                if (!collectionB.includes(name)) {
                    if (deleted.includes(name)) {
                        if (renamed[name]) {
                            console.log(`${label} \"${name}\" is renamed (to \"${renamed[name]}\") and deleted at the same time`)
                        }
    
                        continue
                    }
                    if (renamed[name]) {
                        continue
                    }
                    console.log(`${label} \"${name}\" is deleted`);
    
                    (kind2 ? generatedResult[kind1][kind2] : generatedResult[kind1])?.Deleted.push(name)
                } else {
                    if (deleted.includes(name)) {
                        // console.log(`${label} \"${name}\" is not deleted`)
                    }
                    if (renamed[name]) {
                        // console.log(`${label} \"${name}\" is not renamed to \"${renamed[name]}\"`)
                    }
                }
            }
            
            for (const name of collectionB) {
                const key = Basic.GetKey(name, renamed)
                if (!collectionA.includes(name)) {
                    if (added.includes(name)) {
                        if (key) {
                            console.log(`${label} \"${key}\" is renamed (to \"${name}\") and added at the same time`)
                        }
    
                        continue
                    }
                    if (key) {
                        continue
                    }
                    console.log(`${label} \"${name}\" is added`);
                    (kind2 ? generatedResult[kind1][kind2] : generatedResult[kind1])?.Added.push(name)
                } else {
                    if (added.includes(name)) {
                        console.log(`${label} \"${name}\" is not added`)
                    }
                    if (key) {
                        // console.log(`${label} \"${key}\" is not renamed to \"${name}\"`)
                    }
                }
            }
        } else {
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
                    console.log(`${label} \"${name}\" is deleted`);
    
                    (kind2 ? generatedResult[kind1][kind2] : generatedResult[kind1])?.Deleted.push(name)
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
                    console.log(`${label} \"${name}\" is added`);
                    (kind2 ? generatedResult[kind1][kind2] : generatedResult[kind1])?.Added.push(name)
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
    }

    Check(texturesA.item, texturesB.item, changes, 'textures', 'item')
    Check(texturesA.block, texturesB.block, changes, 'textures', 'block')
    Check(texturesA.entity, texturesB.entity, changes, 'textures', 'entity')
    Check(texturesA.gui, texturesB.gui, changes, 'textures', 'gui')
    Check(modelsA.item, modelsB.item, changes, 'models', 'item')
    Check(modelsA.block, modelsB.block, changes, 'models', 'block')

    Check(blockstatesA, blockstatesB, changes, 'blockstates', null)

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

    // @ts-ignore
    if (generatedResult.blockstates.Added.length === 0) { generatedResult.blockstates.Added = undefined }
    // @ts-ignore
    if (Object.keys(generatedResult.blockstates.Renamed).length === 0) { generatedResult.blockstates.Renamed = undefined }
    // @ts-ignore
    if (generatedResult.blockstates.Deleted.length === 0) { generatedResult.blockstates.Deleted = undefined }

    const prugedResult = Utils.PrugeObject(generatedResult)

    const resultPath = Path.join(__dirname, 'result', versionB + '.js')
    const resultText = `/** @type {import('../changes').PackChangesNullable} */\n(${(prugedResult ? JSON.stringify(prugedResult, null, '    ') : '{ }')})`
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

function CheckFullAll() {
    /** @ts-ignore @type {Changes.Version[]} */
    const versions = Object.keys(DefaultResourcePacks)
    for (let i = 1; i < versions.length; i++) {
        const prev = versions[i - 1]
        const curr = versions[i]
        
        console.log(`${prev} --> ${curr}`)
        CheckFull(prev, curr)
    }
}

(function() {
    /*
    const root = 'C:\\Users\\bazsi\\Desktop\\Minecraft\\Cool Textures'
    
    if (true) {
        combine(
            'D:\\Program Files\\LegacyLauncher\\game\\resourcepacks\\Cool Textures.zip',
            ...[
                `${root}\\ArtisanalDefault`,
                `${root}\\ComputerCreate`,
                `${root}\\Create Computers`,
                `${root}\\Updated_Engineering`,
                `${root}\\zozos-textures`,
                `${root}\\bruh`,
            ])
    } else {
        const everything = `${root}\\bruh`
        const original = `${root}\\Updated_Engineering-original`
    
        const tempFolder = `${root}\\Updated_Engineering`
    
        if (fs.existsSync(tempFolder)) {
            fs.rmSync(tempFolder, { force: true, recursive: true })
        }
    
        fs.mkdirSync(tempFolder)
    
        fs.cpSync(everything, tempFolder, { recursive: true })
    
        {
            const res = compareFolders(
                tempFolder,
                original,
                'differents')
        
            for (const item of res) {
                console.warn(`Deleted ${item.a}`)
                fs.rmSync(item.a)
            }
        
            prugeFolder(tempFolder)
        }
        
        {
            const res = compareFolders(
                everything,
                tempFolder,
                'sames')
        
            for (const item of res) {
                console.warn(`Deleted ${item.a}`)
                fs.rmSync(item.a)
            }
        
            prugeFolder(everything)
        }
    }
    return
    */

    if (true) {
        CheckFullAll()
        // CheckFull('1.13', '1.14')
    
        // InvertAllUVs()

        // return

        // LogAnalyser.Clear()
        // const convertable = 'Cool Textures'
        // PackConverter.Convert('1.20', '1.12', Packs[convertable], Path.join(VanillaResourcePacksPath, convertable))    
        // PackConverter.Convert('1.20', '1.16', Constants.Packs['Cool Textures'], Constants.GetPath('Cool Textures', 'Create Above and Beyond'))    
    } else {
        LogAnalyser.Print()
    }
})()
