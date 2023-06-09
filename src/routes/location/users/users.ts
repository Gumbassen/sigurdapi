import { Router } from 'express'
import getUsers from './getUsers'

export default function(router: Router)
{
    getUsers(router)
}
