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
}
