
type PrefixObjProps<E, P extends string> = {
    [K in E as K extends string ? `${P}${K}` : never]: K
}

type FirstUppercase<S extends string> = S extends `${infer P1}${infer P2}`
    ? `${Uppercase<P1>}${Lowercase<P2>}`
    : Uppercase<S>

type CamelCase<S extends string> = S extends `${infer P1}_${infer P2}`
    ? `${FirstUppercase<P1>}${CamelCase<P2>}`
    : FirstUppercase<S>

type PrefixCamelCaseObjProps<E, P extends string> = {
    [K in E as K extends string ? CamelCase<`${P}_${K}`> : never]: K
}
