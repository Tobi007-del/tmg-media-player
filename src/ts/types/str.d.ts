export type TitleCase<S extends string> = S extends `${infer First}${infer Rest}`
  ? `${Uppercase<First>}${Rest}`
  : S;

export type CamelCase<S extends string> = S extends `${infer P1}_${infer P2}${infer P3}`
  ? `${Lowercase<P1>}${Uppercase<P2>}${CamelCase<P3>}`
  : S extends `${infer P1}-${infer P2}${infer P3}`
  ? `${Lowercase<P1>}${Uppercase<P2>}${CamelCase<P3>}`
  : S extends `${infer P1} ${infer P2}${infer P3}`
  ? `${Lowercase<P1>}${Uppercase<P2>}${CamelCase<P3>}`
  : Lowercase<S>;

export type NoCamelCase<
  S extends string,
  Sep extends string = " "
> = S extends `${infer First}${infer Rest}`
  ? First extends Uppercase<First>
    ? `${Sep}${Lowercase<First>}${NoCamelCase<Rest, Sep>}`
    : `${First}${NoCamelCase<Rest, Sep>}`
  : S;
