import { ERROR_CODES } from "./build";

export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ErrorsConfig extends Record<ErrorCode | number, string> {}

export interface ErrorsState {
  code: ErrorCode | number | null;
  message: string | null;
}
