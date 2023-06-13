import { Router } from 'express'
import getEntrytypes from './getEntrytypes'
import getEntrytype from './getEntrytype'
import postEntrytype from './postEntrytype'
import deleteEntrytype from './deleteEntrytype'

export default function(router: Router)
{
    getEntrytypes(router)
    postEntrytype(router)
    getEntrytype(router)
    deleteEntrytype(router)
}
