import packConverter from './src/pack-converter'
import utils from './src/utils'
import basic from './src/basic'
import checker from './src/checker'
import logs from './src/log-analyser'
import pack from './src/pack'
import combine from './src/combine'
import prugeFolders from './src/pruge-folders'
import sames from './src/sames'
import renderModel from './src/renderer'

/**
 * Convertes the resource pack located at `input` from
 * version `inputVersion` to `outputVersion` and puts
 * the result into the `output` directory.
 */
export function convert(inputVersion: import('./changes').Version, outputVersion: import('./changes').Version, input: string, output: string): void

export function readResourcePack(packPath: string): ResourcePack | null

export namespace checker {
    export function check(versionA: import('./changes').Version, versionB: import('./changes').Version, packA: string | Pack.ResourcePack | null | undefined, packB: string | Pack.ResourcePack | null | undefined): void
    export function checkAll(resourcePacks: { [version: string]: string | Pack.ResourcePack | null | undefined }): void
}

export namespace logs {
    function print(minecraftPath: string): void
    function clear(minecraftPath: string): void
}

export namespace utils {
    function combine(outputZip: string, ...input: string[]): Promise<void>
    function prugeFolder(folder: string): void
    function compareFolders(folderA: string, folderB: string, returnKind: 'sames' | 'differents'): Generator<{
        a: string;
        b?: string;
    }, void, unknown>
    function renderModel(
        modelPath: string | undefined,
        resourcePackPath: string,
        width: number,
        height: number,
        transformations?: renderModel.Transformations | null):
    {
        width: number;
        height: number;
        data: Uint8ClampedArray;
    } | null
}
