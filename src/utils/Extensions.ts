
// Remember to declare the extensions in types/Extensions.d.ts

Array.prototype.unique = function<T>(this: T[]): T[]
{
    const result: T[] = []
    for(const value of this)
    {
        if(result.includes(value))
            continue
        result.push(value)
    }
    return result
}

Array.prototype.intersect = function<T>(this: T[], against: T[]): T[]
{
    return this.filter(value => against.includes(value))
}

Array.prototype.difference = function<T>(this: T[], against: T[]): T[]
{
    return this.filter(value => !against.includes(value))
}

Array.prototype.sortedEquals = function<T>(this: T[], array: T[]): boolean
{
    if(this === array) return false
    if(this.length !== array.length) return false

    for(let i = 0; i < this.length; i++)
    {
        if(this[i] !== array[i])
            return false
    }

    return true
}

// Is probably efficient enough for smaller arrays O(N^2) in worst case O(N log N) in best case
function simpleArrayEquals<T>(aArr: T[], bArr: T[]): boolean
{
    // Keeps track of which elements has been matched to avoid matching the same element if there are duplicates
    const matched = new Array(aArr.length).fill(false)

    let loopStart = 0            // Loop start
    let loopEnd   = bArr.length  // Loop end

    for(const value of aArr)
    {
        let found = false

        for(let idx = loopStart; idx < loopEnd; idx++)
        {
            if(matched[idx])
            {
                // Updates the loop window if we can
                loopStart += +(idx === loopStart - 1)
                loopEnd   -= +(idx === loopEnd - 1)
                continue
            }

            if(value === bArr[idx]) 
            {
                matched[idx] = true
                found = true
                break
            }
        }

        if(!found) return false
    }

    return true
}

// Probably not efficient unless we have A LOT of entries always O(N), but with high overhead
function hashArrayEquals<T>(aArr: T[], bArr: T[]): boolean
{
    const counts = new Map<T, number>()

    for(const value of aArr)
        counts.set(value, (counts.get(value) ?? 0) + 1)

    for(const value of bArr)
        counts.set(value, (counts.get(value) ?? 0) - 1)

    for(const count of counts.values())
        if(count !== 0) return false

    return true
}

Array.prototype.equals = function<T>(this: T[], array: T[]): boolean
{
    if(this === array) return false
    if(this.length !== array.length) return false

    // If the array size is less than 10000 elements we use the naive approach as it has nearly no overhead
    if(this.length < 10000)
        return simpleArrayEquals(this, array)
    
    return hashArrayEquals(this, array)
}

String.prototype.padZero = function(maxLength: number): string
{
    return this.padStart(maxLength, '0')
}

const WEEKDAY_NAMES_LUT = [
    '', // Is here to make the array 1-indexed as the day code is 1-7
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
]
const MONTH_NAMES_LUT = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
]
const WEEKDAY_NAMES_SHORT_LUT = WEEKDAY_NAMES_LUT.map(name => name.substring(0, 3))
const MONTH_NAMES_SHORT_LUT   = MONTH_NAMES_LUT.map(name => name.substring(0, 3))
Date.prototype.format = function(format: string): string
{
    return format.replace(
        /yyyy|yy|mm|dd|hh|ii|ss|fwd|swd|uuu|fmn|smn|tz/g,
        matched =>
        {
            switch(matched)
            {
                default:     return matched
                case 'yyyy': return String(this.getFullYear())
                case 'yy':   return String(this.getFullYear()).substr(-2)
                case 'mm':   return String(this.getMonth() + 1).padZero(2)
                case 'dd':   return String(this.getDate()).padZero(2)
                case 'hh':   return String(this.getHours()).padZero(2)
                case 'ii':   return String(this.getMinutes()).padZero(2)
                case 'ss':   return String(this.getSeconds()).padZero(2)
                case 'fwd':  return WEEKDAY_NAMES_LUT[this.getDay()]
                case 'swd':  return WEEKDAY_NAMES_SHORT_LUT[this.getDay()]
                case 'uuu':  return (String(this.getMilliseconds()) + '000').substr(0, 3)
                case 'fmn':  return MONTH_NAMES_LUT[this.getMonth()]
                case 'smn':  return MONTH_NAMES_SHORT_LUT[this.getMonth()]
                case 'tz': {
                    const absOffset     = Math.abs(this.getTimezoneOffset())
                    const offsetHours   = Math.floor(absOffset / 60)
                    const offsetMinutes = absOffset % 60
                    const sign          = this.getTimezoneOffset() < 0 ? '-' : '+'
                    return `${sign}${String(offsetHours).padZero(2)}${String(offsetMinutes).padZero(2)}`
                }
            }
        }
    )
}
