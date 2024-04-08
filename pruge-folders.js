const fs = require('fs')
const path = require('path')

/**
 * @param {string} folder
 */
function prugeFolder(folder) {
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
            fs.rmdirSync(folder)
            console.warn(`Deleted ${folder}`)
        } catch (error) {
            
        }
    }
}

module.exports = prugeFolder
