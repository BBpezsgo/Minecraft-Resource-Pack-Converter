export type Point = [number, number, number]
export type FaceName = 'up' | 'down' | 'north' | 'south' | 'west' | 'east'
export type DisplayType = 'thirdperson_righthand' | 'thirdperson_lefthand' | 'firstperson_righthand' | 'firstperson_lefthand' | 'gui' | 'head' | 'ground' | 'fixed'
export type TextureID = `#${string}`
export type Texture = TextureID | string

export type Face = {
    uv?: [number, number, number, number]
    texture?: TextureID
    cullface?: FaceName
    rotation?: 0 | 90 | 180 | 270
    tintindex?: number
}

export type ModelElement = {
    from?: Point
    to?: Point
    faces?: {
        [face in FaceName]: Face | undefined
    }
    rotation?: {
        origin?: Point
        axis?: 'x' | 'y' | 'z'
        angle?: number
        rescale?: boolean
    }
    shade?: boolean
}

export type AnyModel = BlockModel | ItemModel

export type BlockModel = {
    credit?: string
    texture_size?: [ number, number ]
    parent?: string
    ambientocclusion?: boolean
    textures?: {
        particle?: Texture
        [id: string]: Texture | undefined
    }
    elements?: Array<ModelElement>
    display?: {
        [display in DisplayType]?: {
            rotation: Point
            translation: Point
            scale: Point
        }
    }
}

export type ItemModel = {
    credit?: string
    texture_size?: [ number, number ]
    parent?: 'item/generated' | 'builtin/entity' | string
    ambientocclusion?: boolean
    textures?: {
        particle?: Texture
        [id: `layer${number}` | string]: Texture | undefined
    }
    gui_light?: 'front' | 'side'
    elements?: Array<ModelElement>
    display?: {
        [display in DisplayType]?: {
            rotation: Point
            translation: Point
            scale: Point
        }
    }
    overrides?: Array<{
        predicate: object
        model: string
    }>
}
