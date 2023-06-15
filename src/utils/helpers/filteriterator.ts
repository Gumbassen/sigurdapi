
export default function*<V>(iterator: Iterable<V>, filter: (value: V) => boolean): Generator<V>
{
    for(const i of iterator)
        if(filter(i)) yield i
}
