/* eslint-disable array-bracket-newline */
/* eslint-disable no-fallthrough */

export interface IntervalPeriod {
    /** Counted as 365 days */
    readonly years: number
    /** Counted as 30 days */
    readonly months: number
    readonly days: number
    readonly hours: number
    readonly minutes: number
    readonly seconds: number
    readonly totalSeconds: number
}

type MutableIntervalPeriod = {
    -readonly [K in keyof IntervalPeriod]: IntervalPeriod[K]
}

function cascadeOverflow(interval: MutableIntervalPeriod, from: keyof MutableIntervalPeriod, to: keyof MutableIntervalPeriod, modulus: number): number
{
    const r = interval[from] % modulus
    const m = (interval[from] - r) / modulus

    interval[to]   += m
    interval[from]  = r

    return m
}

type UnitChar = 'Y' | 'M' | 'D' | 'H' | 'I' | 'S'

const UNIT_CHARS     = 'YMDHIS'.split('') as UnitChar[]
const UNIT_POSITIONS = Object.fromEntries<number>(UNIT_CHARS.map((c, i) => [ c, i ])) as { [C in UnitChar]: number }
const DIGIT_CHARS    = '0123456789'.split('')

const isUnitChar = (char: unknown): char is UnitChar => UNIT_CHARS.includes(char as UnitChar)

function unitCharToProp(char: UnitChar): keyof IntervalPeriod
{
    switch(char)
    {
        case 'Y': return 'years'
        case 'M': return 'months'
        case 'D': return 'days'
        case 'H': return 'hours'
        case 'I': return 'minutes'
        case 'S': return 'seconds'
    }
}


export default function intervalparser(str: string): IntervalPeriod
{
    if(str.length < 3)
        throw new Error(`Interval "${str}" is invalid.`)

    const iv: MutableIntervalPeriod = {
        years:        0,
        months:       0,
        days:         0,
        hours:        0,
        minutes:      0,
        seconds:      0,
        totalSeconds: 0,
    }

    let state = 0
    let memory = ''
    for(let i = 0; i < str.length; i++)
    {
        const c = str[i]

        if(i === 0)
        {
            if(c !== 'P')
                throw new Error(`Interval "${str}" must start with a 'P'.`)
            continue
        }

        if(DIGIT_CHARS.includes(c))
        {
            if(!memory.length && c === '0')
                continue

            memory += c
            continue
        }

        if(!isUnitChar(c))
            throw new Error(`Interval "${str}" is invalid at char ${i}. Unit '${c}' is invalid. Must be one of: [Y, M, D, H, I, S]`)

        if(!memory.length)
            throw new Error(`Interval "${str}" is invalid at char ${i}. A unit must be preceeded by an integer.`)

        if(state > UNIT_POSITIONS[c])
            throw new Error(`Interval "${str}" is invalid at char ${i}. Unit '${c}' is too late in the interval.`)

        state = UNIT_POSITIONS[c] + 1
        iv[unitCharToProp(c)] = Number.parseInt(memory)
        memory = ''
    }

    if(memory.length)
        throw new Error(`Interval "${str}" is invalid. An interval must end with a unit.`)

    cascadeOverflow(iv, 'seconds', 'minutes', 60)
    cascadeOverflow(iv, 'minutes', 'hours',   60)
    cascadeOverflow(iv, 'hours',   'days',    24)
    const months = cascadeOverflow(iv, 'days', 'months', 30)
    iv.days += Math.floor(months * .4) // A single month is closer to 30.4 days on average
    cascadeOverflow(iv, 'months', 'years', 12)

    iv.totalSeconds = iv.years   * 31104000
                    + iv.months  *  2592000
                    + iv.days    *    86400
                    + iv.hours   *     3600
                    + iv.minutes *       60
                    + iv.seconds *        1

    return iv
}
