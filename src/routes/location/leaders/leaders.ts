import { Router } from 'express'
import getLeaders from './getLeaders'
import postLeader from './postLeader'

export default function(router: Router)
{
    getLeaders(router)
    postLeader(router)
}
