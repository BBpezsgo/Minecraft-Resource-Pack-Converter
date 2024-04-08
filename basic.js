/**
 * @exports
 * @template {string} TKey
 * @template TValue
 * @typedef {{ [key in TKey]: TValue }} Map
 */

/**
 * @exports
 * @template TKey
 * @template TValue
 * @typedef {{ key: TKey; value: TValue; }} Pair
 */

/**
 * @template TValue
 * @param {TValue} value
 * @param {{ [id: string]: TValue }} obj
 * @returns {string | null}
 */
function getKey(value, obj) {
    const keys = Object.keys(obj)
    for (const key of keys) {
        if (obj[key] === value) {
            return key
        }
    }

    return null
}

module.exports = {
    getKey,
}
