const fs = require('fs')
const Path = require('path')
const Pack = require('./pack')
const Changes = require('./changes')
const VersionHistory = Changes.versionHistory
const Utils = require('./utils')
const Basic = require('./basic')

/**
 * @param {import('./changes').Version} versionA
 * @param {import('./changes').Version} versionB
 * @param {string | Pack.ResourcePack | null | undefined} packA
 * @param {string | Pack.ResourcePack | null | undefined} packB
 */
function checkFull(versionA, versionB, packA, packB) {
    if (typeof packA === 'string') {
        const readedPack = Pack.readResourcePack(packA)
        if (!readedPack) {
            throw new Error(`Failed to read resource pack "${packA}"`)
        }
        packA = readedPack
    }

    if (typeof packB === 'string') {
        const readedPack = Pack.readResourcePack(packB)
        if (!readedPack) {
            throw new Error(`Failed to read resource pack "${packB}"`)
        }
        packB = readedPack
    }

    const _packA = packA?.Assets?.minecraft
    if (!_packA) {
        throw new Error(`Default resource pack for version \"${versionA}\" does not exists or invalid`)
    }
    const _packB = packB?.Assets?.minecraft
    if (!_packB) {
        throw new Error(`Default resource pack for version \"${versionB}\" does not exists or invalid`)
    }

    const changes = VersionHistory[versionB]

    if (!changes) {
        throw new Error(`Changes for version \"${versionB}\" does not exists`)
    }

    const formatA = Pack.versionToPackFormat[versionA]
    const formatB = Pack.versionToPackFormat[versionB]

    if (!formatA || !formatB) {
        throw new Error(`Failed to get pack format`)
    }

    const texturesA = {
        item: _packA.getTextures(formatA < 4 ? 'items' : 'item') ?? {},
        block: _packA.getTextures(formatA < 4 ? 'blocks' : 'block') ?? {},
        entity: _packA.getTexturesRecursive('entity') ?? {},
        gui: _packA.getTexturesRecursive('gui') ?? {},
    }

    const texturesB = {
        item: _packB.getTextures(formatB < 4 ? 'items' : 'item') ?? {},
        block: _packB.getTextures(formatB < 4 ? 'blocks' : 'block') ?? {},
        entity: _packB.getTexturesRecursive('entity') ?? {},
        gui: _packB.getTexturesRecursive('gui') ?? {},
    }

    const modelsA = {
        item: _packA.getModels('item') ?? {},
        block: _packA.getModels('block') ?? {},
    }

    const modelsB = {
        item: _packB.getModels('item') ?? {},
        block: _packB.getModels('block') ?? {},
    }

    const blockstatesA = []
    const blockstatesB = []

    if (fs.existsSync(Path.join(_packA.Path, 'blockstates'))) {
        const _files = fs.readdirSync(Path.join(_packA.Path, 'blockstates'))
        for (const _file of _files) {
            if (!_file.endsWith('.json')) { continue }
            const name = _file.substring(0, _file.length - 5)
            blockstatesA.push(name)
        }
    }

    if (fs.existsSync(Path.join(_packB.Path, 'blockstates'))) {
        const _files = fs.readdirSync(Path.join(_packB.Path, 'blockstates'))
        for (const _file of _files) {
            if (!_file.endsWith('.json')) { continue }
            const name = _file.substring(0, _file.length - 5)
            blockstatesB.push(name)
        }
    }

    const generatedResult = Changes.noChanges()

    const Check = function (
        /** @type {import('./basic').Map<string, string> | string[]} */ collectionA,
        /** @type {import('./basic').Map<string, string> | string[]} */ collectionB,
        /** @type {import('./changes').PackChangesNullable} */ changes,
        /** @type {'textures' | 'models' | 'blockstates'} */ kind1,
        /** @type {'item' | 'block' | 'entity' | 'gui' | null} */ kind2) {

        /** @type {import('./changes').StringChangesNullable | undefined} */
        const kindChanges = kind2 ? changes[kind1]?.[kind2] : changes[kind1]

        const added = kindChanges?.Added ?? []
        const renamed = kindChanges?.Renamed ?? {}
        const deleted = kindChanges?.Deleted ?? []

        const label = (kind2 ? (Utils.capitalizeFirst(kind2) + ' ' + kind1) : kind1)

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
                const key = Basic.getKey(name, renamed)
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
                const key = Basic.getKey(name, renamed)
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

    const prugedResult = Utils.prugeObject(generatedResult)

    const resultPath = Path.join(Utils.paths.generatedVersionChanges, versionB + '.js')
    const resultText = `/** @type {import('../../src/changes').PackChangesNullable} */\n(${(prugedResult ? JSON.stringify(prugedResult, null, '    ') : '{ }')})`
    fs.writeFileSync(resultPath, resultText)
}

/**
 * @param {{ [version in Changes.Version]: string | Pack.ResourcePack | null | undefined }} resourcePacks 
 */
function checkFullAll(resourcePacks) {
    /** @ts-ignore @type {Changes.Version[]} */
    const versions = Object.keys(resourcePacks)
    for (let i = 1; i < versions.length; i++) {
        const prev = versions[i - 1]
        const curr = versions[i]

        console.log(`${prev} --> ${curr}`)
        checkFull(prev, curr, resourcePacks[prev], resourcePacks[curr])
    }
}

module.exports = {
    checkFull,
    checkFullAll,
}
