import type { MusicTrack } from '@/types'

/**
 * The tracklist, and the only place to edit songs.
 *
 * `neteaseId` is the source of truth: tools/fetch-netease.mjs reads this file
 * at build time and writes title, artist, album, cover and timed lyrics into
 * public/music-data/tracks.json. The title and artist here are only what shows
 * before that file loads.
 *
 * `src` stays as a fallback. NetEase refuses a playback URL for VIP and
 * region-restricted songs — 東京フラッシュ is one, in every version including the
 * karaoke cut — so a local file keeps those playable, and covers the case where
 * the unofficial endpoint stops answering. Leave `neteaseId` empty for tracks
 * that are local-only.
 */
export const musicList: MusicTrack[] = [
  {
    id: '1',
    neteaseId: '3348197008',
    title: 'ブレインロット',
    artist: '東京真中 / 重音テト',
    src: '/music/「脑蚀」完整版.mp3',
  },
  {
    id: '2',
    neteaseId: '3341026792',
    title: '月が綺麗ねと言われたい！',
    artist: '柿崎ユウタ',
    src: '/music/moonlight.mp3',
  },
  {
    id: '3',
    neteaseId: '',
    title: '東京フラッシュ',
    artist: 'Vaundy',
    src: '/music/東京フラッシュ(东京闪景) _ Vaundy ：MUSIC VIDEO.mp3',
  },
]
