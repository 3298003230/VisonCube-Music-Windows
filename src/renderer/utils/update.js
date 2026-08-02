import { MUSIC_WINDOWS_RELEASE_API_URL } from '@common/visoncubeConfig'
import { APP_DISPLAY_VERSION } from '@common/version'

export const getVersionInfo = async() => {
  const response = await fetch(MUSIC_WINDOWS_RELEASE_API_URL, {
    headers: {
      Accept: 'application/json',
    },
  })
  if (!response.ok) throw new Error('Failed to fetch release information')

  const release = await response.json()
  if (!release || typeof release.version != 'string' || !release.version) {
    throw new Error('Invalid release information')
  }

  return {
    version: release.version,
    displayVersion: typeof release.display_version == 'string' && release.display_version
      ? release.display_version
      : APP_DISPLAY_VERSION,
    desc: typeof release.changelog == 'string' ? release.changelog : '',
    history: [],
  }
}
