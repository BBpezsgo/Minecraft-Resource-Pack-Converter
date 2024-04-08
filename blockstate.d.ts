import { Map } from './basic'

export type Blockstate =
    BlockstateMultipart |
    BlockstateVariants |
    BlockstateSimple

type BlockstateMultipart = {
    /** Used instead of variants to combine models based on block state attributes. */
    multipart: ConditionalMultipart[]
    variants: undefined
    parent: undefined
}

type BlockstateVariants = {
    multipart: undefined
    /** Holds the names of all the variants of the block. */
    variants: Map<ConditionState | '', Model | WeightedModel[]>
    variants: undefined
    parent: undefined
}

type BlockstateSimple = {
    multipart: undefined
    variants: undefined
    parent: string
    textures: Map<string, string>
}

type ConditionalMultipart = {
    /**
     * A list of cases that have to be met for the model to be applied. If unset, the model always applies.
     */
    when?: ConditionStates | { 'OR': ConditionStates[] } | { 'AND': ConditionStates[] }
    /**
     * Determines the model(s) to apply and its properties. There can be **one model** or an **array of models**.
     * If set to an array, the model is chosen randomly from the options given, with each option being
     * specified in separate subsidiary -tags.
     */
    apply: Model | WeightedModel[]
}

type ConditionStates = Map<ConditionState, string>

type ConditionState = string

/**
 * Name of a variant, which consists of the relevant block states
 * separated by commas. A block with just one variant uses `""`
 * as a name for its variant. Each variant can have **one model**
 * or an **array of models** and contains their properties. If set
 * to an array, the model is chosen randomly from the options
 * given, with each option being specified in separate subsidiary -tags.
 * Item frames are treated as blocks and use `"map=false"` for a map-less
 * item frame, and `"map=true"` for item frames with maps.
 */
type Model = {
    /** Specifies the path to the model file of the block, in form of a resource location. */
    model: string

    /** Rotation of the model on the x-axis in increments of 90 degrees. */
    x?: number
    /** Rotation of the model on the y-axis in increments of 90 degrees. */
    y?: number
    /**
     * Can be `true` or `false` (default).
     * Locks the rotation of the texture of a block, if set to `true`.
     * This way the texture does not rotate with the block when using the x and y-tags above.
     */
    uvlock?: boolean
}

/**
 * Name of a variant, which consists of the relevant block states
 * separated by commas. A block with just one variant uses `""`
 * as a name for its variant. Each variant can have **one model**
 * or an **array of models** and contains their properties. If set
 * to an array, the model is chosen randomly from the options
 * given, with each option being specified in separate subsidiary -tags.
 * Item frames are treated as blocks and use `"map=false"` for a map-less
 * item frame, and `"map=true"` for item frames with maps.
 */
type WeightedModel = Model & {
    /**
     * Sets the probability of the model for being used in the game,
     * defaults to 1 (=100%). If more than one model is used for the same variant,
     * the probability is calculated by dividing the individual model's weight by
     * the sum of the weights of all models. (For example, if three models are used
     * with weights 1, 1, and 2, then their combined weight would be 4 (1+1+2).
     * The probability of each model being used would then be determined by
     * dividing each weight by 4: 1/4, 1/4 and 2/4, or 25%, 25% and 50%, respectively.)
     */
    weight?: number
}
