const fs = require('fs')
const path = require('path')
const archiver = require('archiver')
const Progress = require('./progress')

module.exports = async function(/** @type {string} */ outputZip, /** @type {Array<string>} */ ...input) {
    const output = fs.createWriteStream(outputZip)
    
    /**
     * @type {Array<{ filePath: string; name: string; }>}
     */
    const filesToArchive = [ ]
    
    for (let i = 0; i < input.length; i++) {
        const pack = input[i]

        if (!fs.existsSync(pack)) {
            console.warn(`Does not exists: ${pack}`)
            continue
        }

        const info = fs.lstatSync(pack)
        if (!info.isDirectory()) { continue }

        // @ts-ignore
        const content = fs.readdirSync(pack, { encoding: 'utf8', recursive: true })
            
        for (let j = 0; j < content.length; j++) {
            const item = content[j]

            const fullPath = path.join(pack, item)
            const info = fs.lstatSync(fullPath)
            if (!info.isFile()) { continue }

            let overrided = false
            for (let k = 0; k < filesToArchive.length; k++) {
                if (filesToArchive[k].name === item) {
                    console.warn(`File overrided: ${filesToArchive[k].filePath} --> ${fullPath}`)
                    filesToArchive[k].filePath = fullPath
                    overrided = true
                    break
                }
            }
            
            if (!overrided) {
                filesToArchive.push({ filePath: fullPath, name: item })
            }
        }
    }

    const archive = archiver('zip', {
        zlib: { level: 9 }
    })

    archive.on('warning', function(/** @type {archiver.ArchiverError} */ err) {
        if (err.code === 'ENOENT') {
    
        } else {
            throw err
        }
    })
    
    archive.on('error', function(/** @type {archiver.ArchiverError} */ err) {
        throw err
    })
    
    archive.pipe(output)

    for (const fileToArchive of filesToArchive) {
        archive.file(fileToArchive.filePath, { name: fileToArchive.name })
    }

    let lastProgressTime = performance.now()
    archive.on('progress', (progress) => {
        const now = performance.now()
        if (now - lastProgressTime < 5000) { return }
        lastProgressTime = now
        console.log(Progress.getPercentString(progress.entries.processed, progress.entries.total))
    })
    archive.on('close', () => {
        console.log(`100.00 %`)
    })

    await archive.finalize()
}
