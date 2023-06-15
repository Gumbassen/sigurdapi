export namespace TokenSegments
{
    export interface Header
    {
        /**
         * Token type: usually "JWT" or "JWE"
         */
        readonly typ: 'JWT' | 'JWE'

        /**
         * Signing algorithm
         */
        readonly alg: 'none' | 'HS256' | 'RS256'

        /**
         * Issuer: string or url
         */
        readonly iss: string

        /**
         * Expiration time: a unix epoch which if passed the token must no longer be accepted
         */
        readonly exp: number

        /**
         * Issued at: a unix epoch of when the token was issued
         */
        readonly ist: number

        /**
         * JWT ID: a practically unique ID for this specific token
         */
        readonly jti: string

        /**
         * Token version: The version of token.ts that created the token
         */
        readonly ver: string
    }

    export interface Payload
    {
        /**
         * Token type: Determines whether this is an access or refresh token
         */
        readonly typ: string

        /**
         * User ID: The current users ID
         */
        readonly uid: number

        /**
         * Company ID: The current users company ID
         */
        readonly cid: number
    }
}
