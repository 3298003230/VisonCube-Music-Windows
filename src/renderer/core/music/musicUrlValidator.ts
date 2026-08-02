import needle from 'needle'

import { getRequestAgent } from '@renderer/utils/request'

const checkedMusicUrls = new Set<string>()
const MUSIC_URL_CHECK_TIMEOUT_MS = 6000
const MUSIC_URL_CACHE_LIMIT = 200
const invalidContentTypePattern = /^(?:application\/(?:json|problem\+json)|text\/(?:html|plain))(?:;|$)/
type AbortableNeedleStream = ReturnType<typeof needle.get> & { abort: () => void }

const rememberMusicUrl = (url: string) => {
  if (checkedMusicUrls.size >= MUSIC_URL_CACHE_LIMIT) checkedMusicUrls.clear()
  checkedMusicUrls.add(url)
}

export const assertMusicUrlAvailable = async(url: string): Promise<void> => {
  if (checkedMusicUrls.has(url)) return

  await new Promise<void>((resolve, reject) => {
    const request = needle.get(url, {
      agent: getRequestAgent(url),
      follow_max: 5,
      headers: {
        Accept: 'audio/*,application/octet-stream;q=0.9,*/*;q=0.1',
        Range: 'bytes=0-1',
      },
      response_timeout: MUSIC_URL_CHECK_TIMEOUT_MS,
      read_timeout: MUSIC_URL_CHECK_TIMEOUT_MS,
    }) as AbortableNeedleStream
    let settled = false

    const finish = (error?: Error) => {
      if (settled) return
      settled = true
      request.abort()
      if (error) reject(error)
      else resolve()
    }

    request.once('header', (statusCode: number, headers: Record<string, string | string[] | undefined>) => {
      const value = headers['content-type']
      const contentType = (Array.isArray(value) ? value[0] : value ?? '').toLowerCase()
      if (![200, 206].includes(statusCode) || invalidContentTypePattern.test(contentType)) {
        finish(new Error(`music url unavailable (${statusCode})`))
      } else {
        rememberMusicUrl(url)
        finish()
      }
    })
    request.once('err', (error: Error) => { finish(error) })
    request.once('done', (error?: Error) => {
      if (!settled) finish(error ?? new Error('music url response is incomplete'))
    })
  })
}
