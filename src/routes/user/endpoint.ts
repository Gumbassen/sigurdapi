
import { Router } from 'express'
import getUsers from './getUsers'
import getCurrentUser from './getCurrentUser'
import getUser from './getUser'
import postUser from './postUser'
import putUser from './putUser'
import deleteUser from './deleteUser'
import locations from './locations/locations'
import permissions from './permissions/permissions'
import roles from './roles/roles'
import tagcollections from './tagcollections/tagcollections'

export default function(router: Router)
{
    getUsers(router)
    getCurrentUser(router) // Must be before any of the url-parameter endpoints
    getUser(router)
    postUser(router)
    putUser(router)
    deleteUser(router)

    locations(router)
    permissions(router)
    roles(router)
    tagcollections(router)
}
