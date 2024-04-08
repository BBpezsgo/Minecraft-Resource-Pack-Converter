const fs = require('fs')

/**
 * @param {string} text
 */
function CapitalizeFirst(text) {
    return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * @param {string} s
 * @param {string} t
 * @author Angelos Chalaris
 * @link https://www.30secondsofcode.org/js/s/levenshtein-distance
 */
function LevenshteinDistance(s, t) {
    if (!s) return t.length
    if (!t) return s.length
    const arr = []
    for (let i = 0; i <= t.length; i++) {
        arr[i] = [i]
        for (let j = 1; j <= s.length; j++) {
            arr[i][j] =
                i === 0
                    ? j
                    : Math.min(
                        arr[i - 1][j] + 1,
                        arr[i][j - 1] + 1,
                        arr[i - 1][j - 1] + (s[j - 1] === t[i - 1] ? 0 : 1)
                    )
        }
    }
    return arr[t.length][s.length]
}

/**
 * @param {string} folder
 */
function GetFilenames(folder, ext = null) {
    if (!fs.existsSync(folder)) return []
    const files = fs.readdirSync(folder)
    const result = []
    for (const file of files) {
        const _ext = file.split('.')[file.split('.').length - 1]
        if (ext && _ext !== ext) continue
        result.push(file.substring(0, file.length - 1 - _ext.length))
    }
    return result
}

/**
 * @param {string} csv
 */
function ParseCSV(csv) {
    const lines = csv.split('\n')
    const result = []
    for (const line of lines) {
        const segments = line.split(',')
        for (let i = 0; i < segments.length; i++) {
            segments[i] = JSON.parse(segments[i].trim())
        }
        result.push(segments)
    }
    return result
}

/**
 * @template T
 * @param {string | undefined} assetRaw
 * @param {T} defaultNamespace
 * @returns {{ namespace: string | T; relativePath: string; }}
 */
function GetAsset(assetRaw, defaultNamespace) {
    if (!assetRaw) throw new Error(`Field "assetRaw" is null`)

    /** @type {T | string} */
    let namespace = defaultNamespace
    if (assetRaw.includes(':')) {
        namespace = assetRaw.split(':')[0]
        assetRaw = assetRaw.substring(namespace.length + 1)
    }

    return {
        namespace: namespace,
        relativePath: assetRaw,
    }
}

/**
 * @param {number} v
 * @param {number} min
 * @param {number} max
 */
function Clamp(v, min, max) {
    if (v < min) {
        return min
    }
    if (v > max) {
        return max
    }
    return v
}

/**
 * @param {number} v
 * @param {number} min
 * @param {number} max
 */
function Repeat(v, min, max) {
    while (v < min) {
        v = v + min
    }
    while (v > max) {
        v = v - max
    }
    return v
}

/**
 * @template {any} T
 * @param {T} obj
 * @returns {T | undefined}
 */
function PrugeObject(obj) {
    if (!obj) { return obj }

    if (Array.isArray(obj)) {

        for (let i = obj.length; i >= 0; i--) {
            let element = obj[i]
            element = PrugeObject(element)
            if (!element) {
                obj.splice(i, 1)
            }
        }

        if (obj.length === 0) {
            return undefined
        }

        return obj
    }
    
    if (typeof obj === 'object') {
        const keys = Object.keys(obj)
        for (const key of keys) {
            /** @type {any} */
            const value = obj[key]
            obj[key] = PrugeObject(value)
            if (!obj[key]) { delete obj[key] }
        }
        
        if (Object.keys(obj).length === 0) {
            return undefined
        }

        return obj
    }

    return obj
}

module.exports = {
    CapitalizeFirst,
    LevenshteinDistance,
    GetFilenames,
    ParseCSV,
    GetAsset,
    Clamp,
    Repeat,
    PrugeObject,
}
