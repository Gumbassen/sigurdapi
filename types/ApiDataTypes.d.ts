
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
            Start:            Date
            End:              Date
            Duration:         number
            GroupingId?:      number
            MessageIds:       number[]
            LocationId:       number
            TimeEntryTypeId?: number
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

