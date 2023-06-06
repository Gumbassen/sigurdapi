
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
