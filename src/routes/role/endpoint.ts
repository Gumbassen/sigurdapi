
import { Router } from 'express'
import getRoles from './getRoles'
import getRole from './getRole'
import postRole from './postRole'
import putRole from './putRole'
import deleteRole from './deleteRole'
import permission from './permission/permission'

export default function(router: Router)
{
    getRoles(router)
    getRole(router)
    postRole(router)
    putRole(router)
    deleteRole(router)

    permission(router)
}

