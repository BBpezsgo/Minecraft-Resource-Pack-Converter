const fs = require('fs')
const Colors = require('./colors')
const Path = require('path')
const Constants = require('./constants')
const PATH_LOG_GENERAL = 'logs/latest.log'
const PATH_LOGS = Path.join(Constants.Minecraft, PATH_LOG_GENERAL)

function Clear() {
    fs.writeFileSync(PATH_LOGS, '', 'utf8')
}

function Load() {
    const contentRaw = fs.readFileSync(PATH_LOGS, 'utf8')
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
    const parsed = [ ]
    
    for (let i = 0; i < contentLines.length; i++) {
        let line = contentLines[i]
        let parsedLine = {
            content: line
        }
    
        if (!line.startsWith('[')) {
            parsed.push(parsedLine)
            continue
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

function Print() {
    const parsed =  Load()

    for (const line of parsed) {
        let out = ''
        if (line.content.startsWith('*** ')) {
            out += '\n'
            out += Colors.FgMagenta
            out += line.content
            out += '\n'
        } else if (line.severity) {
            if (line.severity === 'WARN') {
                out += Colors.FgYellow
            } else if (line.severity === 'INFO') {
                out += Colors.FgGray
            } else if (line.severity === 'ERROR') {
                out += Colors.FgRed
            } else {
                console.log(line.severity)
                continue
            }
            out += line.content
        } else {
            out += line.content
        }
        out += Colors.Reset
        console.log(out)
    }
}

module.exports = {
    Clear,
    Load,
    Print,
}
