const Jimp = require('jimp')
const { clamp } = require('./utils')

/**
 * @param {number} width
 * @param {number} height
 * @returns {Promise<Jimp>}
 */
async function makeUV(width, height) {
    const img = await Jimp.create(width, height)
    const cw = 255 / width
    const ch = 255 / height
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            img.setPixelColor(Jimp.rgbaToInt(x * cw, y * ch, 0, 255), x, y)
        }
    }
    return img
}

/**
 * @param {number} width
 * @param {number} height
 * @param {string} path
 * @returns {Promise<void>}
 */
async function makeUVFile(width, height, path) {
    const img = await makeUV(width, height)
    await img.writeAsync(path)
}

/**
 * @param {Jimp} uv
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 */
function getUVPoint(uv, x, y, width, height) {
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
function applyUVToPoint(uv, x, y, width, height) {
    const uvPoint = getUVPoint(uv, x, y, width, height)
    
    const p = Jimp.intToRGBA(uv.getPixelColor(uvPoint.x, uvPoint.y))
    let newX = (p.r * width) / 255
    let newY = (p.g * height) / 255
    
    newX = Math.round(newX)
    newY = Math.round(newY)
    
    newX = clamp(newX, 0, width)
    newY = clamp(newY, 0, height)

    return { x: newX, y: newY }
}

/**
 * @param {Jimp} uv
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 */
function getOffset(uv, x, y, width, height) {
    const p = applyUVToPoint(uv, x, y, width, height)
    return { x: x - p.x, y: y - p.y }
}

/**
 * @param {Jimp} uv
 * @param {Jimp} image
 * @returns {Promise<Jimp>}
 */
async function applyUV(uv, image) {
    const imgW = image.getWidth()
    const imgH = image.getHeight()

    const frames = imgH / imgW
    const frameW = imgW
    const frameH = imgW

    const img = await Jimp.create(imgW, imgH)
    for (let frame = 0; frame < frames; frame++) {
        for (let y = 0; y < frameH; y++) {
            for (let x = 0; x < frameW; x++) {
                const offset = getOffset(uv, x, y, frameW, frameH)
                const realX = x
                const realY = (frame * imgW) + y
                img.setPixelColor(image.getPixelColor(realX - offset.x, realY - offset.y), realX, realY)
            }
        }
    }
    return img
}

/**
 * @param {string} uvPath
 * @param {string} imagePath
 * @param {string} outPath
 * @returns {Promise<void>}
 */
async function applyUVFile(uvPath, imagePath, outPath) {
    const img = await Jimp.read(imagePath)
    const uv = await Jimp.read(uvPath)
    const img2 = await applyUV(uv, img)
    await img2.writeAsync(outPath)
}

/**
 * @param {Jimp} uv
 * @returns {Promise<Jimp>}
 */
async function invertUV(uv) {
    const plainUV = await makeUV(uv.getWidth(), uv.getHeight())
    return await applyUV(uv, plainUV)
}

/**
 * @param {string} inputUvPath
 * @param {string} outputUvPath
 * @returns {Promise<void>}
 */
async function invertUVFile(inputUvPath, outputUvPath) {
    const uv = await Jimp.read(inputUvPath)
    const newUV = await invertUV(uv)
    await newUV.writeAsync(outputUvPath)
}

module.exports = {
    makeUVFile,
    applyUVFile,
    invertUVFile,
}
