
export default function isValidKeyOf<T>(key: string | number | symbol, keys: (keyof T)[]): key is keyof T
{
    return keys.includes(key as keyof T)
}
