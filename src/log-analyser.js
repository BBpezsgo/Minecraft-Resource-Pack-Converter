const fs = require('fs')
const colors = require('./colors')
const path = require('path')
const relativeLogsPath = 'logs/latest.log'

/**
 * @param {string} minecraftPath
 */
function clear(minecraftPath) {
    const logsPath = path.join(minecraftPath, relativeLogsPath)
    fs.writeFileSync(logsPath, '', 'utf8')
}

/**
 * @param {string} minecraftPath
 */
function load(minecraftPath) {
    const logsPath = path.join(minecraftPath, relativeLogsPath)
    const contentRaw = fs.readFileSync(logsPath, 'utf8').replace(/\0/g, '').replace(/\r/g, '')
    const contentLines = contentRaw.split('\n')

    /**
      @type {{
       content: string
       time?: string
       tag?: string
       severity?: string
       sender?: string
      }[]}
     */
    const parsed = []

    for (let i = 0; i < contentLines.length; i++) {
        let line = contentLines[i]

        if (!line.startsWith('[')) {
            if (parsed.length > 0) {
                parsed[parsed.length - 1].content += '\n' + line
            }
            continue
        }

        const parsedLine = {
            content: line
        }

        const time = line.substring(1, 9)
        line = line.substring(11)

        parsedLine.content = line
        parsedLine.time = time

        if (!line.startsWith('[')) {
            parsed.push(parsedLine)
            continue
        }

        const tag = line.substring(1).split(']')[0]
        line = line.substring(tag.length + 4)

        parsedLine.content = line

        if (tag.includes('/')) {
            parsedLine.tag = tag.split('/')[0]
            parsedLine.severity = tag.split('/')[1]
        } else {
            parsedLine.tag = tag
        }

        if (!line.startsWith('[')) {
            parsed.push(parsedLine)
            continue
        }

        const sender = line.substring(1).split(']')[0]
        line = line.substring(sender.length + 3)

        parsedLine.content = line
        parsedLine.sender = sender

        parsed.push(parsedLine)
    }

    return parsed
}

/**
 * @param {string} minecraftPath
 */
function print(minecraftPath) {
    const logsPath = path.join(minecraftPath, relativeLogsPath)
    const parsed = load(minecraftPath)

    for (const line of parsed) {
        let out = ''
        if (line.content.startsWith('*** ')) {
            out += '\n'
            out += colors.FgMagenta
            out += line.content
            out += '\n'
        } else {
            if (line.sender) {
                out += `[${line.sender}]: `
            }
            if (line.severity) {
                if (line.severity === 'WARN') {
                    out += colors.FgYellow
                } else if (line.severity === 'INFO') {
                    out += colors.FgGray
                } else if (line.severity === 'ERROR') {
                    out += colors.FgRed
                } else {
                    console.log(line.severity)
                    continue
                }
            }
            out += line.content
        }
        out += colors.Reset
        console.log(out)
    }
}

module.exports = {
    clear,
    load,
    print,
}
