import { Router } from 'express'
import getRoles from './getRoles'

export default function(router: Router)
{
    getRoles(router)
}
