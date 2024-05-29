const packConverter = require('./src/pack-converter')
const checker = require('./src/checker')
const logs = require('./src/log-analyser')
const combine = require('./src/combine')
const prugeFolders = require('./src/pruge-folders')
const sames = require('./src/sames')
const renderModel = require('./src/renderer')

module.exports ={
    convert: packConverter.convert,
    /** @readonly */
    checker: {
        check: checker.checkFull,
        checkAll: checker.checkFullAll,
    },
    /** @readonly */
    logs: {
        print: logs.print,
        clear: logs.clear,
    },
    /** @readonly */
    utils: {
        combine: combine,
        prugeFolder: prugeFolders,
        compareFolders: sames,
        renderModel: renderModel,
    },
}
