export type MediaType = "video" | "audio";

export type Dimensions = Record<"width" | "height", number>;

export type SrcObject = MediaProvider | null;

export interface Source {
  src: string;
  type: string;
  media: string;
}
export type Sources = Array<Source>;

export interface Track {
  kind: string;
  label: string;
  srclang: string;
  src: string;
  default: boolean;
  id: string;
}
export type Tracks = Array<Track>;

export interface Metadata extends MediaMetadata {
  id?: string;
  profile: string;
  artwork: Array<Artwork>;
  chapterInfo: Array<ChapterInfo>;
  links: Record<"title" | "artist" | "profile", string>; // | "album"
  allowMediaOverride: boolean; // Lets YouTube/Vimeo/Parsers inject data
}

export interface Artwork {
  src: string;
  sizes?: string;
  type?: string;
}

export interface ChapterInfo {
  title?: string;
  startTime: number;
  artwork?: Array<Artwork>;
}

export interface PosterPreview {
  usePoster: boolean;
  tease: boolean;
  loop: boolean;
  min: number;
  max: number;
}

export interface AptRange {
  min: number;
  max: number;
  step: number | "any";
}

export interface OptRange {
  min: number;
  max: number;
  skip: number;
}
