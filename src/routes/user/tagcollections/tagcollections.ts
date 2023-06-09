import { Router } from 'express'
import getTagCollections from './getTagCollections'
import getTagCollection from './getTagCollection'
import postTagCollection from './postTagCollection'
import deleteTagCollection from './deleteTagCollection'

export default function(router: Router)
{
    getTagCollections(router)
    getTagCollection(router)
    postTagCollection(router)
    deleteTagCollection(router)
}
