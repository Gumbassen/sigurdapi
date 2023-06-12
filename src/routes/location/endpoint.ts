import { Router } from 'express'
import getLocations from './getLocations'
import getLocation from './getLocation'
import postLocation from './postLocation'
import users from './users/users'
import leaders from './leaders/leaders'
import deleteLocation from './deleteLocation'

export default function(router: Router)
{
    getLocations(router)
    getLocation(router)
    postLocation(router)
    deleteLocation(router)

    users(router)
    leaders(router)
}
