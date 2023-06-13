import { Router } from 'express'
import getEntrytypes from './getEntrytypes'
import getEntrytype from './getEntrytype'
import deleteEntrytype from './deleteEntrytype'

export default function(router: Router)
{
    getEntrytypes(router)
    getEntrytype(router)
    deleteEntrytype(router)
}
