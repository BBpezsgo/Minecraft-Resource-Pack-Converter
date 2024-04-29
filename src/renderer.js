const pack = require('./pack')
const fs = require('fs')
const THREE = require("three")
const SoftwareRenderer = require("three-software-renderer").SoftwareRenderer
const PNG = require("pngjs").PNG

/**
 * @param {string | undefined} modelPath
 * @param {pack.ResourcePack} _pack
 */
function modelStuff(modelPath, _pack) {
    if (!modelPath) { return null }

    const modelData = fs.readFileSync(modelPath, 'utf8')
    /** @type {import('./model').AnyModel} */
    const model = JSON.parse(modelData)

    const result = {
        textures: model.textures,
        texture_size: model.texture_size,
        elements: model.elements,
    }

    if (model.parent) {
        const namespace = model.parent.includes(':') ? model.parent.split(':')[0] : 'minecraft'
        const path = model.parent.includes(':') ? model.parent.split(':')[1] : model.parent
        const parentModelPath = _pack.namespaces[namespace].findModel(path + '.json')
        if (!parentModelPath) { return null }
        const parent = modelStuff(parentModelPath, _pack)
        if (!parent) { return null }

        if (parent.elements && !model.elements) {
            result.elements = parent.elements
        }

        if (parent.textures) {
            if (!result.textures) result.textures = {}
            for (const name in parent.textures) {
                result.textures[name] = parent.textures[name]
            }
        }
    }

    return result
}

/**
 * @param {{ from?: import('./model').Point; to?: import('./model').Point; }} element
 */
function getElementCube(element) {
    if (!element.from || !element.to) { return undefined }
    /*
    const from = new THREE.Vector3(
        Math.min(element.from[0], element.to[0]),
        Math.min(element.from[1], element.to[1]),
        Math.min(element.from[2], element.to[2]),
    )
    const to = new THREE.Vector3(
        Math.max(element.from[0], element.to[0]),
        Math.max(element.from[1], element.to[1]),
        Math.max(element.from[2], element.to[2]),
    )
    */

    const from = new THREE.Vector3(
        element.from[0],
        element.from[1],
        element.from[2],
    )
    const to = new THREE.Vector3(
        element.to[0],
        element.to[1],
        element.to[2],
    )

    const size = new THREE.Vector3(
        to.x - from.x,
        to.y - from.y,
        to.z - from.z,
    )

    const center = new THREE.Vector3(
        from.x + (size.x / 2),
        from.y + (size.y / 2),
        from.z + (size.z / 2),
    )
    return { size, center }
}

/**
 * @param {THREE.BufferGeometry} plane
 * @param {[number, number, number, number]} uv
 * @param {THREE.Vector2} imageSize
 */
function setPlaneUvs(plane, uv, imageSize) {
    if (!('faceVertexUvs' in plane)) { return }

    let x1 = uv[0]
    let y1 = uv[1]
    let x2 = uv[2]
    let y2 = uv[3]

    x1 /= imageSize.x
    y1 /= imageSize.y
    x2 /= imageSize.x
    y2 /= imageSize.y

    plane.faceVertexUvs = [
        [
            [
                new THREE.Vector2(x1, y2),
                new THREE.Vector2(x1, y1),
                new THREE.Vector2(x2, y2),
            ],
            [
                new THREE.Vector2(x1, y1),
                new THREE.Vector2(x2, y1),
                new THREE.Vector2(x2, y2),
            ],
        ]
    ]

    if ('uvsNeedUpdate' in plane) { plane.uvsNeedUpdate = true }
}

/**
 * @param {THREE.Vector3} center
 * @param {THREE.Vector3} size
 */
function generateCube(center, size) {
    const createPlane = (/** @type {number} */ width, /** @type {number} */ height, color = 0xff00ff) => {
        const planeGeometry = new THREE.PlaneGeometry(width, height)
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.FrontSide,
            transparent: true,
        })
        return new THREE.Mesh(planeGeometry, material)
    }

    const west = createPlane(size.x, size.y, 0xff0000)
    west.position.z = -size.z / 2
    west.geometry.translate(
        center.x,
        center.y,
        center.z,
    )

    const east = createPlane(size.x, size.y, 0x00ff00)
    east.position.z = size.z / 2
    east.geometry.translate(
        center.x,
        center.y,
        center.z,
    )

    const north = createPlane(size.z, size.y, 0x0000ff);
    north.rotation.y = Math.PI / 2
    north.position.x = size.x / 2
    north.geometry.translate(
        -center.z,
        center.y,
        center.x,
    )

    const south = createPlane(size.z, size.y, 0xffff00);
    south.rotation.y = -Math.PI / 2
    south.position.x = -size.x / 2
    south.geometry.translate(
        -center.z,
        center.y,
        center.x,
    )

    const up = createPlane(size.x, size.z, 0xff00ff);
    up.position.y = size.y / 2
    up.rotation.x = -Math.PI / 2
    up.geometry.translate(
        center.x,
        -center.z,
        center.y,
    )

    const down = createPlane(size.x, size.z, 0x00ffff);
    down.position.y = -size.y / 2
    down.rotation.x = Math.PI / 2
    down.geometry.translate(
        center.x,
        -center.z,
        -center.y,
    )

    return [
        west,
        east,
        north,
        south,
        up,
        down,
    ]
}

/**
 * @param {THREE.Object3D} obj your object (`THREE.Object3D` or derived)
 * @param {THREE.Vector3} point the point of rotation (`THREE.Vector3`)
 * @param {THREE.Vector3} axis the axis of rotation (normalized `THREE.Vector3`)
 * @param {number} theta radian value of rotation
 * @param {boolean} [pointIsWorld=true] boolean indicating the point is in world coordinates
 */
function rotateAboutPoint(obj, point, axis, theta, pointIsWorld = false) {
    if (pointIsWorld) {
        obj.parent?.localToWorld(obj.position) // compensate for world coordinate
    }

    obj.position.sub(point) // remove the offset
    obj.position.applyAxisAngle(axis, theta) // rotate the POSITION
    obj.position.add(point) // re-add the offset

    if (pointIsWorld) {
        obj.parent?.worldToLocal(obj.position) // undo world coordinates compensation
    }

    obj.rotateOnAxis(axis, theta) // rotate the OBJECT
}

/**
 * @typedef {THREE.DataTexture & { animation?: import('./pack-types').Animation['animation'] }} AnimatedTexture
 */

/**
 * @template {readonly unknown[]} ArrayType
 * @typedef {ArrayType extends readonly (infer ElementType)[] ? ElementType : never} ArrayElement
 * @param {import('./model').AnyModel} model
 * @param {number} width
 * @param {number} height
 * @param {Transformations | null} transformations
 * @param {number} animationIndex
 */
function render(model, width, height, transformations = null, animationIndex = 0) {
    if (!model.elements) { return null }

    /** @type {{ [filePath: string]: THREE.DataTexture }} */
    const textures = {}

    /** @returns {THREE.DataTexture | null} */
    const getTexture = (/** @type {string} */ filePath) => {
        let result = textures[filePath]

        if (!result) {
            if (!fs.existsSync(filePath)) { return null }

            /** @type {PNG} */
            let textureData = PNG.sync.read(fs.readFileSync(filePath))

            if (fs.existsSync(filePath + '.mcmeta')) {
                /** @type {import('./pack-types').Animation['animation']} */
                const animation = JSON.parse(fs.readFileSync(filePath + '.mcmeta', 'utf8'))['animation']
                const frameCount = (animation.frames?.length) ?? (textureData.width / textureData.height)
                const clampedAnimationIndex = animationIndex % frameCount
                const frame = (animation.frames) ? animation.frames[clampedAnimationIndex] : clampedAnimationIndex
                const frameIndex = (typeof frame === 'number') ? frame : frame.index

                const oneFrame = new PNG({
                    width: textureData.width,
                    height: textureData.width
                })

                PNG.bitblt(textureData, oneFrame, 0, oneFrame.height * frameIndex, oneFrame.width, oneFrame.height)

                textureData = oneFrame
            }

            result = new THREE.DataTexture(
                Uint8Array.from(textureData.data),
                textureData.width,
                textureData.height,
                THREE.RGBAFormat,
                THREE.UnsignedByteType,
                THREE.UVMapping,
            )
            result.needsUpdate = true
            textures[filePath] = result
        }

        return result
    }

    let perspective = false

    const camera = (() => {
        if (perspective) {
            const camera = new THREE.PerspectiveCamera(5, width / height)
            camera.position.set(200, 200, 200)
            camera.lookAt(new THREE.Vector3(0, 0, 0))
            return camera
        } else {
            const depth = 37
            const aspect = width / height
            const height_ortho = depth * 2 * Math.atan(45 * (Math.PI / 180) / 2)
            const width_ortho = height_ortho * aspect
            const camera = new THREE.OrthographicCamera(
                width_ortho / -2, width_ortho / 2,
                height_ortho / 2, height_ortho / -2)
            camera.position.set(50, 50, 50)
            camera.lookAt(new THREE.Vector3(0, 0, 0))
            return camera
        }
    })()

    const scene = new THREE.Scene()

    for (const element of model.elements) {
        if (!element.from || !element.to || !element.faces) { continue }
        const from = new THREE.Vector3(
            element.from[0],
            element.from[1],
            element.from[2]
        )
        const size = new THREE.Vector3(
            Math.abs(element.to[0] - element.from[0]),
            Math.abs(element.to[1] - element.from[1]),
            Math.abs(element.to[2] - element.from[2]),
        )
        size.addScalar(2)
        const offset = new THREE.Vector3(
            -size.x,
            -size.y,
            -size.z,
        )
        offset.add(from)

        const cube = getElementCube(element)

        if (!cube) { continue }

        /** @type {(ArrayElement<ReturnType<generateCube>> | null)[]} */
        let [
            west,
            east,
            north,
            south,
            up,
            down,
        ] = generateCube(cube.center, cube.size)
        
        if ('__comment' in element) {
            if (west) west.name = `${element.__comment}_west`
            if (east) east.name = `${element.__comment}_east`
            if (north) north.name = `${element.__comment}_north`
            if (south) south.name = `${element.__comment}_south`
            if (up) up.name = `${element.__comment}_up`
            if (down) down.name = `${element.__comment}_down`
        }

        const applyFace = (/** @type {import('./model').FaceName} */ faceName, /** @type {ArrayElement<ReturnType<generateCube>> | null} */ mesh) => {
            if (!mesh) { return null }
            const face = element.faces?.[faceName]
            if (!face) { return null }
            if (!face.texture) { return null }

            const mat = mesh.material
            mat.map = getTexture(face.texture)

            if (mat.map &&
                'width' in mat.map.image &&
                'height' in mat.map.image) {
                if (face.rotation) {
                    mat.map = mat.map.clone()
                    mat.map.rotation = face.rotation * Math.PI / 180
                    mat.map.needsUpdate = true
                }

                let uv = face.uv
                if (!uv &&
                    element.from &&
                    element.to) {
                    switch (faceName) {
                        case 'north':
                            uv = [
                                element.from[2],
                                element.from[1],
                                element.to[2],
                                element.to[1],
                            ]
                            break

                        case 'south':
                            uv = [
                                element.from[2],
                                element.from[1],
                                element.to[2],
                                element.to[1],
                            ]
                            break
    
                        case 'east':
                            uv = [
                                element.from[0],
                                element.from[1],
                                element.to[0],
                                element.to[1],
                            ]
                            break

                        case 'west':
                            uv = [
                                element.from[0],
                                element.from[1],
                                element.to[0],
                                element.to[1],
                            ]
                            break

                        case 'up':
                            uv = [
                                element.from[0],
                                element.from[2],
                                element.to[0],
                                element.to[2],
                            ]
                            break

                        case 'down':
                            uv = [
                                element.from[0],
                                element.from[2],
                                element.to[0],
                                element.to[2],
                            ]
                            break

                        default:
                            break
                    }
                }

                if (uv) {
                    const imageSize = new THREE.Vector2(mat.map.image.width, mat.map.image.height)
                    setPlaneUvs(mesh.geometry, uv, imageSize)
                }
            }

            return mesh
        }

        north = applyFace('north', north)
        south = applyFace('south', south)
        west = applyFace('west', west)
        east = applyFace('east', east)
        up = applyFace('up', up)
        down = applyFace('down', down)

        if (element.rotation && element.rotation.axis && element.rotation.angle) {
            const group = new THREE.Group()
            if (up) group.add(up)
            if (north) group.add(north)
            if (east) group.add(east)
            if (west) group.add(west)
            if (south) group.add(south)
            if (down) group.add(down)

            let axis

            switch (element.rotation.axis) {
                case 'x':
                    axis = new THREE.Vector3(1, 0, 0)
                    break
                case 'y':
                    axis = new THREE.Vector3(0, 1, 0)
                    break
                case 'z':
                    axis = new THREE.Vector3(0, 0, 1)
                    break
                default:
                    return null
            }

            rotateAboutPoint(
                group,
                new THREE.Vector3(
                    element.rotation.origin?.[0] ?? 0,
                    element.rotation.origin?.[1] ?? 0,
                    element.rotation.origin?.[2] ?? 0,
                ),
                axis,
                element.rotation.angle * (Math.PI / 180)
            )

            scene.add(group)
        } else {
            if (up) scene.add(up)
            if (north) scene.add(north)
            if (east) scene.add(east)
            if (west) scene.add(west)
            if (south) scene.add(south)
            if (down) scene.add(down)
        }
    }

    const renderer = new SoftwareRenderer({
        alpha: true
    })
    renderer.setSize(width, height)
    const imageData = renderer.render(scene, camera)
    return imageData
}

/**
 * @typedef {{
 *   offset?: [ number, number, number ];
 *   scale?: [ number, number, number ];
 *   rotation?: {
 *     axis: [ number, number, number ];
 *     theta: number;
 *   };
 * }} Transformations
 */

/**
 * @param {string | undefined} modelPath
 * @param {string | pack.ResourcePack} resourcePack
 * @param {number} width
 * @param {number} height
 * @param {Transformations | null} transformations
 * @param {number} transformations
 * @returns {{
 *  width: number;
 *  height: number;
 *  data: Uint8ClampedArray;
 * } | null}
 */
module.exports = function(modelPath, resourcePack, width, height, transformations = null, frame = 0) {
    if (!modelPath) { return null }

    const maxTextureInheritanceDepth = 10

    if (typeof resourcePack === 'string') { resourcePack = new pack.ResourcePack(resourcePack) }

    const model = modelStuff(modelPath, resourcePack)
    if (!model || !model.elements) { return null }

    for (const element of model.elements) {
        for (const faceName in element.faces) {
            const face = element.faces[faceName]
            let iterations = 0
            while (face.texture.startsWith('#') && iterations++ < maxTextureInheritanceDepth) {
                if (model.textures && model.textures[face.texture.replace('#', '')]) {
                    face.texture = model.textures[face.texture.replace('#', '')]
                }
            }
            if (face.texture.startsWith('#')) { continue }
            const namespace = resourcePack.getNamespace(face.texture, 'minecraft')
            face.texture = namespace?.getFile('textures', face.texture + '.png') ?? face.texture
        }
    }

    delete model.textures

    return render(model, width, height, transformations, frame)
}
