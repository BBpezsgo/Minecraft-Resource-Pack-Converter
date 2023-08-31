
const Jimp = require("jimp")
const { Clamp } = require('./utils')

/**
 * @param {number} width
 * @param {number} height
 * @param {string} path
 * @returns {Promise<void>}
 */
function MakeUVFile(width, height, path) {
    return new Promise((resolve, reject) => {
        Jimp.create(width, height)
            .then((img) => {
                const cw = 255 / width
                const ch = 255 / height
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        img.setPixelColor(Jimp.rgbaToInt(x * cw, y * ch, 0, 255), x, y)
                    }
                }
                img.writeAsync(path)
                    .then(() => { resolve() })
                    .catch(reject)
            })
            .catch(reject)
    })
}

/**
 * @param {Jimp} uv
 * @param {Jimp} image
 * @returns {Promise<Jimp>}
 */
function ApplyUV(uv, image) {
    const imgW = image.getWidth()
    const imgH = image.getWidth()

    const uvW = uv.getWidth()
    const uvH = uv.getHeight()

    const GetUVPoint = function(/** @type {number} */ x, /** @type {number} */ y) {
        let newX = (x * uvW) / imgW
        let newY = (y * uvH) / imgH
        
        newX = Math.round(newX)
        newY = Math.round(newY)
        
        newX = Clamp(newX, 0, uvW)
        newY = Clamp(newY, 0, uvH)
        
        return { x: newX, y: newY }
    }
    
    const ConvertPoint = function(/** @type {number} */ x, /** @type {number} */ y) {
        const uvPoint = GetUVPoint(x, y)

        const p = Jimp.intToRGBA(uv.getPixelColor(uvPoint.x, uvPoint.y))
        let newX = p.r * (imgW / 255)
        let newY = p.g * (imgH / 255)
        
        newX = Math.round(newX)
        newY = Math.round(newY)
        
        newX = Clamp(newX, 0, imgW)
        newY = Clamp(newY, 0, imgH)

        return { x: newX, y: newY }
    }

    return new Promise((resolve, reject) => {
        Jimp.create(imgW, imgH)
            .then(img => {
                for (let y = 0; y < imgH; y++) {
                    for (let x = 0; x < imgW; x++) {
                        const p = ConvertPoint(x, y)
                        img.setPixelColor(image.getPixelColor(p.x, p.y), x, y)
                    }
                }
                resolve(img)
            })
            .catch(reject)
    })
}

/**
 * @param {string} uvPath
 * @param {string} imagePath
 * @param {string} outPath
 * @returns {Promise<void>}
 */
function ApplyUVFile(uvPath, imagePath, outPath) {
    return new Promise((resolve, reject) => {
        Jimp.read(imagePath)
            .then(img => {
                Jimp.read(uvPath)
                    .then(uv => {
                        ApplyUV(uv, img)
                            .then(img2 => {
                                img2.writeAsync(outPath)
                                    .then(() => resolve())
                                    .catch(reject)
                            })
                            .catch(reject)
                    })
                    .catch(reject)
            })
            .catch(reject)
    })
}

module.exports = {
    MakeUVFile,
    ApplyUVFile,
}