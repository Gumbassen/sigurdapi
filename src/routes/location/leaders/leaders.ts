import { Router } from 'express'
import getLeaders from './getLeaders'
import postLeader from './postLeader'
import deleteLeader from './deleteLeader'

export default function(router: Router)
{
    getLeaders(router)
    postLeader(router)
    deleteLeader(router)
}
