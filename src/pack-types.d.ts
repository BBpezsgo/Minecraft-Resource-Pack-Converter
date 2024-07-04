import { Map, PackStructure, Version } from './changes'
import { Point } from './model'

export type int = number
export type float = number

/** The root tag */
export type McMeta = {
    /** Holds the resource pack information */
    pack: {
        /** Pack version. If this number does not match the current required number, the resource pack displays an error and requires additional confirmation to load the pack. */
        pack_format: PackFormat
        /** Text shown below the pack name in the resource pack menu. The text is shown on two lines. If the text is too long it is truncated. */
        description: string
    }
    /** Contains additional languages to add to the language menu */
    language?: {
        [/** Language code for a language, corresponding to a .json file with the same name in the folder `assets/<namespace>/lang` */ languageID: string]: {
            /** The full name of the language */
            name: string
            /** The country or region name */
            region: string
            /** If true, the language reads right to left. */
            bidirectional: boolean
        }
    }
    /** Section for filtering out files from resource packs applied below this one. Any file that matches one of the patterns inside block will be treated as if it was not present in the pack at all. */
    filter?: {
        /** List of patterns */
        block: Array<{
            /** A regular expression for the namespace of files to be filtered out. If unspecified, it applies to every namespace. */
            namespace: string
            /** A regular expression for the paths of files to be filtered out. If unspecified, it applies to every file. */
            path: string
        }>
    }
}

export type Sounds = {
    [/** A sound event. The name is usually separated in categories (such as entity.enderman.stare). All default sound events are listed in the table below. (To get a different namespace than minecraft the file must be under a different namespace; not defining it here.) */ event: string]: {
        /**  true/false. Used only in resource packs. True if the sounds listed in sounds should replace the sounds listed in the default sounds.json for this sound event. False if the sounds listed should be added to the list of default sounds. Optional. If undefined, defaults to "false". */
        replace: boolean
        /** Translated as the subtitle of the sound if Show Subtitles is enabled ingame. Accepts formatting codes and displays them properly in-game. Optional. */
        subtitle: string
        /** The sound files this sound event uses. One of the listed sounds is randomly selected to play when this sound event is triggered. Optional. */
        sounds: Array<({
            /** The path to this sound file from the "namespace/sounds" folder (excluding the .ogg file extension). The namespace defaults to minecraft but it can be changed by prepending a namespace and separating it with a :. Uses forward slashes instead of backslashes. May instead be the name of another sound event (according to value of "type"). Note that sound file must have one channel (mono). */
            name: string
            /** The volume for playing this sound. Value is a decimal between 0.0 and 1.0. @default 1.0 */
            volume: float = 1.0
            /** Plays the pitch at the specified value. @default 1.0 */
            pitch: float = 1.0
            /** The chance that this sound is selected to play when this sound event is triggered. Defaults to 1. An example: putting 2 in for the value would be like placing in the name twice. Only accepts integers. */
            weight: int = 1
            /** True if this sound should be streamed from its file. It is recommended that this is set to "true" for sounds that have a duration longer than a few seconds to avoid lag. Used for all sounds in the "music" and "record" categories (except Note Block sounds), as (almost) all the sounds that belong to those categories are over a minute long. Optional. Setting this to false allows many more instances of the sound to be ran at the same time while setting it to true only allows 4 instances (of that type) to be ran at the same time. @default false */
            stream: boolean = false
            /** Modify sound reduction rate based on distance. Used by portals, beacons, and conduits. Defaults to 16. */
            attenuation_distance: int = 16
            /** True if this sound should be loaded when loading the pack instead of when the sound is played. Used by the underwater ambience. Defaults to "false". */ 
            preload: boolean = false
            /** Two values are available: "sound" and "event"; "sound" causes the value of "name" to be interpreted as the name of a file, while "event" causes the value of "name" to be interpreted as the name of an already defined event. @default "sound" */
            type: 'sound' | 'event' = 'sound'
            } | string)>
        // The path to a sound file from the "namespace/sounds" folder (excluding the .ogg file extension). Uses forward slashes. The namespace defaults to minecraft but it can be changed by prepending a namespace and separating it with a :.
        // A sound file. This Object is used only when the sound requires additional Strings.
    }
}

export type Animation = {
    /** Contains data for the animation */
    animation: {
        /** If true, Minecraft generates additional frames between frames with a frame time greater than 1 between them. @default false */
        interpolate: boolean = false
        /** The width of the tile, as a direct ratio rather than in pixels. This is unused in vanilla's files but can be used by resource packs to have frames that are not perfect squares. */
        width: int
        /** The height of the tile as a ratio rather than in pixels. This is unused in vanilla's files but can be used by resource packs to have frames that are not perfect squares. */
        height: int
        /** Sets the default time for each frame in increments of one game tick. @default 1 */
        frametime: int = 1
        /** Contains a list of frames. Defaults to displaying all the frames from top to bottom. */
        frames: Array<(
            // A frame specifies a frame with additional data.
            {
                /** A number corresponding to position of a frame from the top, with the top frame being 0. */
                index: int
                /** The time in ticks to show this frame, overriding "frametime" above. */
                time: int
            } |
            // A number corresponding to position of a frame from the top, with the top frame being 0.
            number
        )>
    }
}

export type RegionalCompliancies = {
    [/** Contains a list of warnings. Note that the key itself is an ISO 3166-1 alpha-3 region code determined by the device's locale setting. */ region: import('./iso3166').RegionCode]: Array<{
        /** Optional. Defines how long should the game wait until showing this message in minutes. This can not be zero. */
        delay: int
        /** The time interval this message should be shown in minutes. This can not be zero. */
        period: int
        /** The translation identifier of the title of the message. A slot is provided for the translation string, containing how many times this warning has been shown. */
        title: string
        /** The translation identifier of the message. A slot is provided for the translation string, how many times this warning has been shown. */
        message: string
    }>
}

export type Fonts = {
    providers: Array<(
        {
            type: 'bitmap'
            /** The resource location of the used file, starting from assets/minecraft/textures by default. Prefacing the location with <namespace>: changes the location to assets/<namespace>/textures. */
            file: string
            /** Optional. The height of the character, measured in pixels. Can be negative. This tag is separate from the area used in the source texture and just rescales the displayed result. @default 8 */
            height: int
            /** The ascent of the character, measured in pixels. This value adds a vertical shift to the displayed result. */
            ascent: int
            /** A list of strings containing the characters replaced by this provider, as well as their order within the texture. All elements must describe the same number of characters. The texture is split into one equally sized row for each element of this list. Each row is split into one equally sized character for each character within one list element. */
            chars: Array<string>
        } |
        /** @deprecated */
        {
            type: 'legacy_unicode'
        } |
        {
            type: 'ttf'
            /** The resource location of the TrueType/OpenType font file within assets/<namespace>/font. */
            file: string
            /** The distance by which the characters of this provider are shifted. */
            shift: Array<float>
            /** Font size to render at. */
            size: float
            /** Resolution to render at, increasing anti-aliasing factor. */
            oversample: float
            /** String of characters or array of characters to exclude. */
            skip: string
        } |
        {
            type: 'space'
            advances: {
                /** The amount of pixels that the following characters are moved to the right. Can be negative. Decimal numbers can be used for precise movement on higher gui scales. */
                [char: string]: float
            }
        }
    )>
}

export type Texture = {
    path: string
    animation?: Animation
}

export type FileOrDirectory = string | Directory

export type Directory = {
    [name: string]: FileOrDirectory
}

export type VersionToPackFormatConverter = {
    [version: string]: PackFormat | undefined
}

export type PackFormatToVersionConverter = {
    [version: number]: Version | undefined
}

export type Font = {  
    /** A list of providers that are merged onto this font. */  
    providers: Array<{
        type: 'bitmap'
        file: string
        height?: number
        ascent: number
        chars: Array<string>
    } | {
        type: 'legacy_unicode'
        sizes: string
        template: string
    } | {
        type: 'ttf'
        file: string
        shift: [ number, number ]
        size: number
        oversample: number
        skip: string
    } | {
        type: 'space'
        advances: {
            [char: string]: number
        }
    }>
}

export type Language = {
    [key: string]: string
}
