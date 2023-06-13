import { Router } from 'express'
import getEntrytypes from './getEntrytypes'
import getEntrytype from './getEntrytype'

export default function(router: Router)
{
    getEntrytypes(router)
    getEntrytype(router)
}
