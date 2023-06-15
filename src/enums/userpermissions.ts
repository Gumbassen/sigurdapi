import { escape, sql, unsafe } from '../utils/database'
import log from '../utils/Logger'
import mapiterator from '../utils/helpers/mapiterator'

export enum EUserRolePermission {
    'superadmin'              = 1,
    'see_own_entries'         = 2,
    'create_own_entries'      = 3,
    'comment_own_entries'     = 4,
    'manage_location_entries' = 5,
    'edit_location_users'     = 6,
    'create_location_users'   = 7,
    'delete_location_users'   = 8,
    'manage_location_logins'  = 9,
    'manage_all_timetags'     = 10,
    'manage_all_leaders'      = 11,
    'manage_all_users'        = 12,
    'manage_all_locations'    = 13,
    'manage_all_roles'        = 14,
}

export type EUserRolePermissionName = keyof typeof EUserRolePermission


const reverseEUserRolePermission = Object.fromEntries(Object.entries(EUserRolePermission).map(([ k, v ]) => [ v, k ])) as unknown as { [x in EUserRolePermission]: EUserRolePermissionName }

// Nasty hack to enable methods on enums
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace EUserRolePermission {
    export function getNameOf(permission: EUserRolePermission): EUserRolePermissionName
    {
        return reverseEUserRolePermission[permission]
    }

    export function parse(permission: number): EUserRolePermission
    {
        if(!Object.values(EUserRolePermission).includes(permission))
            throw new Error(`Permission "${permission}" is not defined in EUserRolePermission`)

        return permission as EUserRolePermission
    }
}

export const userRolePermissions = new Map<number, ApiDataTypes.Objects.UserRolePermission>([
    { Id: EUserRolePermission.superadmin,              Description: 'Has full permissions to everything.' },
    { Id: EUserRolePermission.see_own_entries,         Description: 'Can see their own entries.' },
    { Id: EUserRolePermission.create_own_entries,      Description: 'Can create their own entries.' },
    { Id: EUserRolePermission.comment_own_entries,     Description: 'Can create comments on entries that belong to them.' },
    { Id: EUserRolePermission.manage_location_entries, Description: 'Can manage entries in locations they are leaders of.' },
    { Id: EUserRolePermission.edit_location_users,     Description: 'Can edit others users in locations they are leaders of.' },
    { Id: EUserRolePermission.create_location_users,   Description: 'Can create others users in locations they are leaders of.' },
    { Id: EUserRolePermission.delete_location_users,   Description: 'Can delete others users in locations they are leaders of.' },
    { Id: EUserRolePermission.manage_location_logins,  Description: 'Can manage logins on users in locations they are leaders of.' },
    { Id: EUserRolePermission.manage_all_timetags,     Description: 'Can manage timetags and rules.' },
    { Id: EUserRolePermission.manage_all_leaders,      Description: 'Can manage which users are leaders.' },
    { Id: EUserRolePermission.manage_all_users,        Description: 'Can manage all users.' },
    { Id: EUserRolePermission.manage_all_locations,    Description: 'Can manage all locations.' },
    { Id: EUserRolePermission.manage_all_roles,        Description: 'Can manage all roles.' },
].map(p => [ p.Id, { Id: p.Id, Name: EUserRolePermission.getNameOf(p.Id), Description: p.Description } ]))

export async function verifyDatabase(): Promise<void>
{
    const results = await sql`
        SELECT
            urp.Id AS Id,
            urp.Name AS Name,
            urp.Description AS Description
        from
            user_role_permissions AS urp `

    const names          = Array.from(mapiterator(userRolePermissions.values(), ({ Name }) => Name))
    const collisions     = new Map<number, string>()
    const missingOrWrong = new Map<number, ApiDataTypes.Objects.UserRolePermission>(userRolePermissions)
    for(const row of results)
    {
        const basePermission = userRolePermissions.get(row.Id)

        if(basePermission)
        {
            if(basePermission.Name != row.Name || basePermission.Description != row.Description)
                continue
            missingOrWrong.delete(row.Id)
            continue
        }

        if(names.includes(row.Name))
            collisions.set(row.Id, row.Name)
    }

    if(collisions.size)
    {
        log.warn('❌ The following user role permissions has names that are already in use!')
        for(const [ id, name ] of collisions.entries())
            log.warn(` ${`#${id}`.padStart(3)}: ${name}`)
        return Promise.reject('Base user role permission name collision')
    }

    if(missingOrWrong.size)
    {
        log.warn('❌ The following user role permissions is missing/wrong and will be created/overwritten:')
        const values: string[] = []
        let maxNameLength = 0
        missingOrWrong.forEach(({ Name }) => maxNameLength = Math.max(maxNameLength, Name.length))
        for(const perm of missingOrWrong.values())
        {
            log.warn(` ${`#${perm.Id}`.padStart(3)}: ${perm.Name.padEnd(maxNameLength)} "${perm.Description}"`)
            values.push(`(${escape(perm.Id)},${escape(perm.Name)},${escape(perm.Description)})`)
        }

        await sql`
            INSERT INTO
                user_role_permissions
                (Id, Name, Description)
            VALUES
                ${unsafe(values.join(','))}
            ON DUPLICATE KEY UPDATE
                Name        = VALUES(Name),
                Description = VALUES(Description)`
    }

    return Promise.resolve()
}

export default {
    userRolePermissions,
    verifyDatabase,
}
