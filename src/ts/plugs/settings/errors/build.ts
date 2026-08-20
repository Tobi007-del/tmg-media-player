import { ErrorsConfig } from "./types";

export const ERROR_CODES = [
  1, // MEDIA_ERR_ABORTED
  2, // MEDIA_ERR_NETWORK
  3, // MEDIA_ERR_DECODE
  4, // MEDIA_ERR_SRC_NOT_SUPPORTED
  5, // MEDIA_ERR_UNKNOWN
] as const;

export const ERRORS_BUILD: Partial<ErrorsConfig> = {
  1: "The media playback was aborted",
  2: "The media failed due to a network error",
  3: "The media could not be decoded",
  4: "The media source is not supported",
  5: "An unknown error occurred with the media :(",
};
