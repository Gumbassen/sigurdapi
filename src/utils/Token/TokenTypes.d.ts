
declare type TokenType = import('./TokenSegments').TokenSegments.Payload
declare namespace TokenType
{
    interface Access extends TokenType
    {
        readonly typ: 'access'

        /**
         * UserRole ID: The current users UserRole ID
         */
        readonly rid: number

        /**
         * FullName: The users full name
         */
        readonly fln: string

        /**
         * HiredDate: The users first day of employment (if set)
         */
        readonly hdt: Nullable<number>

        /**
         * FiredDate: The users last day of employment (if set)
         */
        readonly fdt: Nullable<number>

        /**
         * UserRole Permission IDs: All of the users permissions
         */
        readonly prm: EUserRolePermission[]

        /**
         * Location IDs: Locations that the user is part of
         */
        readonly loc: ApiDataTypes.Objects.Location['Id'][]
    }

    interface Refresh extends TokenType
    {
        readonly typ: 'refresh'
    }

    type Any = Access | Refresh
}
