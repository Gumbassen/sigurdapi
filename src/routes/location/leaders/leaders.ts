import { Router } from 'express'
import getLeaders from './getLeaders'

export default function(router: Router)
{
    getLeaders(router)
}
