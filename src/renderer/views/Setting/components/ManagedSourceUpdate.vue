<template lang="pug">
div(:class="$style.container")
  base-btn(:class="$style.btn" :disabled="updating || managedSourceStatus.phase === 'updating'" @click="handleUpdateSource") {{ $t('setting__basic_source_update_btn') }}
  span(:class="$style.status") {{ managedSourceStatusLabel }}
</template>

<script>
import { computed, ref } from '@common/utils/vueTools'
import { useI18n } from '@root/lang'
import { dialog } from '@renderer/plugins/Dialog'
import { setUserApi } from '@renderer/core/apiSource'
import { MANAGED_USER_API_ID } from '@common/musicSource'
import { managedSourceStatus, updateManagedSource } from '@renderer/features/musicSource/managedSource'
import { authSession } from '@renderer/features/auth/state'
import { userApi } from '@renderer/store'

export default {
  setup() {
    const t = useI18n()
    const updating = ref(false)
    const managedSourceStatusLabel = computed(() => {
      if (updating.value || managedSourceStatus.value.phase == 'updating') return t('setting__basic_source_update_loading')
      if (managedSourceStatus.value.phase == 'error') return t('setting__basic_source_update_failed')
      if (managedSourceStatus.value.manifest) return `${t('setting__basic_source_update_version')} v${managedSourceStatus.value.manifest.version}`
      return t('setting__basic_source_update_idle')
    })

    const handleUpdateSource = async() => {
      if (updating.value) return
      updating.value = true
      const userId = authSession.value?.user.id
      try {
        const manifest = await updateManagedSource()
        if (authSession.value?.user.id !== userId) throw new Error('登录状态已变化，请重新更新音源')
        await setUserApi(MANAGED_USER_API_ID, true)
        if (!await window.lx.apiInitPromise[0]) throw new Error(userApi.message ? userApi.message : t('setting__basic_source_update_failed'))
        if (authSession.value?.user.id !== userId) throw new Error('登录状态已变化，请重新更新音源')
        managedSourceStatus.value = { phase: 'ready', manifest }
        void dialog({ message: t('setting__basic_source_update_success'), confirmButtonText: t('ok') })
      } catch (error) {
        managedSourceStatus.value = { phase: 'error', message: error instanceof Error ? error.message : undefined }
        void dialog({ message: error instanceof Error ? error.message : t('setting__basic_source_update_failed'), confirmButtonText: t('ok') })
      } finally {
        updating.value = false
      }
    }

    return {
      managedSourceStatus,
      updating,
      managedSourceStatusLabel,
      handleUpdateSource,
    }
  },
}
</script>

<style lang="less" module>
.container {
  display: flex;
  align-items: center;
  margin: 15px 7px 0;
}

.btn {
  flex: none;
}

.status {
  margin-left: 8px;
  opacity: .75;
}
</style>
