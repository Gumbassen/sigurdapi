import { Router } from 'express'
import getLocations from './getLocations'

export default function(router: Router)
{
    getLocations(router)
}
