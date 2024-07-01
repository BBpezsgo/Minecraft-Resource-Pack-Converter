const Jimp = require("jimp")

/**
 * @param {Jimp} image
 * @param {number} factor
 * @param {number} xs
 * @param {number} ys
 * @param {number} background
 */
function scaleImage(image, factor, xs, ys, background) {
    const w = image.getWidth() / xs
    const h = image.getHeight() / ys

    const parts = []
    for (let x = 0; x < xs; x++) {
        for (let y = 0; y < ys; y++) {
            parts.push({
                x: x,
                y: y,
                image: image.clone().crop(w * x, h * y, w, h).scale(factor),
            })
        }
    }

    const newImage = new Jimp(image.getWidth(), image.getHeight(), background)
    const dispX = w * (1 - factor) / 2
    const dispY = h * (1 - factor) / 2

    for (const part of parts) {
        newImage.blit(part.image, w * part.x + dispX, h * part.y + dispY)
    }

    return newImage
}

/**
 * @param {Jimp} image
 * @param {number} color
 * @param {number} width
 */
function outline(image, color, width) {
    const w = image.getWidth()
    const h = image.getHeight()

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < width; x++) {
            image.setPixelColor(color, x, y)
            image.setPixelColor(color, w - 1 - x, y)
        }
    }

    for (let x = 0; x < w; x++) {
        for (let y = 0; y < width; y++) {
            image.setPixelColor(color, x, y)
            image.setPixelColor(color, x, h - 1 - y)
        }
    }

    return image
}

/**
 * @param {Jimp} image
 * @param {{ x: number; y: number; w: number; h: number; }} rect
 * @param {number} color
 */
function fillImageRect(image, rect, color) {
    for (let y = 0; y < rect.h; y++) {
        for (let x = 0; x < rect.w; x++) {
            image.setPixelColor(color, x + rect.x, y + rect.y)
        }
    }
    return image
}

/**
 * @param {Jimp} image
 * @param {number} factor
 * @param {{ x: number; y: number; w: number; h: number; }} rect
 * @param {number} background
 */
function scaleImageRect(image, factor, rect, background) {
    const part = image.clone().crop(rect.x, rect.y, rect.w, rect.h).scale(factor)

    fillImageRect(image, rect, background)
    
    const dispX = rect.w * (1 - factor) / 2
    const dispY = rect.h * (1 - factor) / 2

    image.blit(part, rect.x + dispX, rect.y + dispY)

    return image
}

/**
 * @param {Jimp} image
 * @param {number} background
 */
function findContentRect(image, background) {
    const w = image.getWidth()
    const h = image.getHeight()
    let minX = w
    let minY = h
    let maxX = 0
    let maxY = 0
    
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const p = image.getPixelColor(x, y)
            if (p === background) { continue }
            if (x < minX) { minX = x }
            if (y < minY) { minY = y }
            if (x > maxX) { maxX = x }
            if (y > maxY) { maxY = y }
        }
    }

    if (minX > maxX ||
        minY > maxY) {
        return { x: 0, y: 0, w: 0, h: 0 }
    }

    return {
        x: minX,
        y: minY,
        w: maxX - minX,
        h: maxY - minY,
    }
}

/**
 * @param {Jimp | string} left
 * @param {Jimp | string} front
 * @param {Jimp | string} right
 * @param {Jimp | string} back
 * @param {Jimp | string} up
 * @param {Jimp | string} down
 * @param {string | null} output
 */
async function generateSkyBox(down, up, back, left, front, right, output = null) {
    const _left = (typeof left === 'string') ? await Jimp.read(left) : left
    const _front = (typeof front === 'string') ? await Jimp.read(front) : front
    const _right = (typeof right === 'string') ? await Jimp.read(right) : right
    const _back = (typeof back === 'string') ? await Jimp.read(back) : back
    const _up = (typeof up === 'string') ? await Jimp.read(up) : up
    const _down = (typeof down === 'string') ? await Jimp.read(down) : down

    if (_left.getWidth() != _left.getHeight()) { throw new Error(`Skybox segment 'left' isn't a cube (${_left.getWidth()}x${_left.getHeight()})`) }
    if (_front.getWidth() != _front.getHeight()) { throw new Error(`Skybox segment 'front' isn't a cube (${_front.getWidth()}x${_front.getHeight()})`) }
    if (_right.getWidth() != _right.getHeight()) { throw new Error(`Skybox segment 'right' isn't a cube (${_right.getWidth()}x${_right.getHeight()})`) }
    if (_back.getWidth() != _back.getHeight()) { throw new Error(`Skybox segment 'back' isn't a cube (${_back.getWidth()}x${_back.getHeight()})`) }
    if (_up.getWidth() != _up.getHeight()) { throw new Error(`Skybox segment 'up' isn't a cube (${_up.getWidth()}x${_up.getHeight()})`) }
    if (_down.getWidth() != _down.getHeight()) { throw new Error(`Skybox segment 'down' isn't a cube (${_down.getWidth()}x${_down.getHeight()})`) }

    const sideWidth = _left.getWidth()
    if (sideWidth != _front.getWidth()) { throw new Error(`Inconsistent segment sizes`) }
    if (sideWidth != _right.getWidth()) { throw new Error(`Inconsistent segment sizes`) }
    if (sideWidth != _back.getWidth()) { throw new Error(`Inconsistent segment sizes`) }
    if (sideWidth != _up.getWidth()) { throw new Error(`Inconsistent segment sizes`) }
    if (sideWidth != _down.getWidth()) { throw new Error(`Inconsistent segment sizes`) }
    
    const sideHeight = _left.getHeight()
    if (sideHeight != _front.getHeight()) { throw new Error(`Inconsistent segment sizes`) }
    if (sideHeight != _right.getHeight()) { throw new Error(`Inconsistent segment sizes`) }
    if (sideHeight != _back.getHeight()) { throw new Error(`Inconsistent segment sizes`) }
    if (sideHeight != _up.getHeight()) { throw new Error(`Inconsistent segment sizes`) }
    if (sideHeight != _down.getHeight()) { throw new Error(`Inconsistent segment sizes`) }

    const _result = await Jimp.create(
        sideWidth * 3,
        sideHeight * 2,
        0x000000
    )

    _result.blit(_down,  sideWidth * 0, sideHeight * 0)
    _result.blit(_up,    sideWidth * 1, sideHeight * 0)
    _result.blit(_back,  sideWidth * 2, sideHeight * 0)
    _result.blit(_left,  sideWidth * 0, sideHeight * 1)
    _result.blit(_front, sideWidth * 1, sideHeight * 1)
    _result.blit(_right, sideWidth * 2, sideHeight * 1)

    if (output) {
        _result.write(output)
    }

    return _result
}

/**
 * @param {string | Jimp} skybox
 * @returns {Promise<[ Jimp, Jimp, Jimp, Jimp, Jimp, Jimp ]>}
 */
async function breakUpSkybox(skybox) {
    const _skybox = (typeof skybox === 'string') ? await Jimp.read(skybox) : skybox
    
    const sideWidth = _skybox.getWidth() / 3
    const sideHeight = _skybox.getHeight() / 2

    if (sideWidth !== sideHeight) { throw new Error(`Invalid skybox ratio`) }
    
    const down =  _skybox.clone().crop(sideWidth * 0, sideHeight * 0, sideWidth, sideHeight)
    const up =    _skybox.clone().crop(sideWidth * 1, sideHeight * 0, sideWidth, sideHeight)
    const back =  _skybox.clone().crop(sideWidth * 2, sideHeight * 0, sideWidth, sideHeight)
    const left =  _skybox.clone().crop(sideWidth * 0, sideHeight * 1, sideWidth, sideHeight)
    const front = _skybox.clone().crop(sideWidth * 1, sideHeight * 1, sideWidth, sideHeight)
    const right = _skybox.clone().crop(sideWidth * 2, sideHeight * 1, sideWidth, sideHeight)

    return [ down, up, back, left, front, right ]
}

/**
 * @param {Jimp} down
 * @param {Jimp} up
 * @param {Jimp} back
 * @param {Jimp} left
 * @param {Jimp} front
 * @param {Jimp} right
 * @returns {Promise<[ Jimp, Jimp, Jimp, Jimp, Jimp, Jimp ]>}
 */
async function rotateSkybox(down, up, back, left, front, right) {
    down.rotate(-90, false)
    up.rotate(90, false)
    return [
        down,
        up,
        right,
        back,
        left,
        front
    ]
}

module.exports = {
    scaleImage,
    outline,
    fillImageRect,
    scaleImageRect,
    findContentRect,
    generateSkyBox,
    breakUpSkybox,
    rotateSkybox,
}
