import { Router } from 'express'
import getLocations from './getLocations'
import getLocation from './getLocation'
import postLocation from './postLocation'
import users from './users/users'
import leaders from './leaders/leaders'

export default function(router: Router)
{
    getLocations(router)
    getLocation(router)
    postLocation(router)

    users(router)
    leaders(router)
}
