import { Router } from 'express'
import getPermissions from './getPermissions'

export default function(router: Router)
{
    getPermissions(router)
}
