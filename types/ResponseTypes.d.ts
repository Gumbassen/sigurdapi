

declare namespace ResponseTypes {
    interface TokenObject {
        token:     string
        expiresAt: number
        issuedAt:  number
    }
    
    interface AuthenticationResponse {
        accessToken:  TokenObject
        refreshToken: TokenObject
    }

    interface ErrorResponse {
        ErrorCode?: number
        Reason?: string
    }
}
