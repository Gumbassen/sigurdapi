import { Router } from 'express'
import getTimetags from './getTimetags'
import getTimetag from './getTimetag'
import postTimetag from './postTimetag'
import putTimetag from './putTimetag'
import deleteTimetag from './deleteTimetag'
import rules from './rules/rules'

export default function(router: Router)
{
    getTimetags(router)
    getTimetag(router)
    postTimetag(router)
    putTimetag(router)
    deleteTimetag(router)

    rules(router)
}
