
declare namespace ApiDataTypes {
    declare namespace Objects {
        interface TokenObject {
            token:     string
            expiresAt: number
            issuedAt:  number
        }

        interface TimeEntry {
            Id:               number
            CompanyId:        number
            UserId:           number
            Start:            number
            End:              number
            Duration:         number
            GroupingId?:      number
            MessageIds:       number[]
            LocationId:       number
            TimeEntryTypeId?: number
        }

        interface TimeEntryMessage {
            Id:          number
            CompanyId:   number
            UserId:      number
            TimeEntryId: number
            CreatedAt:   number
            Message:     string
        }

        interface User {
            Id:                   number
            CompanyId:            number
            UserRoleId:           number
            FullName:             string
            FirstName:            string
            MiddleName?:          string
            SurName:              string
            ProfileImage?:        number
            TimeTagCollectionIds: number[]
            HiredDate?:           number
            FiredDate?:           number
            LocationIds:          number[]
        }

        interface Company {
            Id:   number
            Name: string
        }

        interface UserRole {
            Id:            number
            CompanyId:     number
            Name:          string
            Description?:  string
            PermissionIds: number[]
        }

        interface Timetag {
            Id:          number
            CompanyId:   number
            Name:        string
            BasisAmount: number
            BasisType:   string
            RuleIds:     number[]
        }

        interface TimetagRule {
            Id:        number
            CompanyId: number
            TimeTagId: number
            Name:      string
            Type:      string
            /** Counted in seconds passed since midnight */
            FromTime:  number
            /** Counted in seconds passed since midnight */
            ToTime:    number
            Amount:    number
            Weekdays:  import('../src/utils/timetagweekdays').ETimetagWeekday[]
        }

        interface FullTimetag extends Timetag {
            Rules: TimetagRule[]
        }

        interface TimeEntryTypeCollection {
            Id:              number
            CompanyId:       number
            UserId:          number
            TimeEntryTypeId: number
            TimeTagIds:      number[]
        }

        interface FullTimeEntryTypeCollection extends TimeEntryTypeCollection{
            TimeTags: Timetag[]
        }

        interface Location {
            Id:           number
            CompanyId:    number
            Name:         string
            Description?: string
            LeaderIds:    number[]
        }

        interface FullUser extends User {
            Company:            Company
            UserRole:           UserRole
            TimeTagCollections: TimeEntryTypeCollection[]
            Locations:          Location[]
        }

        interface UserRolePermission {
            Id:           number
            Name:         string
            Description?: string
        }

        interface FullUserRole extends UserRole {
            Permissions: UserRolePermission[]
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

