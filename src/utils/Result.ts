/* eslint-disable @typescript-eslint/no-explicit-any */

export class Result<V, E extends Error = Error> implements Promise<V>
{
    public readonly [Symbol.toStringTag] = 'Result'

    public static ok<V>(value: V): Result<V>
    {
        return new this<V>('OK', value)
    }

    public static err<V, E extends Error>(error: E): Result<V, E>
    {
        return new this<V, E>('ERROR', error)
    }

    private constructor(type: 'OK', value: V);
    private constructor(type: 'ERROR', error: E);
    private constructor(private type: 'OK' | 'ERROR', private value: V | E)
    {}
    
    public unwrap(): V
    {
        if(this.isError())
            throw this.value as E
        return this.value as V
    }

    public isError(): boolean
    {
        return this.type === 'ERROR'
    }

    public isOk(): boolean
    {
        return this.type === 'OK'
    }

    public getError(): E
    {
        if(!this.isError())
            throw new Error('Cannot get wrapped error of an OK result')
        return this.value as E
    }

    public getValue(): V
    {
        if(!this.isOk())
            throw new Error('Cannot get wrapped value of an ERROR result')
        return this.value as V
    }

    public asPromise(): Promise<V>
    {
        if(this.isOk())
            return Promise.resolve(this.value as V)
        return Promise.reject(this.value as E)
    }

    public then<T1 = V, T2 = E>(onfulfilled?: ((value: V) => T1 | PromiseLike<T1>) | null, onrejected?: ((reason: any) => T2 | PromiseLike<T2>) | null): Promise<T1 | T2>
    {
        return this.asPromise().then(onfulfilled, onrejected)
    }

    public catch<T = E>(onrejected?: ((reason: any) => T | PromiseLike<T>) | null | undefined): Promise<V | T>
    {
        return this.asPromise().catch(onrejected)
    }

    public finally(onfinally?: (() => void) | null | undefined): Promise<V>
    {
        return this.asPromise().finally(onfinally)
    }
}
