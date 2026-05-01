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
  title: string
  artist: string
  cover?: string
  src: string
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
