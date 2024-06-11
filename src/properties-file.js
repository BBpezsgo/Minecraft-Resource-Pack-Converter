/**
 * @typedef {{ [key: string]: string | number | boolean | null }} Properties
 */

/**
 * @param {string} line
 * @returns {null | { key: string; value: string | number | boolean | null; }}
 */
function parseLine(line) {
    if (line.length === 0) { return null }

    if (line.startsWith('#')) { return null }
    if (line.startsWith('!')) { return null }

    if (!line.includes('=')) {
        return {
            key: line,
            value: null,
        }
    }

    const key = line.split('=')[0].trim()
    const value = line.substring(key.length + 1).trim()

    const int = Number.parseInt(value)

    if (!Number.isNaN(int) && int + '' === value) {
        return {
            key: key,
            value: int,
        }
    } else if (value === 'true') {
        return {
            key: key,
            value: true,
        }
    } else if (value === 'false') {
        return {
            key: key,
            value: false,
        }
    } else {
        return {
            key: key,
            value: value,
        }
    }
}

/**
 * @param {string} text
 */
function parse(text) {
    const lines = text.split('\n')
    /** @type {Properties} */
    const result = { }
    for (const _line of lines) {
        const pair = parseLine(_line.trim())
        if (!pair) { continue }

        result[pair.key] = pair.value
    }
    return result
}

/**
 * @param {Properties} data
 * @returns {string}
 */
function stringify(data) {
    let result = ''
    for (const key in data) {
        let value = data[key]
        if (value === null) { continue }
        if (value === undefined) { continue }
        if (value === true) { value = 'true' }
        if (value === false) { value = 'false' }
        if (typeof value === 'number') { value = value.toString() }
        if (result.length > 0) { result += '\r\n' }
        result += `${key}=${value}`
    }
    return result
}

module.exports = {
    parse,
    stringify,
}
