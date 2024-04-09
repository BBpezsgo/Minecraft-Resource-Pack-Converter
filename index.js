const packConverter = require('./src/pack-converter')
const utils = require('./src/utils')
const basic = require('./src/basic')
const checker = require('./src/checker')
const logs = require('./src/log-analyser')
const pack = require('./src/pack')
const combine = require('./src/combine')
const prugeFolders = require('./src/pruge-folders')
const sames = require('./src/sames')

module.exports = {
    /**
     * Convertes the resource pack located at `input` from
     * version `inputVersion` to `outputVersion` and puts
     * the result into the `output` directory.
     */
    convert: packConverter.convert,
    readResourcePack: pack.readResourcePack,
    checker: {
        check: checker.checkFull,
        checkAll: checker.checkFullAll,
    },
    logs: {
        print: logs.print,
        clear: logs.clear,
    },
    utils: {
        ...utils,
        ...basic,
        combine: combine,
        prugeFolder: prugeFolders,
        compareFolders: sames,
    },
}
