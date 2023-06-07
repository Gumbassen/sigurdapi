
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
