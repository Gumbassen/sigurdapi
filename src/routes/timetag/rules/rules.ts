import { Router } from 'express'
import getRules from './getRules'
import getRule from './getRule'
import postRule from './postRule'
import deleteRule from './deleteRule'

export default function(router: Router)
{
    getRules(router)
    getRule(router)
    postRule(router)
    deleteRule(router)
}
