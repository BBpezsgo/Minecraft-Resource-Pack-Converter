const fs = require('fs')
const path = require('path')
const { sleep } = require('./utils')

/**
 * @param {string} folderA
 * @param {string} folderB
 * @param {'sames' | 'differents'} returnKind
 * @returns {Generator<{ a: string; b?: string; }, void, unknown>}
 */
function* compareFolders(folderA, folderB, returnKind) {
    // @ts-ignore
    const a = (!fs.existsSync(folderA)) ? [ ] : fs.readdirSync(folderA, { encoding: 'utf8', recursive: true })
    // @ts-ignore
    const b = (!fs.existsSync(folderB)) ? [ ] : fs.readdirSync(folderB, { encoding: 'utf8', recursive: true })
    
    for (const _a of a) {
        const fullPathA = path.join(folderA, _a)
        const info = fs.lstatSync(fullPathA)
        if (!info.isFile()) { continue }

        let found = null
        for (const _b of b) {
            if (_a === _b) {
                found = _b
                break
            }
        }

        if (!found) {
            if (returnKind === 'differents') {
                yield { a: fullPathA }
            }
            continue
        }

        const fullPathB = path.join(folderB, found)

        sleep(2)

        const bufferA = fs.readFileSync(fullPathA)
        const bufferB = fs.readFileSync(fullPathB)

        if (bufferA.equals(bufferB)) {
            if (returnKind === 'sames') {
                yield { a: fullPathA, b: fullPathB }
            }
            continue
        }

        if (_a.endsWith('.json') && found.endsWith('.json')) {
            try {
                const jsonA = JSON.stringify(JSON.parse(fullPathA))
                const jsonB = JSON.stringify(JSON.parse(fullPathB))

                if (jsonA === jsonB) {
                    if (returnKind === 'sames') {
                        yield { a: fullPathA, b: fullPathB }
                    }
                } else {
                    if (returnKind === 'differents') {
                        yield { a: fullPathA, b: fullPathB }
                    }
                }

                continue
            } catch (error) {
                
            }
        }

        if (returnKind === 'differents') {
            yield { a: fullPathA, b: fullPathB }
        }
    }
}

module.exports = compareFolders