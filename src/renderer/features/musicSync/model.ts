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

export const normalizeSourceListId = (source: string, sourceListId: string) => {
  const legacyPrefix = `${source}__`
  return sourceListId.startsWith(legacyPrefix) ? sourceListId.slice(legacyPrefix.length) : sourceListId
}

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
