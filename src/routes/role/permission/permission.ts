import { Router } from 'express'
import getPermissions from './getPermissions'
import postPermission from './postPermission'
import deletePermission from './deletePermission'

export default function(router: Router)
{
    getPermissions(router)
    postPermission(router)
    deletePermission(router)
}
