import * as authApi from '@renderer/features/auth/api'
import type { AuthSession } from '@renderer/features/auth/models'
import { getListMusics, overwriteListMusics } from '@renderer/store/list/action'
import { LIST_IDS } from '@common/constants'
import { getData, saveData } from '@renderer/utils/ipc'
import { playMusicInfo } from '@renderer/store/player/state'

const STORAGE_PREFIX = 'musicCloudSync_'
const MUSIC_SOURCE_PREFIX = 'music:'
const MAX_HISTORY_ITEMS = 200

interface LocalEntry {
  music: LX.Music.MusicInfo
  updatedAt: number
  deleted: boolean
  dirty: boolean
}

interface LocalState {
  history: Record<string, LocalEntry>
  favorites: Record<string, LocalEntry>
}

let session: AuthSession | null = null
let state: LocalState | null = null
let syncTimer: ReturnType<typeof setTimeout> | null = null
let syncPromise: Promise<void> | null = null
let applyingRemote = false

const storageKey = (userId: number) => `${STORAGE_PREFIX}${userId}`

const isSyncableMusic = (value: unknown): value is LX.Music.MusicInfo => {
  if (!value || typeof value !== 'object') return false
  const music = value as Partial<LX.Music.MusicInfo>
  return typeof music.id === 'string' && typeof music.source === 'string' && music.source !== 'local'
}

const musicKey = (music: LX.Music.MusicInfo) => `${music.source}:${music.id}`

const sourceKey = (music: LX.Music.MusicInfo) => `${MUSIC_SOURCE_PREFIX}${music.source}`

const parseMusic = (data: string | null | undefined) => {
  if (!data) return null
  try {
    const music = JSON.parse(data) as unknown
    return isSyncableMusic(music) ? music : null
  } catch {
    return null
  }
}

const musicData = (music: LX.Music.MusicInfo) => JSON.stringify(music)

const createEntry = (music: LX.Music.MusicInfo, updatedAt: number, dirty: boolean, deleted = false): LocalEntry => ({
  music,
  updatedAt,
  dirty,
  deleted,
})

const loadState = async(userId: number) => {
  const stored = await getData<Partial<LocalState>>(storageKey(userId))
  return {
    history: stored?.history ?? {},
    favorites: stored?.favorites ?? {},
  }
}

const persistState = () => {
  if (session && state) saveData(storageKey(session.user.id), state)
}

const getCurrentFavorites = async() => {
  const musicList = await getListMusics(LIST_IDS.LOVE)
  return musicList.filter(isSyncableMusic)
}

const mergeRemoteEntries = (
  target: Record<string, LocalEntry>,
  records: Array<authApi.MusicHistoryRecord | authApi.MusicCollectRecord>,
) => {
  const remoteKeys = new Set<string>()
  for (const record of records) {
    if (!record.source_key.startsWith(MUSIC_SOURCE_PREFIX)) continue
    const music = parseMusic(record.data_json)
    const key = `${record.source_key.slice(MUSIC_SOURCE_PREFIX.length)}:${record.vod_id}`
    remoteKeys.add(key)
    const local = target[key]
    if (record.deleted) {
      if (local && record.update_time >= local.updatedAt) {
        target[key] = createEntry(local.music, record.update_time, false, true)
      }
      continue
    }
    if (!music) continue
    if (!local || record.update_time >= local.updatedAt || !local.dirty) {
      target[key] = createEntry(music, record.update_time, false)
    }
  }

  const now = Date.now()
  for (const [key, local] of Object.entries(target)) {
    if (local.dirty || local.deleted || remoteKeys.has(key)) continue
    local.updatedAt = now
    local.dirty = true
  }
}

const updateFavoritesFromLocal = (favorites: LX.Music.MusicInfo[]) => {
  if (!state) return
  const currentKeys = new Set(favorites.map(musicKey))
  const now = Date.now()
  for (const music of favorites) {
    const key = musicKey(music)
    const local = state.favorites[key]
    if (!local) {
      state.favorites[key] = createEntry(music, 0, false)
    } else if (local.deleted) {
      state.favorites[key] = createEntry(music, now, true)
    } else {
      local.music = music
    }
  }
  for (const local of Object.values(state.favorites)) {
    if (local.deleted || currentKeys.has(musicKey(local.music))) continue
    local.deleted = true
    local.updatedAt = now
    local.dirty = true
  }
}

const applyRemoteFavorites = async() => {
  if (!state) return
  const current = await getCurrentFavorites()
  const currentKeys = new Set(current.map(musicKey))
  const active = Object.values(state.favorites)
    .filter(entry => !entry.deleted)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map(entry => entry.music)
  const activeKeys = active.map(musicKey)
  if (activeKeys.length === currentKeys.size && activeKeys.every(key => currentKeys.has(key))) return

  applyingRemote = true
  try {
    await overwriteListMusics({ listId: LIST_IDS.LOVE, musicInfos: active })
  } finally {
    applyingRemote = false
  }
}

const sendEntry = async(kind: 'history' | 'favorite', entry: LocalEntry) => {
  if (!session || !entry.dirty) return
  const token = session.token
  const source = sourceKey(entry.music)
  const id = entry.music.id
  if (entry.deleted) {
    if (kind === 'history') await authApi.deleteMusicHistory(token, source, id, entry.updatedAt)
    else await authApi.deleteMusicCollect(token, source, id)
  } else if (kind === 'history') {
    await authApi.putMusicHistory(token, {
      source_key: source,
      vod_id: id,
      update_time: entry.updatedAt,
      data_json: musicData(entry.music),
    })
  } else {
    const pic = typeof entry.music.meta?.picUrl === 'string' ? entry.music.meta.picUrl : null
    await authApi.putMusicCollect(token, {
      source_key: source,
      vod_id: id,
      update_time: entry.updatedAt,
      name: entry.music.name,
      pic,
      data_json: musicData(entry.music),
    })
  }
  entry.dirty = false
}

const sendDirtyEntries = async() => {
  if (!state) return
  for (const entry of Object.values(state.history)) await sendEntry('history', entry)
  for (const entry of Object.values(state.favorites)) await sendEntry('favorite', entry)
}

const trimHistory = () => {
  if (!state) return
  const activeEntries = Object.entries(state.history)
    .filter(([, entry]) => !entry.deleted)
    .sort(([, left], [, right]) => right.updatedAt - left.updatedAt)
  const now = Date.now()
  for (const [index, [, entry]] of activeEntries.entries()) {
    if (index < MAX_HISTORY_ITEMS) continue
    entry.deleted = true
    entry.updatedAt = now
    entry.dirty = true
  }
}

const syncNow = async(): Promise<void> => {
  const activeSession = session
  const activeState = state
  if (!activeSession || !activeState || syncPromise) return
  syncPromise = (async() => {
    updateFavoritesFromLocal(await getCurrentFavorites())
    const [history, favorites] = await Promise.all([
      authApi.getMusicHistory(activeSession.token),
      authApi.getMusicCollect(activeSession.token),
    ])
    mergeRemoteEntries(activeState.history, history)
    mergeRemoteEntries(activeState.favorites, favorites)
    await applyRemoteFavorites()
    await sendDirtyEntries()
    persistState()
  })().catch(error => {
    console.warn('[MusicCloudSync] sync failed', error)
  }).finally(() => {
    syncPromise = null
  })
  return syncPromise
}

const scheduleSync = () => {
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    syncTimer = null
    void syncNow()
  }, 1500)
}

const handleListUpdate = (ids: string[]) => {
  if (!applyingRemote && ids.includes(LIST_IDS.LOVE)) scheduleSync()
}

const handleMusicToggled = () => {
  if (!state || !isSyncableMusic(playMusicInfo.musicInfo)) return
  const music = playMusicInfo.musicInfo
  state.history[musicKey(music)] = createEntry(music, Date.now(), true)
  trimHistory()
  persistState()
  scheduleSync()
}

export const startMusicCloudSync = async(nextSession: AuthSession) => {
  stopMusicCloudSync()
  session = nextSession
  state = await loadState(nextSession.user.id)
  window.app_event.on('myListUpdate', handleListUpdate)
  window.app_event.on('musicToggled', handleMusicToggled)
  void syncNow()
}

export const stopMusicCloudSync = () => {
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = null
  window.app_event.off('myListUpdate', handleListUpdate)
  window.app_event.off('musicToggled', handleMusicToggled)
  session = null
  state = null
}

export const syncMusicCloudNow = async() => syncNow()
