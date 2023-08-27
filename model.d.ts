export type Point = [number, number, number]
export type Face = 'up' | 'down' | 'north' | 'south' | 'west' | 'east'

export type TextureID = `#${string}`
export type Texture = TextureID | string

export type ModelData = {
    parent?: string,
    ambientocclusion?: boolean
    textures?: {
        [id: string]: Texture | undefined
    }
    elements?: {
        from?: Point
        to?: Point
        faces?: {
            [face: Face]: {
                texture?: TextureID
                cullface?: Face
            } | undefined
        }
    }[]
}
