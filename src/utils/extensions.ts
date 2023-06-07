
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
