import { HTTPMethod } from './HTTPMethod'

export enum ApiRoutePath {
    auth_authenticate                       = '/auth/authenticate',
    auth_refresh                            = '/auth/refresh',
    users                                   = '/users',
    user                                    = '/user',
    user_current                            = '/user/current',
    user_USERID                             = '/user/:userId',
    user_USERID_locations                   = '/user/:userId/locations',
    user_USERID_roles                       = '/user/:userId/roles',
    user_USERID_permissions                 = '/user/:userId/permissions',
    user_USERID_tagcollections              = '/user/:userId/tagcollections',
    user_USERID_tagcollections_COLLECTIONID = '/user/:userId/tagcollections/:collectionId',
    entries                                 = '/entries',
    entry                                   = '/entry',
    entry_ENTRYID                           = '/entry/:entryId',
    entry_ENTRYID_messages                  = '/entry/:entryId/messages',
    timetag                                 = '/timetag',
    timetag_TIMETAGID                       = '/timetag/:timeTagId',
    timetag_TIMETAGID_rules                 = '/timetag/:timeTagId/rules',
    timetag_TIMETAGID_rules_RULEID          = '/timetag/:timeTagId/rules/:ruleId',
    location                                = '/location',
    location_LOCATIONID                     = '/location/:locationId',
    location_LOCATIONID_users               = '/location/:locationId/users',
    location_LOCATIONID_leaders             = '/location/:locationId/leaders',
    location_LOCATIONID_leader_LEADERID     = '/location/:locationId/leader/:leaderId',
    role                                    = '/role',
    role_ROLEID                             = '/role/:roleId',
    role_ROLEID_permission                  = '/role/:roleId/permission',
    role_ROLEID_permission_PERMISSIONID     = '/role/:roleId/permission/:permissionId',
    roles_permission                        = '/roles/permission',
    roles_permission_PERMISSIONID           = '/roles/permission/:permissionId',
}

type ApiRoute = { [path: string | HTTPMethod]: ApiRoutePath | ApiRoute }
type DefinedApiRoute<T> = ApiRoute & T
interface _RouteRoot extends ApiRoute {
    auth: DefinedApiRoute<{
        authenticate: DefinedApiRoute<{
            [HTTPMethod.POST]: ApiRoutePath
        }>
        refresh: DefinedApiRoute<{
            [HTTPMethod.POST]: ApiRoutePath
        }>
    }>
    users: DefinedApiRoute<{
        [HTTPMethod.GET]: ApiRoutePath
    }>
    user: DefinedApiRoute<{
        current: DefinedApiRoute<{
            [HTTPMethod.GET]: ApiRoutePath
        }>
        _userId_: DefinedApiRoute<{
            locations: DefinedApiRoute<{
                [HTTPMethod.GET]: ApiRoutePath
            }>
            roles: DefinedApiRoute<{
                [HTTPMethod.GET]: ApiRoutePath
            }>
            permissions: DefinedApiRoute<{
                [HTTPMethod.GET]: ApiRoutePath
            }>
            tagcollections: DefinedApiRoute<{
                _collectionId_: DefinedApiRoute<{
                    [HTTPMethod.GET]:    ApiRoutePath
                    [HTTPMethod.DELETE]: ApiRoutePath
                }>
                [HTTPMethod.GET]:  ApiRoutePath
                [HTTPMethod.POST]: ApiRoutePath
            }>
            [HTTPMethod.GET]:    ApiRoutePath
            [HTTPMethod.PUT]:    ApiRoutePath
            [HTTPMethod.DELETE]: ApiRoutePath
        }>
        [HTTPMethod.GET]:  ApiRoutePath
        [HTTPMethod.POST]: ApiRoutePath
    }>
    entries: DefinedApiRoute<{
        [HTTPMethod.GET]: ApiRoutePath
    }>
    entry: DefinedApiRoute<{
        _entryId_: DefinedApiRoute<{
            messages: DefinedApiRoute<{
                [HTTPMethod.GET]:  ApiRoutePath
                [HTTPMethod.POST]: ApiRoutePath
            }>
            [HTTPMethod.GET]:    ApiRoutePath
            [HTTPMethod.PUT]:    ApiRoutePath
            [HTTPMethod.DELETE]: ApiRoutePath
        }>
        [HTTPMethod.POST]: ApiRoutePath
    }>
    timetag: DefinedApiRoute<{
        _timeTagId_: DefinedApiRoute<{
            rules: DefinedApiRoute<{
                _ruleId_: DefinedApiRoute<{
                    [HTTPMethod.GET]:    ApiRoutePath
                    [HTTPMethod.DELETE]: ApiRoutePath
                }>
                [HTTPMethod.GET]:  ApiRoutePath
                [HTTPMethod.POST]: ApiRoutePath
            }>
            [HTTPMethod.GET]:    ApiRoutePath
            [HTTPMethod.PUT]:    ApiRoutePath
            [HTTPMethod.DELETE]: ApiRoutePath
        }>
        [HTTPMethod.GET]:  ApiRoutePath
        [HTTPMethod.POST]: ApiRoutePath
    }>
    location: DefinedApiRoute<{
        _locationId_: DefinedApiRoute<{
            users: DefinedApiRoute<{
                [HTTPMethod.GET]: ApiRoutePath.location_LOCATIONID_users
            }>
            leaders: DefinedApiRoute<{
                [HTTPMethod.GET]: ApiRoutePath.location_LOCATIONID_leaders
            }>
            leader: DefinedApiRoute<{
                _leaderId_: DefinedApiRoute<{
                    [HTTPMethod.POST]:   ApiRoutePath.location_LOCATIONID_leader_LEADERID
                    [HTTPMethod.DELETE]: ApiRoutePath.location_LOCATIONID_leader_LEADERID
                }>
            }>
            [HTTPMethod.GET]:    ApiRoutePath.location_LOCATIONID
            [HTTPMethod.PUT]:    ApiRoutePath.location_LOCATIONID
            [HTTPMethod.DELETE]: ApiRoutePath.location_LOCATIONID
        }>,
        [HTTPMethod.GET]:  ApiRoutePath.location
        [HTTPMethod.POST]: ApiRoutePath.location
    }>
    roles: DefinedApiRoute<{
        permission: DefinedApiRoute<{
            _permissionId_: DefinedApiRoute<{
                [HTTPMethod.GET]: ApiRoutePath.roles_permission_PERMISSIONID
            }>
            [HTTPMethod.GET]: ApiRoutePath.roles_permission
        }>
    }>
    role: DefinedApiRoute<{
        _roleId_: DefinedApiRoute<{
            permission: DefinedApiRoute<{
                _permissionId_: DefinedApiRoute<{
                    [HTTPMethod.POST]:   ApiRoutePath.role_ROLEID_permission_PERMISSIONID
                    [HTTPMethod.DELETE]: ApiRoutePath.role_ROLEID_permission_PERMISSIONID
                }>
                [HTTPMethod.GET]: ApiRoutePath.role_ROLEID_permission
            }>
            [HTTPMethod.GET]:    ApiRoutePath.role_ROLEID
            [HTTPMethod.PUT]:    ApiRoutePath.role_ROLEID
            [HTTPMethod.DELETE]: ApiRoutePath.role_ROLEID
        }>
        [HTTPMethod.GET]:  ApiRoutePath.role
        [HTTPMethod.POST]: ApiRoutePath.role
    }>
}

const routes: _RouteRoot = {
    auth: {
        authenticate: {
            [HTTPMethod.POST]: ApiRoutePath.auth_authenticate,
        },
        refresh: {
            [HTTPMethod.POST]: ApiRoutePath.auth_refresh,
        },
    },
    users: {
        [HTTPMethod.GET]: ApiRoutePath.users,
    },
    user: {
        _userId_: {
            locations: {
                [HTTPMethod.GET]: ApiRoutePath.user_USERID_locations,
            },
            roles: {
                [HTTPMethod.GET]: ApiRoutePath.user_USERID_roles,
            },
            permissions: {
                [HTTPMethod.GET]: ApiRoutePath.user_USERID_permissions,
            },
            tagcollections: {
                _collectionId_: {
                    [HTTPMethod.GET]:    ApiRoutePath.user_USERID_tagcollections_COLLECTIONID,
                    [HTTPMethod.DELETE]: ApiRoutePath.user_USERID_tagcollections_COLLECTIONID,
                },
                [HTTPMethod.GET]:  ApiRoutePath.user_USERID_tagcollections,
                [HTTPMethod.POST]: ApiRoutePath.user_USERID_tagcollections,
            },
            [HTTPMethod.GET]:    ApiRoutePath.user_USERID,
            [HTTPMethod.PUT]:    ApiRoutePath.user_USERID,
            [HTTPMethod.DELETE]: ApiRoutePath.user_USERID,
        },
        current: {
            [HTTPMethod.GET]: ApiRoutePath.user_current,
        },
        [HTTPMethod.GET]:  ApiRoutePath.user,
        [HTTPMethod.POST]: ApiRoutePath.user,
    },
    entries: {
        [HTTPMethod.GET]: ApiRoutePath.entries,
    },
    entry: {
        _entryId_: {
            messages: {
                [HTTPMethod.GET]:  ApiRoutePath.entry_ENTRYID_messages,
                [HTTPMethod.POST]: ApiRoutePath.entry_ENTRYID_messages,
            },
            [HTTPMethod.GET]:    ApiRoutePath.entry_ENTRYID,
            [HTTPMethod.PUT]:    ApiRoutePath.entry_ENTRYID,
            [HTTPMethod.DELETE]: ApiRoutePath.entry_ENTRYID,
        },
        [HTTPMethod.POST]: ApiRoutePath.entry,
    },
    timetag: {
        _timeTagId_: {
            rules: {
                _ruleId_: {
                    [HTTPMethod.GET]:    ApiRoutePath.timetag_TIMETAGID_rules_RULEID,
                    [HTTPMethod.DELETE]: ApiRoutePath.timetag_TIMETAGID_rules_RULEID,
                },
                [HTTPMethod.GET]:  ApiRoutePath.timetag_TIMETAGID_rules,
                [HTTPMethod.POST]: ApiRoutePath.timetag_TIMETAGID_rules,
            },
            [HTTPMethod.GET]:    ApiRoutePath.timetag_TIMETAGID,
            [HTTPMethod.PUT]:    ApiRoutePath.timetag_TIMETAGID,
            [HTTPMethod.DELETE]: ApiRoutePath.timetag_TIMETAGID,
        },
        [HTTPMethod.GET]:  ApiRoutePath.timetag,
        [HTTPMethod.POST]: ApiRoutePath.timetag,
    },
    location: {
        _locationId_: {
            users: {
                [HTTPMethod.GET]: ApiRoutePath.location_LOCATIONID_users,
            },
            leaders: {
                [HTTPMethod.GET]: ApiRoutePath.location_LOCATIONID_leaders,
            },
            leader: {
                _leaderId_: {
                    [HTTPMethod.POST]:   ApiRoutePath.location_LOCATIONID_leader_LEADERID,
                    [HTTPMethod.DELETE]: ApiRoutePath.location_LOCATIONID_leader_LEADERID,
                },
            },
            [HTTPMethod.GET]:    ApiRoutePath.location_LOCATIONID,
            [HTTPMethod.PUT]:    ApiRoutePath.location_LOCATIONID,
            [HTTPMethod.DELETE]: ApiRoutePath.location_LOCATIONID,
        },
        [HTTPMethod.GET]:  ApiRoutePath.location,
        [HTTPMethod.POST]: ApiRoutePath.location,
    },
    roles: {
        permission: {
            _permissionId_: {
                [HTTPMethod.GET]: ApiRoutePath.roles_permission_PERMISSIONID,
            },
            [HTTPMethod.GET]: ApiRoutePath.roles_permission,
        },
    },
    role: {
        _roleId_: {
            permission: {
                _permissionId_: {
                    [HTTPMethod.POST]:   ApiRoutePath.role_ROLEID_permission_PERMISSIONID,
                    [HTTPMethod.DELETE]: ApiRoutePath.role_ROLEID_permission_PERMISSIONID,
                },
                [HTTPMethod.GET]: ApiRoutePath.role_ROLEID_permission,
            },
            [HTTPMethod.GET]:    ApiRoutePath.role_ROLEID,
            [HTTPMethod.PUT]:    ApiRoutePath.role_ROLEID,
            [HTTPMethod.DELETE]: ApiRoutePath.role_ROLEID,
        },
        [HTTPMethod.GET]:  ApiRoutePath.role,
        [HTTPMethod.POST]: ApiRoutePath.role,
    },
}

export default routes
