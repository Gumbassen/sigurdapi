/* eslint-disable @typescript-eslint/no-explicit-any */


type PromiseResolver<T> = (value: T | PromiseLike<T>) => void
type PromiseRejector    = (reason?: any) => void
type PromiseExecutor<T> = (resolve: PromiseResolver<T>, reject: PromiseRejector) => void

export class TimedPromise<T> implements Promise<T>
{
    /**
     * Creates a TimedPromise that is resolved with an array of results when all of the provided Promises
     * resolve, or rejected when any Promise is rejected.
     * @param values An array of Promises.
     * @returns A new TimedPromise.
     */
    public static all<T extends readonly unknown[] | []>(values: T, timeoutMs: number): TimedPromise<{ -readonly [P in keyof T]: Awaited<T[P]> }>
    {
        return new this((resolve, reject) => Promise.all(values).then(resolve).catch(reject), timeoutMs)
    }

    /**
     * Creates a TimedPromise that is resolved or rejected when any of the provided Promises are resolved
     * or rejected.
     * @param values An array of Promises.
     * @returns A new TimedPromise.
     */
    public static race<T extends readonly unknown[] | []>(values: T, timeoutMs: number): TimedPromise<Awaited<T[number]>>
    {
        return new this((resolve, reject) => Promise.race(values).then(resolve).catch(reject), timeoutMs)
    }

    /**
     * Creates a new rejected promise for the provided reason.
     * @param reason The reason the promise was rejected.
     * @returns A new rejected TimedPromise.
     */
    public static reject<T = never>(reason?: any): TimedPromise<T>
    {
        return new this<T>((_, reject) => Promise.reject(reason).catch(reject), Number.MAX_SAFE_INTEGER)
    }

    /**
     * Creates a new resolved TimedPromise.
     * @returns A resolved TimedPromise.
     */
    public static resolve(): TimedPromise<void>;

    /**
     * Creates a new resolved TimedPromise for the provided value.
     * @param value A promise.
     * @returns A TimedPromise whose internal state matches the provided promise.
     */

    public static resolve<T>(value: T): TimedPromise<Awaited<T>>;

    /**
     * Creates a new resolved TimedPromise for the provided value.
     * @param value A promise.
     * @returns A TimedPromise whose internal state matches the provided promise.
     */
    public static resolve<T>(value: T | PromiseLike<T>): TimedPromise<Awaited<T>>;

    public static resolve<T>(value?: T | PromiseLike<T>): TimedPromise<Awaited<T>>
    {
        if(value === undefined)
            return new this(() => Promise.resolve(value).then(undefined), Number.MAX_SAFE_INTEGER)
        else
            return new this(resolve => Promise.resolve(value).then(resolve), Number.MAX_SAFE_INTEGER)
    }

    public readonly [Symbol.toStringTag] = 'TimedPromise'

    private promise:   Promise<T>
    private rejector?: PromiseRejector
    private resolver?: PromiseResolver<T>

    private hasFinished = false
    private timeout: NodeJS.Timeout

    /**
     * Creates a new TimedPromise.
     * @param executor A callback used to initialize the promise. This callback is passed two arguments:
     * a resolve callback used to resolve the promise with a value or the result of another promise,
     * and a reject callback used to reject the promise with a provided reason or error.
     */
    public constructor(executor: PromiseExecutor<T>, readonly timeoutMs: number)
    {
        this.timeout = setTimeout(() => this.doReject(`TimedPromise timeout after ${timeoutMs}ms`), timeoutMs)
        this.promise = new Promise<T>((resolve, reject) =>
        {
            this.resolver = resolve
            this.rejector = reject
            executor(value => this.doResolve(value), reason => this.doReject(reason))
        }).finally(() => clearTimeout(this.timeout))
    }

    private doResolve(value: T | PromiseLike<T>): void
    {
        if(this.hasFinished) return
        this.resolver?.(value)
    }

    private doReject(reason?: any): void
    {
        if(this.hasFinished) return
        this.rejector?.(reason)
    }
    
    /**
     * Attaches callbacks for the resolution and/or rejection of the TimedPromise.
     * @param onfulfilled The callback to execute when the TimedPromise is resolved.
     * @param onrejected The callback to execute when the TimedPromise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    public then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): Promise<TResult1 | TResult2>
    {
        return this.promise.then(onfulfilled, onrejected)
    }

    /**
     * Attaches a callback for only the rejection of the TimedPromise.
     * @param onrejected The callback to execute when the TimedPromise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    public catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): Promise<T | TResult>
    {
        return this.promise.catch(onrejected)
    }

    /**
     * Attaches a callback that is invoked when the TimedPromise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the TimedPromise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    public finally(onfinally?: (() => void) | undefined | null): Promise<T>
    {
        return this.promise.finally(onfinally)
    }
}
