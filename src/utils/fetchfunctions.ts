import { sql, unsafe } from './database'

export function csNumberRow(value: string): number[]
{
    return value.split(',')
        .filter(id => id !== '')
        .map(id => Number.parseInt(id))
}

export async function fetchUsers(companyId: number, field: 'Id' | 'UserRoleId', values: number[]): Promise<Map<number, ApiDataTypes.Objects.User>>
{
    const users = new Map<number, ApiDataTypes.Objects.User>()

    const results = await sql`
        SELECT
            u.Id                         AS Id,
            u.UserRoleId                 AS UserRoleId,
            u.FullName                   AS FullName,
            u.FirstName                  AS FirstName,
            u.MiddleName                 AS MiddleName,
            u.SurName                    AS SurName,
            u.ProfileImage               AS ProfileImage,
            IF(u.HiredDate IS NULL, NULL, UNIX_TIMESTAMP(u.HiredDate)) AS HiredDate,
            IF(u.FiredDate IS NULL, NULL, UNIX_TIMESTAMP(u.FiredDate)) AS FiredDate,
            GROUP_CONCAT(xul.LocationId) AS LocationIds,
            GROUP_CONCAT(tetc.Id)        AS TimeTagCollectionIds
        FROM
            users AS u
        LEFT JOIN x_user_locations AS xul ON
            xul.UserId = u.Id
        LEFT JOIN time_entry_type_collections AS tetc ON
            tetc.CompanyId = u.CompanyId
            AND tetc.UserId = u.Id
        WHERE
            u.CompanyId = ${companyId}
            AND u.${unsafe(field)} IN (${values})
        GROUP BY
            u.Id`

    for(const row of results)
    {
        users.set(row.Id, {
            Id:                   row.Id,
            CompanyId:            companyId,
            UserRoleId:           row.userRoleId,
            FullName:             row.FullName,
            FirstName:            row.FirstName,
            MiddleName:           row.MiddleName ?? undefined,
            SurName:              row.SurName,
            ProfileImage:         row.ProfileImage ?? undefined,
            HiredDate:            row.HiredDate ?? undefined,
            FiredDate:            row.FiredDate ?? undefined,
            LocationIds:          csNumberRow(row.LocationIds),
            TimeTagCollectionIds: csNumberRow(row.TimeTagCollectionIds),
        })
    }

    return users
}

export async function fetchLocations(companyId: number, field: 'Id', values: number[]): Promise<Map<number, ApiDataTypes.Objects.Location>>
{
    const locations = new Map<number, ApiDataTypes.Objects.Location>()

    const results = await sql`
        SELECT
            l.Id                     AS Id,
            l.Name                   AS Name,
            l.Description            AS Description,
            GROUP_CONCAT(xll.UserId) AS LeaderIds
        FROM
            locations AS l
        LEFT JOIN x_location_leaders AS xll ON
            xll.LocationId = l.Id
        WHERE
            l.CompanyId = ${companyId}
            AND l.${unsafe(field)} IN (${values})
        GROUP BY
            l.Id`

    for(const row of results)
    {
        locations.set(row.Id, {
            Id:          row.Id,
            CompanyId:   companyId,
            Name:        row.Name,
            Description: row.Description ?? undefined,
            LeaderIds:   csNumberRow(row.LeaderIds ?? ''),
        })
    }

    return locations
}

export async function fetchCompany(companyId: number): Promise<ApiDataTypes.Objects.Company>
{
    const result = await sql`
        SELECT
            c.Name AS Name
        FROM
            companies AS c
        WHERE
            c.Id = ${companyId}
        LIMIT 1`

    if(!result.length)
        throw new Error('No company result')

    return {
        Id:   companyId,
        Name: result[0].Name,
    }
}

export async function fetchUserRoles(companyId: number, field: 'Id', values: number[]): Promise<Map<number, ApiDataTypes.Objects.UserRole>>
{
    const roles = new Map<number, ApiDataTypes.Objects.UserRole>()

    const results = await sql`
        SELECT
            ur.Id                                   AS Id,
            ur.Name                                 AS Name,
            ur.Description                          AS Description,
            GROUP_CONCAT(xurp.UserRolePermissionId) AS PermissionIds
        FROM
            user_roles AS ur
        LEFT JOIN x_user_role_permissions AS xurp ON
            xurp.UserRoleId = ur.Id
        WHERE
            ur.CompanyId = ${companyId}
            AND ur.${unsafe(field)} IN (${values})
        GROUP BY
            xurp.UserRoleId`

    for(const row of results)
    {
        roles.set(row.Id, {
            Id:            row.Id,
            CompanyId:     companyId,
            Name:          row.Name,
            Description:   row.Description ?? undefined,
            PermissionIds: csNumberRow(row.PermissionIds ?? ''),
        })
    }

    return roles
}

export async function fetchUserRole(companyId: number, userRoleId: number): Promise<ApiDataTypes.Objects.UserRole>
{
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return (await fetchUserRoles(companyId, 'Id', [userRoleId])).get(userRoleId)!
}

export async function fetchTimeEntryTypeCollections(companyId: number, field: 'Id' | 'UserId' | 'TimeEntryTypeId', values: number[]): Promise<Map<number, ApiDataTypes.Objects.TimeEntryTypeCollection>>
{
    const collections = new Map<number, ApiDataTypes.Objects.TimeEntryTypeCollection>()

    const results = await sql`
        SELECT
            tetc.Id                        AS Id,
            tetc.UserId                    AS UserId,
            tetc.TimeEntryTypeId           AS TimeEntryTypeId,
            GROUP_CONCAT(xtetct.TimeTagId) AS RuleIds
        FROM
            time_entry_type_collections AS tetc
        LEFT JOIN x_time_entry_type_collection_timetags AS xtetct ON
            xtetct.TimeEntryTypeCollectionId = tetc.Id
        WHERE
            tetc.CompanyId = ${companyId}
            AND tetc.${unsafe(field)} IN (${values})
        GROUP BY
            xtetct.TimeEntryTypeCollectionId`

    for(const row of results)
    {
        collections.set(row.Id, {
            Id:              row.Id,
            CompanyId:       companyId,
            UserId:          row.UserId,
            TimeEntryTypeId: row.TimeEntryTypeId,
            RuleIds:         csNumberRow(row.RuleIds ?? ''),
        })
    }

    return collections
}

export async function fetchFullUser(companyId: number, userId: number): Promise<ApiDataTypes.Objects.FullUser>
{
    const result = await sql`
        SELECT
            u.UserRoleId                 AS UserRoleId,
            u.FullName                   AS FullName,
            u.FirstName                  AS FirstName,
            u.MiddleName                 AS MiddleName,
            u.SurName                    AS SurName,
            u.ProfileImage               AS ProfileImage,
            IF(u.HiredDate IS NULL, NULL, UNIX_TIMESTAMP(u.HiredDate)) AS HiredDate,
            IF(u.FiredDate IS NULL, NULL, UNIX_TIMESTAMP(u.FiredDate)) AS FiredDate,
            GROUP_CONCAT(xul.LocationId) AS LocationIds,
            GROUP_CONCAT(tetc.Id)        AS TimeTagCollectionIds
        FROM
            users AS u
        LEFT JOIN x_user_locations AS xul ON
            xul.UserId = u.Id
        LEFT JOIN time_entry_type_collections AS tetc ON
            tetc.CompanyId = u.CompanyId
            AND tetc.UserId = u.Id
        WHERE
            u.Id = ${userId}
            AND u.CompanyId = ${companyId}
        GROUP BY
            u.Id
        LIMIT 1`

    const locationIds          = csNumberRow(result[0].LocationIds ?? '')
    const timeTagCollectionIds = csNumberRow(result[0].TimeTagCollectionIds ?? '')

    return {
        Id:                   userId,
        CompanyId:            companyId,
        UserRoleId:           result[0].UserRoleId,
        FullName:             result[0].FullName,
        FirstName:            result[0].FirstName,
        MiddleName:           result[0].MiddleName ?? undefined,
        SurName:              result[0].SurName,
        ProfileImage:         result[0].ProfileImage ?? undefined,
        HiredDate:            result[0].HiredDate ?? undefined,
        FiredDate:            result[0].FiredDate ?? undefined,
        LocationIds:          locationIds,
        Locations:            Array.from((await fetchLocations(companyId, 'Id', locationIds)).values()),
        Company:              await fetchCompany(companyId),
        UserRole:             await fetchUserRole(companyId, result[0].UserRoleId),
        TimeTagCollectionIds: timeTagCollectionIds,
        TimeTagCollections:   Array.from((await fetchTimeEntryTypeCollections(companyId, 'Id', timeTagCollectionIds)).values()),
    }
}
