import { apiSource, qualityList, userApi } from '@renderer/store'
import { appSetting, setApiSource } from '@renderer/store/setting'
import { setUserApi as setUserApiAction } from '@renderer/utils/ipc'
import musicSdk from '@renderer/utils/musicSdk'
import apiSourceInfo from '@renderer/utils/musicSdk/api-source-info'

let prevId = ''
let initTimeoutId: number | undefined
export const getActiveUserApiId = () => prevId

export const setUserApi = async(apiId: string, reload = false) => {
  if (prevId == apiId && !reload) return
  if (!window.lx.apiInitPromise[1]) window.lx.apiInitPromise[2](false)
  if (initTimeoutId != null) window.clearTimeout(initTimeoutId)
  initTimeoutId = undefined
  prevId = apiId
  window.lx.apiInitPromise[0] = new Promise<boolean>(resolve => {
    window.lx.apiInitPromise[1] = false
    window.lx.apiInitPromise[2] = (result: boolean) => {
      if (window.lx.apiInitPromise[1]) return
      window.lx.apiInitPromise[1] = true
      if (initTimeoutId != null) window.clearTimeout(initTimeoutId)
      initTimeoutId = undefined
      resolve(result)
    }
  })
  const initPromise = window.lx.apiInitPromise[0]
  if (reload) {
    initTimeoutId = window.setTimeout(() => {
      if (prevId != apiId || window.lx.apiInitPromise[0] != initPromise) return
      userApi.status = false
      userApi.message = 'init timeout'
      window.lx.apiInitPromise[2](false)
    }, 30_000)
  }

  if (/^user_api/.test(apiId)) {
    qualityList.value = {}
    userApi.status = false
    userApi.message = 'initing'

    let loadFailed = false
    const loadAction = setUserApiAction(apiId)
    await (reload ? Promise.race([loadAction, initPromise]) : loadAction).then(() => {
      if (prevId != apiId) return
      apiSource.value = apiId
    }).catch(err => {
      if (prevId != apiId) return
      if (!window.lx.apiInitPromise[1]) window.lx.apiInitPromise[2](false)
      if (reload) throw err
      loadFailed = true
      prevId = ''
      console.log(err)
      let api = apiSourceInfo.find(api => !api.disabled)
      if (!api) return
      apiSource.value = api.id
      if (api.id != appSetting['common.apiSource']) setApiSource(api.id)
    })
    if (loadFailed) return
  } else {
    // @ts-expect-error
    qualityList.value = musicSdk.supportQuality[apiId] ?? {}
    apiSource.value = apiId
    void setUserApiAction(apiId)
    if (!window.lx.apiInitPromise[1]) window.lx.apiInitPromise[2](true)
  }

  if (prevId != apiId) return
  if (apiId != appSetting['common.apiSource']) setApiSource(apiId)
}
