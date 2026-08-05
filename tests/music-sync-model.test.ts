import assert from 'node:assert/strict'
import test from 'node:test'

import {
  decidePlaylistChange,
  isSamePlaylistSnapshot,
  mergeOnlineSongsPreservingLocal,
  normalizeSourceListId,
  playlistKey,
  type PlaylistSnapshot,
} from '../src/renderer/features/musicSync/model.ts'

interface Song {
  id: string
  source: string
}

void test('normalizes legacy composite source list ids without changing board ids', () => {
  assert.equal(normalizeSourceListId('kw', 'kw__123'), '123')
  assert.equal(normalizeSourceListId('kw', '123'), '123')
  assert.equal(normalizeSourceListId('kw', 'board__hot'), 'board__hot')
  assert.equal(playlistKey('kw', 'kw__123'), playlistKey('kw', '123'))
})

void test('keeps local songs while replacing online songs in remote order', () => {
  const current: Song[] = [
    { id: 'old-a', source: 'kw' },
    { id: 'file-a', source: 'local' },
    { id: 'old-b', source: 'tx' },
  ]
  const remote: Song[] = [
    { id: 'new-b', source: 'wy' },
    { id: 'new-a', source: 'kg' },
    { id: 'new-c', source: 'mg' },
  ]

  assert.deepEqual(mergeOnlineSongsPreservingLocal(current, remote), [
    remote[0],
    current[1],
    remote[1],
    remote[2],
  ])
})

void test('playlist snapshots include name, deletion state, and song order', () => {
  const base: PlaylistSnapshot<Song> = {
    source: 'kw',
    sourceListId: '123',
    name: 'List',
    songs: [{ id: 'a', source: 'kw' }, { id: 'b', source: 'kw' }],
    deleted: false,
  }
  assert.equal(isSamePlaylistSnapshot(base, { ...base }), true)
  assert.equal(isSamePlaylistSnapshot(base, { ...base, name: 'Renamed' }), false)
  assert.equal(isSamePlaylistSnapshot(base, { ...base, deleted: true, songs: [] }), false)
  assert.equal(isSamePlaylistSnapshot(base, { ...base, songs: [...base.songs].reverse() }), false)
})

void test('detects concurrent playlist changes instead of choosing a winner', () => {
  const synced: PlaylistSnapshot<Song> = {
    source: 'kw',
    sourceListId: '123',
    name: 'List',
    songs: [{ id: 'a', source: 'kw' }],
    deleted: false,
  }
  const local = { ...synced, name: 'Local' }
  const remote = { ...synced, name: 'Remote' }

  assert.equal(decidePlaylistChange(synced, local, remote, 1, 2), 'conflict')
  assert.equal(decidePlaylistChange(synced, local, local, 1, 2), 'acceptRemote')
  assert.equal(decidePlaylistChange(synced, local, synced, 1, 1), 'upload')
  assert.equal(decidePlaylistChange(synced, synced, remote, 1, 2), 'applyRemote')
})
