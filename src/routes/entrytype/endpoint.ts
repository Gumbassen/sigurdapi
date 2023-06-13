import { Router } from 'express'
import getEntrytypes from './getEntrytypes'

export default function(router: Router)
{
    getEntrytypes(router)
}
