
export default function*<V, R>(iterator: Iterable<V>, mapping: (value: V) => R): Generator<R>
{
    for(const i of iterator)
        yield mapping(i)
}
