const OS = require('os')
const Path = require('path')

const MINECRAFT = '.minecraft'

module.exports = function() {
    if (process.env['APPDATA']) {
        return Path.join(process.env['APPDATA'], MINECRAFT)
    }

    return Path.join(OS.userInfo().homedir, 'AppData', 'Roaming', MINECRAFT)
}
