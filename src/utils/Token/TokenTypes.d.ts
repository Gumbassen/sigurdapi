
declare type TokenType = import('./TokenSegments').TokenSegments.Payload
declare namespace TokenType
{
    interface Access extends TokenType
    {
        readonly typ: 'access'

        /**
         * UserRole ID: The current users UserRole ID
         */
        readonly rid: ApiDataTypes.Objects.User['UserRoleId']

        /**
         * FullName: The users full name
         */
        readonly fln: ApiDataTypes.Objects.User['FullName']

        /**
         * HiredDate: The users first day of employment (if set)
         */
        readonly hdt: Nullable<NonNullable<ApiDataTypes.Objects.User['HiredDate']>>

        /**
         * FiredDate: The users last day of employment (if set)
         */
        readonly fdt: Nullable<NonNullable<ApiDataTypes.Objects.User['FiredDate']>>

        /**
         * UserRole Permission IDs: All of the users permissions
         */
        readonly prm: import('./../../enums/userpermissions').EUserRolePermission[]

        /**
         * Location IDs: Locations that the user is part of
         */
        readonly loc: ApiDataTypes.Objects.Location['Id'][]

        /**
         * Leader of Location IDs: Locations that the user is a leader of
         */
        readonly llo: ApiDataTypes.Objects.Location['Id'][]
    }

    interface Refresh extends TokenType
    {
        readonly typ: 'refresh'
    }

    type Any = Access | Refresh
}
