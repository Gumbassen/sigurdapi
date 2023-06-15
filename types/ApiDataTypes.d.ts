/* eslint-disable no-use-before-define */

declare namespace ApiDataTypes {
    declare namespace Objects {
        interface TokenObject {
            token:     string
            expiresAt: number
            issuedAt:  number
        }

        interface TimeEntry {
            Id:               number
            CompanyId:        Company['Id']
            UserId?:          User['Id']
            Start:            number
            End:              number
            Duration:         number
            GroupingId?:      number
            MessageIds:       TimeEntryMessage['Id'][]
            LocationId:       Location['Id']
            TimeEntryTypeId?: TimeEntryType['Id']
            Status:           string
        }

        interface TimeEntryMessage {
            Id:          number
            CompanyId:   Company['Id']
            UserId:      User['Id']
            TimeEntryId: TimeEntry['Id']
            CreatedAt:   number
            Message:     string
        }

        interface User {
            Id:                   number
            CompanyId:            Company['Id']
            UserRoleId:           UserRole['Id']
            FullName:             string
            FirstName:            string
            MiddleName?:          string
            SurName:              string
            ProfileImage?:        number
            TimeTagCollectionIds: TimeEntryTypeCollection['Id'][]
            HiredDate?:           number
            FiredDate?:           number
            LocationIds:          Location['Id'][]
            LeaderOfIds:          Location['Id'][]
        }

        interface Company {
            Id:   number
            Name: string
        }

        interface UserRole {
            Id:            number
            CompanyId:     Company['Id']
            Name:          string
            Description?:  string
            PermissionIds: UserRolePermission['Id'][]
        }

        interface Timetag {
            Id:          number
            CompanyId:   Company['Id']
            Name:        string
            BasisAmount: number
            BasisType:   string
            RuleIds:     TimetagRule['Id'][]
        }

        interface TimetagRule {
            Id:        number
            CompanyId: Company['Id']
            TimeTagId: Timetag['Id']
            Name:      string
            Type:      string
            /** Counted in seconds passed since midnight */
            FromTime:  number
            /** Counted in seconds passed since midnight */
            ToTime:    number
            Amount:    number
            Weekdays:  import('../src/enums/timetagweekdays').ETimetagWeekday[]
        }

        interface FullTimetag extends Timetag {
            Rules: TimetagRule[]
        }

        interface TimeEntryTypeCollection {
            Id:              number
            CompanyId:       Company['Id']
            UserId:          User['Id']
            TimeEntryTypeId: TimeEntryType['Id']
            TimeTagIds:      Timetag['Id'][]
        }

        interface FullTimeEntryTypeCollection extends TimeEntryTypeCollection{
            TimeTags: Timetag[]
        }

        interface Location {
            Id:           number
            CompanyId:    Company['Id']
            Name:         string
            Description?: string
            LeaderIds:    User['Id'][]
        }

        interface FullUser extends User {
            Company:            Company
            UserRole:           UserRole
            TimeTagCollections: TimeEntryTypeCollection[]
            Locations:          Location[]
            LeaderOf:           Location[]
        }

        interface UserRolePermission {
            Id:           number
            Name:         string
            Description?: string
        }

        interface FullUserRole extends UserRole {
            Permissions: UserRolePermission[]
        }

        interface FetchedTimeEntryMessage extends TimeEntryMessage {
            User: Partial<User> & {
                UserRoleId:           UserRole['Id']
                FullName:             string
                ProfileImage?:        number
            }
        }

        type FetchedTimeEntry = TimeEntry & (
            {
                WithLocation: true
                Location:     Location
            } | {
                WithLocation: false
                Location:     undefined
            }
        ) & (
            {
                WithMessages: true
                Messages:     FetchedTimeEntryMessage[]
            } | {
                WithMessages: false
                Messages:     undefined
            }
        )

        interface TimeEntryType {
            Id:        number
            CompanyId: Company['Id']
            Name:      string
        }
    }

    declare namespace Responses {
        interface AuthenticationResponse {
            accessToken:  TokenObject
            refreshToken: TokenObject
        }
    
        interface ErrorResponse {
            ErrorCode?: number
            Reason?: string
        }
    }
}

