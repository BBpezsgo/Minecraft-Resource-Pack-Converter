/**
 * @param {string} id
 * @param {{ [id: string]: string }} obj
 */
function GetPair(id, obj) {
    if (obj[id]) {
        return {
            key: id,
            value: obj[id],
        }
    }

    const keys = Object.keys(obj)
    for (const key of keys) {
        if (obj[key] === id) {
            return {
                key: key,
                value: obj[key],
            }
        }
    }

    return null
}

/**
 * @param {string} value
 * @param {{ [id: string]: string }} obj
 */
function GetKey(value, obj) {
    const keys = Object.keys(obj)
    for (const key of keys) {
        if (obj[key] === value) {
            return key
        }
    }

    return null
}

module.exports = {
    GetKey,
    GetPair,
}
