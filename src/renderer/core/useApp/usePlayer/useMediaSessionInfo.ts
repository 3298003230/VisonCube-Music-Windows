import { onBeforeUnmount, watch } from '@common/utils/vueTools'
import { getDuration, getPlaybackRate, getCurrentTime } from '@renderer/plugins/player'
import { isPlay, musicInfo, playMusicInfo } from '@renderer/store/player/state'
import { playProgress } from '@renderer/store/player/playProgress'
import { pause, play, playNext, playPrev, stop } from '@renderer/core/player'

export default () => {
  // 创建一个空白音频以保持对 Media Session 的注册
  const emptyAudio = new Audio()
  emptyAudio.autoplay = false
  emptyAudio.src = require('@renderer/assets/medias/Silence02s.mp3')
  emptyAudio.controls = false
  emptyAudio.preload = 'auto'
  emptyAudio.onplaying = () => {
    emptyAudio.pause()
  }
  const keepMediaSession = () => {
    // 静音音频只负责注册系统控件，实际播放状态由播放器事件更新。
    void emptyAudio.play().catch(() => {})
  }
  keepMediaSession()

  let metadataGeneration = 0
  let metadata: MediaMetadata | null = null

  const updateMediaSessionInfo = () => {
    const generation = ++metadataGeneration
    const musicId = musicInfo.id
    if (musicId == null) {
      metadata = null
      navigator.mediaSession.metadata = null
      return
    }

    const picUrl = musicInfo.pic
    const currentMetadata = new MediaMetadata({
      title: musicInfo.name,
      artist: musicInfo.singer,
      album: musicInfo.album,
    })
    metadata = currentMetadata
    navigator.mediaSession.metadata = currentMetadata

    if (!picUrl) return
    const pic = new Image()
    pic.onload = () => {
      if (generation != metadataGeneration || musicInfo.id != musicId || musicInfo.pic != picUrl) return
      currentMetadata.artwork = [{ src: picUrl }]
    }
    pic.src = picUrl
  }

  const updatePositionState = (state: {
    duration?: number
    position?: number
    playbackRate?: number
  } = {}) => {
    const duration = state.duration ?? getDuration()
    const position = state.position ?? getCurrentTime()
    const playbackRate = state.playbackRate ?? getPlaybackRate()
    if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(position) || !Number.isFinite(playbackRate) || playbackRate === 0) {
      navigator.mediaSession.setPositionState()
      return
    }
    navigator.mediaSession.setPositionState({
      duration,
      playbackRate,
      position: Math.min(duration, Math.max(0, position)),
    })
  }

  const setProgress = (time: number) => {
    window.app_event.setProgress(time)
  }

  const setStop = () => {
    stop()
  }
  const handlePlay = () => {
    navigator.mediaSession.metadata = metadata
    navigator.mediaSession.playbackState = 'playing'
  }
  const handlePause = () => {
    navigator.mediaSession.playbackState = 'paused'
    updatePositionState({
      position: playProgress.nowPlayTime,
      duration: playProgress.maxPlayTime,
    })
  }
  const handleStop = () => {
    navigator.mediaSession.playbackState = 'none'
  }
  const handleSetPlayInfo = () => {
    updateMediaSessionInfo()
    updatePositionState({
      position: playProgress.nowPlayTime,
      duration: playProgress.maxPlayTime,
    })
    keepMediaSession()
  }

  // const registerMediaSessionHandler = () => {
  navigator.mediaSession.setActionHandler('play', () => {
    if (isPlay.value || !playMusicInfo) return
    console.log('play')
    play()
  })
  navigator.mediaSession.setActionHandler('pause', () => {
    if (!isPlay.value || !playMusicInfo) return
    console.log('pause')
    pause()
  })
  navigator.mediaSession.setActionHandler('stop', () => {
    console.log('stop')
    setStop()
  })
  navigator.mediaSession.setActionHandler('seekbackward', details => {
    console.log('seekbackward')
    const seekOffset = details.seekOffset ?? 5
    setProgress(Math.max(getCurrentTime() - seekOffset, 0))
  })
  navigator.mediaSession.setActionHandler('seekforward', details => {
    console.log('seekforward')
    const seekOffset = details.seekOffset ?? 5
    setProgress(Math.min(getCurrentTime() + seekOffset, getDuration()))
  })
  navigator.mediaSession.setActionHandler('seekto', details => {
    console.log('seekto', details.seekTime)
    if (details.seekTime == null) return
    let time = Math.min(details.seekTime, getDuration())
    time = Math.max(time, 0)
    setProgress(time)
  })
  navigator.mediaSession.setActionHandler('previoustrack', () => {
    console.log('previoustrack')
    void playPrev()
  })
  navigator.mediaSession.setActionHandler('nexttrack', () => {
    console.log('nexttrack')
    void playNext()
  })
  // navigator.mediaSession.setActionHandler('skipad', () => {
  //   console.log('')
  // })
  // }

  window.app_event.on('playerLoadeddata', updatePositionState)
  window.app_event.on('playerPlaying', updatePositionState)
  window.app_event.on('play', handlePlay)
  window.app_event.on('pause', handlePause)
  window.app_event.on('stop', handleStop)
  window.app_event.on('error', handlePause)
  window.app_event.on('playerEmptied', keepMediaSession)
  // window.app_event.on('playerLoadstart', handleSetPlayInfo)
  window.app_event.on('musicToggled', handleSetPlayInfo)
  window.app_event.on('picUpdated', updateMediaSessionInfo)

  watch(() => musicInfo.id, id => {
    if (id == null) updateMediaSessionInfo()
  })

  onBeforeUnmount(() => {
    metadataGeneration++
    window.app_event.off('playerLoadeddata', updatePositionState)
    window.app_event.off('playerPlaying', updatePositionState)
    window.app_event.off('play', handlePlay)
    window.app_event.off('pause', handlePause)
    window.app_event.off('stop', handleStop)
    window.app_event.off('error', handlePause)
    window.app_event.off('playerEmptied', keepMediaSession)
    // window.app_event.off('playerLoadstart', handleSetPlayInfo)
    window.app_event.off('musicToggled', handleSetPlayInfo)
    window.app_event.off('picUpdated', updateMediaSessionInfo)
  })
}
