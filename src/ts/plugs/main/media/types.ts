export interface Media extends MediaMetadata {
  id: string;
  title: string;
  artist: string;
  profile: string;
  album: string;
  artwork: Array<{
    src: string;
    sizes?: string;
    type?: string;
  }>;
  chapterInfo: Array<{
    title: string;
    startTime: number;
    artwork: Array<{
      src: string;
      sizes?: string;
      type?: string;
    }>;
  }>;
  links: Record<"title" | "artist" | "profile", string>;
  autoGenerate: boolean;
}
