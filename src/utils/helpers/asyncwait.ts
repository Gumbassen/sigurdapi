
export default async function asyncwait(timeMS: number): Promise<void>
{
    return new Promise(resolve => setTimeout(resolve, timeMS))
}
