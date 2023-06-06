/* eslint-disable @typescript-eslint/ban-types */

type RequiredKeys<T> = { [K in keyof T]-?: {} extends { [P in K]: T[K] } ? never : K }[keyof T]
type OptionalKeys<T> = { [K in keyof T]-?: {} extends { [P in K]: T[K] } ? K : never }[keyof T]

type PickRequired<T> = Pick<T, RequiredKeys<T>>
type PickOptional<T> = Pick<T, OptionalKeys<T>>

type NullableifyObject<T> = { [P in keyof T]: T[P] | null }

type NullableOptionals<T> = PickRequired<T> & Nullableify<T>
