
// Remember to also implement the extensions in src/utils/extensions.ts
// You also have to import the same file in your index.ts

declare interface Array<T> {
    /**
     * Returns an array that contains all of the unique elements.
     */
    unique(): T[]

    /**
     * Returns an array that contains all elements in this array present in the other array.
     */
    intersect(against: T[]): T[]

    /**
     * Returns an array that contains all elements in this array not present in the other array.
     */
    difference(against: T[]): T[]

    /**
     * Returns true if either array contains elements not present in the other array.
     */
    equals(array: T[]): boolean

    /**
     * Returns true if either array contains elements not present or in the same order in the other array.
     */
    sortedEquals(array: T[]): boolean
}

declare interface String {
    /**
     * Alias for String.padStart(maxLength, '0').
     */
    padZero(maxLength: number): string
}

declare interface Date {
    /**
     * Returns a string with the date formatted as requested.
     * 
     * Available formatting options:
     *  - yyyy: Full 4-digit year
     *  - yy:   Short 2-digit year
     *  - mm:   Zero-padded month number
     *  - dd:   Zero-padded date number
     *  - hh:   Zero-padded hours
     *  - ii:   Zero-padded minutes
     *  - ss:   Zero-padded seconds
     *  - fwd:  Full weekday name
     *  - swd:  Short weekday name (3 characters)
     *  - uuu:  Zero-padded milliseconds (3-digits)
     *  - fmn:  Full month name
     *  - smn:  Short month name
     *  - tz:   Timezone offset with sign
     */
    format(format: string): string
}
