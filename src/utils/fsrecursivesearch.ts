import fs from 'fs'
import log from './logger'

export default function *fsrecursivesearch(rootPath: fs.PathLike, filter: (dirent: fs.Dirent) => boolean): Generator<string>
{
    try
    {
        const stack: fs.Dir[] = [fs.opendirSync(rootPath)]

        while(stack.length)
        {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const dir = stack.pop()!

            let dirent
            while((dirent = dir.readSync()) !== null)
            {
                const name = `${dir.path}/${dirent.name}`

                if(dirent.isDirectory())
                {
                    stack.push(fs.opendirSync(name))
                    continue
                }

                if(!dirent.isFile()) continue
                if(!filter(dirent)) continue

                yield name
            }

            dir.closeSync()
        }
    }
    catch(error)
    {
        log.error(`Failed to recursively search for routes: "${error}"`)
    }
}
