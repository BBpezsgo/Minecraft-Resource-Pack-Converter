export type AnySkybox = MonocolorSkybox | TexturedSkybox | VanillaSkybox

export type Skybox = {
    schemaVersion: number
    properties?: Properties
    conditions?: Conditions
    decorations?: Decorations
}

export type MonocolorSkybox = Skybox & { 
    type: 'monocolor'
    color: {
        red: number
        green: number
        blue: number
        /** @default 1.0 */
        alpha?: number
    }
}

export type TexturedSkybox =
    AnimatedTexturedSkybox |
    StaticTexturedSkybox |
    MultiTexturedSkybox

export type AnimatedTexturedSkybox =
    AnimatedSquareTexturedSkybox |
    AnimatedSpriteTexturedSkybox

export type AnimatedSquareTexturedSkybox = Skybox & {
    type: 'animated-square-textured'
    texture: string
    textures: { [face: string]: string }
    animationTextures: Array<{
        top: string
        bottom: string
        east: string
        west: string
        north: string
        south: string
    }>
    fps: number
}

export type AnimatedSpriteTexturedSkybox = Skybox & {
    type: 'single-sprite-animated-square-textured'
    texture: string
    textures: { [face: string]: string }
    animationTextures: Array<string>
    fps: number
}

export type StaticTexturedSkybox = Skybox & {
    type: 'square-textured' | 'single-sprite-square-textured'
}

export type MultiTexturedSkybox = Skybox & {
    type: 'multi-texture'
    animations: Array<{
        texture: string
        uvRanges: {
          minU: number
          minV: number
          maxU: number
          maxV: number
        },
        gridColumns: number
        gridRows: number
        duration:number
        frameDuration?: { [frame: string]: number }
    }>
}

export type VanillaSkybox = Skybox & {
    type: 'overworld' | 'end'
}

export type Blend = {
    type:
        'add' |
        'subtract' |
        'multiply' |
        'screen' |
        'replace' |
        'alpha' |
        'dodge' |
        'burn' |
        'darken' |
        'lighten' |
        'decorations' |
        'disable'
} | {
    type: 'custom'
    blender: {
        sFactor: number
        dFactor: number
        equation: number
        /** @default false */
        redAlphaEnabled?: boolean
        /** @default false */
        greenAlphaEnabled?: boolean
        /** @default false */
        blueAlphaEnabled?: boolean
        /** @default false */
        alphaEnabled?: boolean
    }
}

export type Range = { min: number; max: number; }

export type Vector3 = [ number, number, number ]

export type Properties = {
    /** @default 0 */
    priority?: number
    fade: ({
        startFadeIn: number
        endFadeIn: number
        startFadeOut: number
        endFadeOut: number
    } | {
        alwaysOn: boolean
    })
    rotation?: {
        rotationSpeedY?: number
        static?: [number, number, number]
        axis?: [number, number, number]
        timeShift?:[number, number, number]
        skyboxRotation?: boolean
    }
    rotation?: any
    /** @default 20 */
    transitionInDuration?: number
    /** @default 20 */
    transitionOutDuration?: number
    /** @default false */
    changeFog?: boolean
    /** @default { red: 0; green: 0; blue: 0; } */
    fogColors?: { red: number; green: number; blue: number; alpha: number; }
    /** @default true */
    sunSkyTint?: boolean
    /** @default true */
    inThickFog?: boolean
    /** @default 0.0 */
    minAlpha?: number
    /** @default 1.0 */
    maxAlpha?: number
}

export type Conditions = {
    worlds?: Array<string>
    dimensions?: Array<string>
    weather?: Array<string>
    biomes?: Array<string>
    xRanges?: Array<Range>
    yRanges?: Array<Range>
    zRanges?: Array<Range>
    loop?: {
        days: number
        ranges: Array<Range>
    }
    effects?: Array<string>
}

export type Decorations = {
    blend?: {
        type: 
            'add' | 
            'subtract' | 
            'multiply' | 
            'screen' | 
            'replace' | 
            'alpha' | 
            'dodge' | 
            'burn' | 
            'darken' | 
            'lighten' | 
            'decorations' |
            'disable'
    }
    sun?: string
    moon?: string
    showSun?: boolean
    showMoon?: boolean
    showStars?: boolean
    rotation?: {
      rotationSpeedX: number
      static: Vector3
      axis: Vector3
      timeShift: Vector3
      skyboxRotation: any
    }
  }
