export interface MusicIdentity {
  id: string
  source: string
}

export interface PlaylistSnapshot<T extends MusicIdentity = MusicIdentity> {
  source: string
  sourceListId: string
  name: string
  songs: T[]
  deleted: boolean
}

export const USER_PLAYLIST_SYNC_SOURCE = 'visoncube-user'

const RESERVED_LIST_IDS = new Set(['default', 'love', 'temp'])

export interface PlaylistSyncIdentity {
  source: string
  sourceListId: string
  isUserPlaylist: boolean
}

export const isUserPlaylistSyncSource = (source: string) => source === USER_PLAYLIST_SYNC_SOURCE

export const isValidUserPlaylistSyncId = (id: string) =>
  Boolean(id.trim()) && id.length <= 512 && !RESERVED_LIST_IDS.has(id)

export const normalizeSourceListId = (source: string, sourceListId: string) => {
  if (isUserPlaylistSyncSource(source)) return sourceListId
  const legacyPrefix = `${source}__`
  return sourceListId.startsWith(legacyPrefix) ? sourceListId.slice(legacyPrefix.length) : sourceListId
}

export const getPlaylistSyncIdentity = (list: {
  id: string
  source?: string
  sourceListId?: string
}): PlaylistSyncIdentity | null => {
  if (list.source && list.sourceListId) {
    if (isUserPlaylistSyncSource(list.source)) {
      return isValidUserPlaylistSyncId(list.sourceListId)
        ? { source: USER_PLAYLIST_SYNC_SOURCE, sourceListId: list.sourceListId, isUserPlaylist: true }
        : null
    }
    const sourceListId = normalizeSourceListId(list.source, list.sourceListId)
    return sourceListId
      ? { source: list.source, sourceListId, isUserPlaylist: false }
      : null
  }
  return isValidUserPlaylistSyncId(list.id)
    ? { source: USER_PLAYLIST_SYNC_SOURCE, sourceListId: list.id, isUserPlaylist: true }
    : null
}

export const shouldKeepPlaylistLocalOnly = (
  isUserPlaylist: boolean,
  syncableSongCount: number,
  localOnlyAfterRemoteDelete: boolean | undefined,
) => isUserPlaylist && syncableSongCount === 0 && localOnlyAfterRemoteDelete === true

export const playlistKey = (source: string, sourceListId: string) =>
  JSON.stringify([source, normalizeSourceListId(source, sourceListId)])

export const snapshotFingerprint = <T extends MusicIdentity>(snapshot: PlaylistSnapshot<T>) =>
  JSON.stringify(snapshot)

export const isSamePlaylistSnapshot = <T extends MusicIdentity>(
  left: PlaylistSnapshot<T>,
  right: PlaylistSnapshot<T>,
) => snapshotFingerprint(left) === snapshotFingerprint(right)

export type PlaylistChangeDecision = 'none' | 'upload' | 'applyRemote' | 'acceptRemote' | 'conflict'

export const decidePlaylistChange = <T extends MusicIdentity>(
  synced: PlaylistSnapshot<T>,
  local: PlaylistSnapshot<T>,
  remote: PlaylistSnapshot<T>,
  syncedRevision: number,
  remoteRevision: number,
): PlaylistChangeDecision => {
  const localChanged = !isSamePlaylistSnapshot(local, synced)
  const remoteChanged = remoteRevision !== syncedRevision || !isSamePlaylistSnapshot(remote, synced)
  if (localChanged && remoteChanged) {
    return isSamePlaylistSnapshot(local, remote) ? 'acceptRemote' : 'conflict'
  }
  if (remoteChanged) return 'applyRemote'
  if (localChanged) return 'upload'
  return 'none'
}

export const mergeOnlineSongsPreservingLocal = <T extends MusicIdentity>(current: T[], remoteOnline: T[]) => {
  const merged: T[] = []
  let remoteIndex = 0
  for (const music of current) {
    if (music.source === 'local') {
      merged.push(music)
    } else if (remoteIndex < remoteOnline.length) {
      merged.push(remoteOnline[remoteIndex++])
    }
  }
  if (remoteIndex < remoteOnline.length) merged.push(...remoteOnline.slice(remoteIndex))
  return merged
}
