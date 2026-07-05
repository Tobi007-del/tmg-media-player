export type MediaType = "video" | "audio";

export type Dimensions = Record<"width" | "height", number>;

export interface Source {
  src: string;
  type: string;
  media: string;
}
export type Sources = Source[];
export type SrcObject = MediaProvider | null;

export interface Track {
  kind: string;
  label: string;
  srclang: string;
  src: string;
  default: boolean;
  id: string;
}
export type Tracks = Track[];

export interface Metadata extends MediaMetadata {
  id: string;
  title: string;
  artist: string;
  profile: string;
  album: string;
  artwork: Array<Artwork>;
  chapterInfo: Array<{
    title?: string;
    startTime: number;
    artwork?: Array<Artwork>;
  }>;
  links: Partial<Record<"title" | "artist" | "profile", string>>;
  allowOverride: boolean; // Lets YouTube/Vimeo/Parsers inject data
}

export interface Artwork {
  src: string;
  sizes?: string;
  type?: string;
}

export interface PosterPreview {
  usePoster: boolean;
  time: number;
  tease: boolean;
}

export interface AptRange {
  min: number;
  max: number;
  step: number;
}

export interface OptRange {
  min: number;
  max: number;
  skip: number;
}
