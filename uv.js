
const Jimp = require("jimp")
const { Clamp, Repeat } = require('./utils')

/**
 * @param {number} width
 * @param {number} height
 * @returns {Promise<Jimp>}
 */
function MakeUV(width, height) {
    return new Promise((resolve, reject) => {
        Jimp.create(width, height)
            .then(img => {
                const cw = 255 / width
                const ch = 255 / height
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        img.setPixelColor(Jimp.rgbaToInt(x * cw, y * ch, 0, 255), x, y)
                    }
                }
                resolve(img)
            })
            .catch(reject)
    })
}

/**
 * @param {number} width
 * @param {number} height
 * @param {string} path
 * @returns {Promise<void>}
 */
function MakeUVFile(width, height, path) {
    return new Promise((resolve, reject) => {
        MakeUV(width, height)
            .then(img => {
                img.writeAsync(path)
                    .then(() => { resolve() })
                    .catch(reject)
            })
            .catch(reject)
    })
}

/**
 * @param {Jimp} uv
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 */
function GetUVPoint(uv, x, y, width, height) {
    const uvW = uv.getWidth()
    const uvH = uv.getHeight()

    let uvX = (x * uvW) / width
    let uvY = (y * uvH) / height
    
    uvX = Math.round(uvX)
    uvY = Math.round(uvY)
    
    return { x: uvX, y: uvY }
}

/**
 * @param {Jimp} uv
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 */
function ApplyUVToPoint(uv, x, y, width, height) {
    const uvPoint = GetUVPoint(uv, x, y, width, height)
    
    const p = Jimp.intToRGBA(uv.getPixelColor(uvPoint.x, uvPoint.y))
    let newX = (p.r * width) / 255
    let newY = (p.g * height) / 255
    
    newX = Math.round(newX)
    newY = Math.round(newY)
    
    newX = Clamp(newX, 0, width)
    newY = Clamp(newY, 0, height)

    return { x: newX, y: newY }
}

/**
 * @param {Jimp} uv
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 */
function GetOffset(uv, x, y, width, height) {
    const p = ApplyUVToPoint(uv, x, y, width, height)
    return { x: x - p.x, y: y - p.y }
}

/**
 * @param {Jimp} uv
 * @param {Jimp} image
 * @returns {Promise<Jimp>}
 */
function ApplyUV(uv, image) {
    const imgW = image.getWidth()
    const imgH = image.getHeight()

    const frames = imgH / imgW
    const frameW = imgW
    const frameH = imgW

    return new Promise((resolve, reject) => {
        Jimp.create(imgW, imgH)
            .then(img => {
                for (let frame = 0; frame < frames; frame++) {
                    for (let y = 0; y < frameH; y++) {
                        for (let x = 0; x < frameW; x++) {
                            const offset = GetOffset(uv, x, y, frameW, frameH)
                            const realX = x
                            const realY = (frame * imgW) + y
                            img.setPixelColor(image.getPixelColor(realX - offset.x, realY - offset.y), realX, realY)
                        }
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

/**
 * @param {Jimp} uv
 * @returns {Promise<Jimp>}
 */
function InvertUV(uv) {
    return new Promise((resolve, reject) => {
        MakeUV(uv.getWidth(), uv.getHeight())
            .then(plainUV => {
                ApplyUV(uv, plainUV)
                    .then(resolve)
                    .catch(reject)
            })
            .catch(reject)
    })
}

/**
 * @param {string} inputUvPath
 * @param {string} outputUvPath
 * @returns {Promise<void>}
 */
function InvertUVFile(inputUvPath, outputUvPath) {
    return new Promise((resolve, reject) => {
        Jimp.read(inputUvPath)
            .then(uv => {
                InvertUV(uv)
                    .then(newUV => {
                        newUV.writeAsync(outputUvPath)
                            .then(() => resolve())
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
    InvertUVFile,
}