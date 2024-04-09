const fs = require('fs')
const path = require('path')
const { sleep } = require('./utils')

/**
 * @param {string} folder
 */
function prugeFolder(folder) {
    sleep(16)

    let contents = fs.readdirSync(folder, { withFileTypes: true })

    for (const item of contents) {
        if (item.isDirectory()) {
            const fullPath = path.join(folder, item.name)
            prugeFolder(fullPath)
        }
    }

    contents = fs.readdirSync(folder, { withFileTypes: true })

    if (contents.length === 0) {
        try {
            fs.rmSync(folder, { retryDelay: 100, maxRetries: 5, recursive: true })
            console.warn(`Deleted ${folder}`)
        } catch (error) {
            
        }
    }
}

module.exports = prugeFolder
