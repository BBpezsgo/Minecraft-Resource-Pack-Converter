module.exports = class Progress {
    /**
     * @private
     * @readonly
     * @type {Progress | null}
     */
    parent

    /**
     * @private
     * @readonly
     * @type {number}
     */
    total

    /**
     * @private
     * @type {number}
     */
    lastTime

    /**
     * @private
     * @type {number}
     */
    current

    get percent() {
        if (!this.total) { return 1 }
        return this.total / this.current
    }

    /**
     * @param {number} current
     * @param {number} total
     */
    static getPercent(current, total) {
        if (!current || !total) { return 1 }
        return current / total
    }

    /**
     * @param {number} current
     * @param {number} total
     */
    static getPercentString(current, total) {
        const percent = this.getPercent(current, total)
        return `${Math.round(percent * 10000) / 100} %`
    }

    /**
     * @param {number} total
     * @param {Progress | null} parent
     */
    constructor(total, parent = null) {
        this.total = total
        this.parent = parent

        this.lastTime = 0
        this.current = 0
    }

    /**
     * @param {number | null} current
     */
    tick(current = null) {
        if (current) {
            this.current = current
        } else {
            this.current++
        }

        const now = performance.now()
        if (now - this.lastTime < 5000) { return }
        this.lastTime = now

        let percent = this.percent
        if (this.parent) {
            const parentPercent = this.parent.percent
            const modifiedPercent = percent / this.parent.total
            percent = parentPercent + modifiedPercent
        }

        console.log(`${Math.round(percent * 10000) / 100} %`)
    }
}
