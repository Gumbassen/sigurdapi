/* eslint-disable no-fallthrough */


export interface IntervalPeriod {
    /** Counted as 365 days */
    years: number
    /** Counted as 30 days */
    months: number
    days: number
    hours: number
    minutes: number
    seconds: number
}

function cascadeOverflow(interval: IntervalPeriod, from: keyof IntervalPeriod, to: keyof IntervalPeriod, modulus: number): number
{
    const r = interval[from] % modulus
    const m = (interval[from] - r) / modulus

    interval[to]   += m
    interval[from]  = r

    return m
}

export default function(str: string): IntervalPeriod
{
    if(str.length < 3)
        throw new Error(`Interval "${str}" is invalid.`)

    const iv: IntervalPeriod = {
        years:   0,
        months:  0,
        days:    0,
        hours:   0,
        minutes: 0,
        seconds: 0,
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

        if('0123456789'.includes(c))
        {
            memory += c
            continue
        }

        if(!'YMDHIS'.includes(c))
            throw new Error(`Interval "${str}" is invalid at char ${i}. Type '${c}' is invalid. Must be one of: [Y, M, D, H, I, S]`)

        if(!memory.length)
            throw new Error(`Interval "${str}" is invalid at char ${i}. A type must be preceeded by an integer.`)

        switch(c + state)
        {
            case 'Y0': state++
                iv.years = Number.parseInt(memory)
                memory = ''
                break

            case 'M0': state++
            case 'M1': state++
                iv.months = Number.parseInt(memory)
                memory = ''
                break

            case 'D0': state++
            case 'D1': state++
            case 'D2': state++
                iv.days = Number.parseInt(memory)
                memory = ''
                break

            case 'H0': state++
            case 'H1': state++
            case 'H2': state++
            case 'H3': state++
                iv.hours = Number.parseInt(memory)
                memory = ''
                break

            case 'I0': state++
            case 'I1': state++
            case 'I2': state++
            case 'I3': state++
            case 'I4': state++
                iv.minutes = Number.parseInt(memory)
                memory = ''
                break

            case 'S0': state++
            case 'S1': state++
            case 'S2': state++
            case 'S3': state++
            case 'S4': state++
            case 'S5': state++
                iv.seconds = Number.parseInt(memory)
                memory = ''
                break

            default:
                throw new Error(`Interval "${str}" is invalid at char ${i}. Type '${c}' is invalid at this point.`)
        }
    }

    cascadeOverflow(iv, 'seconds', 'minutes', 60)
    cascadeOverflow(iv, 'minutes', 'hours', 60)
    cascadeOverflow(iv, 'hours', 'days', 24)
    const months = cascadeOverflow(iv, 'days', 'months', 30)
    iv.days += Math.floor(months * .4) // A single month is closer to 30.4 days on average
    cascadeOverflow(iv, 'months', 'years', 12)

    return iv
}


