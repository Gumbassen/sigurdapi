import { randomFillSync } from 'crypto'

export default function randomHexString(length: number): string
{
    const challenge = new Uint8Array(Math.ceil(length / 2))
    randomFillSync(challenge)
    return challenge.reduce((s, b) => s + b.toString(16).padZero(2), '')
}
