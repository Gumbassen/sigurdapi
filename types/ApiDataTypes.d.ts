
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

        interface TimeTag {
            Id:          number
            CompanyId:   number
            Name:        string
            BasisAmount: number
            BasisType:   number
            RuleIds:     number[]
        }

        interface TimeTagRule {
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
        }

        interface TimeEntryTypeCollection {
            Id:              number
            CompanyId:       number
            UserId:          number
            TimeEntryTypeId: number
            RuleIds:         number[]
        }

        interface FullTimeEntryTypeCollection extends TimeEntryTypeCollection{
            Rules: TimeTag[]
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

