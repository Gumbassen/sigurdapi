import { sql, unsafe, escape } from './database'

export class SQLNoResultError extends Error
{
    constructor(message?: string)
    {
        super(message)
    }
}

export function csNumberRow(value: string): number[]
{
    return value.split(',')
        .filter(id => id !== '')
        .map(id => Number.parseInt(id))
}

export async function fetchUsers(companyId: number, field: 'Id' | 'UserRoleId' | 'CompanyId', values: number[]): Promise<Map<number, ApiDataTypes.Objects.User>>
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
            LocationIds:          csNumberRow(row.LocationIds ?? ''),
            TimeTagCollectionIds: csNumberRow(row.TimeTagCollectionIds ?? ''),
        })
    }

    return users
}

export async function fetchUser(companyId: number, field: 'Id', value: number): Promise<ApiDataTypes.Objects.User>
{
    const result = await sql`
        SELECT
            u.Id                                                       AS Id,
            u.UserRoleId                                               AS UserRoleId,
            u.FullName                                                 AS FullName,
            u.FirstName                                                AS FirstName,
            u.MiddleName                                               AS MiddleName,
            u.SurName                                                  AS SurName,
            u.ProfileImage                                             AS ProfileImage,
            IF(u.HiredDate IS NULL, NULL, UNIX_TIMESTAMP(u.HiredDate)) AS HiredDate,
            IF(u.FiredDate IS NULL, NULL, UNIX_TIMESTAMP(u.FiredDate)) AS FiredDate,
            GROUP_CONCAT(xul.LocationId)                               AS LocationIds,
            GROUP_CONCAT(tetc.Id)                                      AS TimeTagCollectionIds
        FROM
            users AS u
        LEFT JOIN x_user_locations AS xul ON
            xul.UserId = u.Id
        LEFT JOIN time_entry_type_collections AS tetc ON
            tetc.CompanyId = u.CompanyId
            AND tetc.UserId = u.Id
        WHERE
            u.CompanyId = ${companyId}
            AND u.${unsafe(field)} = ${value}
        GROUP BY
            u.Id
        LIMIT 1`

    if(!result.length)
        throw new SQLNoResultError(`[CID=${companyId}] User "${field}"="${value}" not found`)

    return {
        Id:                   result[0].Id,
        CompanyId:            result[0].CompanyId,
        UserRoleId:           result[0].UserRoleId,
        FullName:             result[0].FullName,
        FirstName:            result[0].FirstName,
        MiddleName:           result[0].MiddleName ?? undefined,
        SurName:              result[0].SurName,
        ProfileImage:         result[0].ProfileImage ?? undefined,
        HiredDate:            result[0].HiredDate ?? undefined,
        FiredDate:            result[0].FiredDate ?? undefined,
        LocationIds:          csNumberRow(result[0].LocationIds ?? ''),
        TimeTagCollectionIds: csNumberRow(result[0].TimeTagCollectionIds ?? ''),
    }
}

export async function fetchUserLocations(companyId: number, userIds: number[]): Promise<Map<number, ApiDataTypes.Objects.Location>>
{
    const locations = new Map<number, ApiDataTypes.Objects.Location>()

    const results = await sql`
        SELECT
            l.Id AS Id,
            l.Name AS Name,
            l.Description AS Description,
            GROUP_CONCAT(xll.UserId) AS LeaderIds
        FROM
            locations AS l
        LEFT JOIN x_location_leaders AS xll ON
            xll.LocationId = l.Id
        WHERE
            l.CompanyId = ${companyId}
            AND l.Id IN (
                SELECT
                    xul.LocationId
                FROM
                    x_user_locations AS xul
                WHERE
                    xul.UserId IN (${userIds})
            )
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

/**
 * Returned map is indexed by UserId, not UserRoleId.
 */
export async function fetchUserUserRoles(companyId: number, userIds: number[]): Promise<Map<number, ApiDataTypes.Objects.UserRole>>
{
    const roles = new Map<number, ApiDataTypes.Objects.UserRole>()

    const results = await sql`
        SELECT
            u.Id                                    AS UserId,
            ur.Id                                   AS Id,
            ur.Name                                 AS Name,
            ur.Description                          AS Description,
            GROUP_CONCAT(xurp.UserRolePermissionId) AS PermissionIds
        FROM
            users AS u
        LEFT JOIN user_roles AS ur ON
            ur.CompanyId = u.CompanyId
            AND ur.Id = u.UserRoleId
        LEFT JOIN x_user_role_permissions AS xurp ON
            xurp.UserRoleId = ur.Id
        WHERE
            u.CompanyId = ${companyId}
            AND u.Id IN (${userIds})`

    for(const row of results)
    {
        if(!row.UserId) continue

        roles.set(row.UserId, {
            Id:            row.Id,
            CompanyId:     companyId,
            Name:          row.Name,
            Description:   row.Description ?? undefined,
            PermissionIds: csNumberRow(row.PermissionIds ?? ''),
        })
    }

    if(!roles.size)
        throw new SQLNoResultError(`[CID=${companyId}] User "Id" IN ("${userIds.join('","')}") not found`)

    return roles
}

export async function fetchUserRolePermissions(companyId: number, field: 'UserId' | 'UserRoleId' | 'UserRolePermissionId', values: number[]): Promise<Map<number, ApiDataTypes.Objects.UserRolePermission>>
{
    const perms = new Map<number, ApiDataTypes.Objects.UserRolePermission>()

    let subquery: string
    switch(field)
    {
        case 'UserId':
            subquery = /* SQL */`
                SELECT DISTINCT
                    xurp.UserRolePermissionId
                FROM
                    x_user_role_permissions AS xurp
                WHERE
                    xurp.UserRoleId IN (
                        SELECT DISTINCT
                            u.UserRoleId
                        FROM
                            users AS u
                        WHERE
                            u.CompanyId = ${escape(companyId)}
                            AND u.Id IN (${escape(values)})
                    )`
            break

        case 'UserRoleId':
            subquery = /* SQL */`
                SELECT DISTINCT
                    xurp.UserRolePermissionId
                FROM
                    x_user_role_permissions AS xurp
                WHERE
                    xurp.UserRoleId IN (
                        SELECT DISTINCT
                            ur.Id
                        FROM
                            user_roles AS ur
                        WHERE
                            ur.CompanyId = ${escape(companyId)}
                            AND ur.Id IN (${escape(values)})
                    )`
            break

        case 'UserRolePermissionId':
            subquery = escape(values)
            break
    }

    const results = await sql`
        SELECT
            urp.Id          AS Id,
            urp.Name        AS Name,
            urp.Description AS Description
        FROM
            user_role_permissions AS urp
        WHERE
            urp.Id IN (${unsafe(subquery)})`

    if(!results.length)
        throw new SQLNoResultError(`[CID=${companyId}] Field:"${field}" = (${values.join(',')}) not found`)

    for(const row of results)
    {
        perms.set(row.Id, {
            Id:          row.Id,
            Name:        row.Name,
            Description: row.Description ?? undefined,
        })
    }

    return perms
}

export async function fetchLocations(companyId: number, field: 'Id' | 'CompanyId', values: number[]): Promise<Map<number, ApiDataTypes.Objects.Location>>
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

export async function fetchUserRoles(companyId: number, field: 'Id' | 'CompanyId', values: number[]): Promise<Map<number, ApiDataTypes.Objects.UserRole>>
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
    return fetchUserRoles(companyId, 'Id', [userRoleId]).then(roles => roles.get(userRoleId)!)
}

export async function fetchFullUserRole(companyId: number, userRoleId: number): Promise<ApiDataTypes.Objects.FullUserRole>
{
    const roles = await fetchUserRoles(companyId, 'Id', [userRoleId])

    if(!roles.has(userRoleId))
        throw new SQLNoResultError(`[CID=${companyId}] UserRole Id=${userRoleId} not found`)

    const role = roles.get(userRoleId)! as ApiDataTypes.Objects.FullUserRole
    role.Permissions = []

    try
    {
        role.Permissions = Array.from((await fetchUserRolePermissions(companyId, 'UserRoleId', [userRoleId])).values())
    }
    catch(error)
    {
        if(!(error instanceof SQLNoResultError))
            throw error
    }

    return role
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

    if(!result.length)
        throw new SQLNoResultError(`[CID=${companyId}] User ID "${userId}" not found`)

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

export async function fetchTimeTagRules(companyId: number, field: 'Id' | 'TimeTagId', values: number[]): Promise<Map<number, ApiDataTypes.Objects.TimeTagRule>>
{
    const rules = new Map<number, ApiDataTypes.Objects.TimeTagRule>()

    const results = await sql`
        SELECT
            ttr.Id                      AS Id,
            ttr.TimeTagId               AS TimeTagId,
            ttr.Name                    AS Name,
            ttr.Type                    AS Type,
            ttr.FromTime                AS FromTime,
            ttr.ToTime                  AS ToTime,
            ttr.Amount                  AS Amount,
            GROUP_CONCAT(xttrw.Weekday) AS Weekdays
        FROM
            timetag_rules AS ttr
        LEFT JOIN x_timetag_rule_weekdays AS xttrw ON
            xttrw.TimeTagRuleId = ttr.Id
        WHERE
            ttr.CompanyId = ${companyId}
            AND ttr.${unsafe(field)} IN (${values})
        GROUP BY
            ttr.Id`

    for(const row of results)
    {
        rules.set(row.Id, {
            Id:        row.Id,
            CompanyId: companyId,
            TimeTagId: row.TimeTagId,
            Name:      row.Name,
            Type:      row.Type,
            FromTime:  row.FromTime,
            ToTime:    row.ToTime,
            Amount:    row.Amount,
            Weekdays:  row.Weekdays.split(',').filter((x: string) => x !== ''),
        })
    }

    return rules
}

export async function fetchTimetags(companyId: number, field: 'Id' | 'CompanyId', values: number[]): Promise<Map<number, ApiDataTypes.Objects.FullTimeTag>>
{
    const tags = new Map<number, ApiDataTypes.Objects.FullTimeTag>()

    const results = await sql`
        SELECT
            tt.Id          AS Id,
            tt.Name        AS Name,
            tt.BasisType   AS BasisType,
            tt.BasisAmount AS BasisAmount
        FROM
            timetags AS tt
        WHERE
            tt.CompanyId = ${companyId}
            AND tt.${unsafe(field)} IN (${values})
        GROUP BY
            tt.Id`

    const rulesByTimeTag: { [TimeTagId: ApiDataTypes.Objects.TimeTag['Id']]: ApiDataTypes.Objects.TimeTagRule[] } = {}
    for(const [ , rule ] of await fetchTimeTagRules(companyId, 'TimeTagId', results.map((row: ApiDataTypes.Objects.TimeTag) => row.Id)))
    {
        rulesByTimeTag[rule.TimeTagId] ??= []
        rulesByTimeTag[rule.TimeTagId].push(rule)
    }

    for(const row of results)
    {
        const rules = rulesByTimeTag[row.Id] ?? []

        tags.set(row.Id, {
            Id:          row.Id,
            CompanyId:   companyId,
            Name:        row.Name,
            BasisType:   row.BasisType,
            BasisAmount: row.BasisAmount,
            RuleIds:     rules.map(({ Id }) => Id),
            Rules:       rules,
        })
    }

    return tags
}

/**
 * Returned map is indexed by LocationId, not UserId.
 */
export async function fetchLocationUsers(companyId: number, locationIds: number[]): Promise<Map<number, ApiDataTypes.Objects.User[]>>
{
    const results = await sql`
        SELECT
            l.Id                     AS Id,
            GROUP_CONCAT(xul.UserId) AS UserIds
        FROM
            locations AS l
        LEFT JOIN x_user_locations AS xul ON
            xul.LocationId = l.Id
        WHERE
            l.CompanyId = ${companyId}
            AND l.Id IN (${locationIds})
        GROUP BY
            l.Id`

    if(!results.length)
        throw new SQLNoResultError(`[CID=${companyId}] Location.Id IN (${locationIds.join(',')}) not found`)

    const locations                                       = new Map<number, ApiDataTypes.Objects.User[]>()
    const userIds: number[]                               = []
    const userLocationLUT: { [UserId: number]: number[] } = {}
    for(const row of results)
    {
        locations.set(row.Id, [])
        for(const userId of csNumberRow(row.UserIds))
        {
            userIds.push(userId)
            userLocationLUT[userId] ??= []
            userLocationLUT[userId].push(row.Id)
        }
    }

    for(const [ id, user ] of await fetchUsers(companyId, 'Id', userIds))
    {
        for(const locationId of userLocationLUT[id])
        {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            locations.get(locationId)!.push(user)
        }
    }

    return locations
}
