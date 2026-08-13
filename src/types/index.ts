/** Blog post metadata */
export interface BlogPost {
  id: string
  title: string
  date: string
  tags: string[]
  excerpt: string
  content: string
}

/** Music track for the player */
export interface MusicTrack {
  id: string
  /** NetEase song id; empty for local-only tracks. */
  neteaseId?: string
  title: string
  artist: string
  album?: string | null
  cover?: string | null
  /** Seconds, from NetEase metadata. */
  duration?: number | null
  /** Local fallback file, used when NetEase has no playable URL. */
  src: string
  lyrics?: LyricLine[]
}

/** One timed lyric line, with its translation when NetEase provides one. */
export interface LyricLine {
  time: number
  text: string
  trans: string | null
}

/** GitHub repository info */
export interface GitHubRepo {
  name: string
  description: string
  stars: number
  forks: number
  language: string
  url: string
}

/** Calendar day info */
export interface CalendarDay {
  year: number
  month: number
  day: number
  isToday: boolean
  isCurrentMonth: boolean
}

/** Gallery image */
export interface GalleryImage {
  src: string
  alt: string
  thumbnail: string
}

/** Widget layout definition for pixel positioning */
export interface WidgetLayout {
  id: string
  label: string
  left: number
  top: number
  width: number
  height: number
}

/** Drag offset applied on top of base position */
export interface WidgetOffset {
  x: number
  y: number
}

/** Project metadata */
export interface ProjectItem {
  id: string
  name: string
  description: string
  tech: string[]
  url: string
  content: string
}

/** Single news item */
export interface NewsItem {
  id: number
  title: string
  description: string
  url: string
  stars: number | null
}

/** A section (category) of news items */
export interface NewsSection {
  name: string
  items: NewsItem[]
}

/** Top-level news data structure */
export interface NewsData {
  date: string
  updatedAt: string
  sections: NewsSection[]
}
