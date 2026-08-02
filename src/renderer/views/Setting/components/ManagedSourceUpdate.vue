<template lang="pug">
div(:class="$style.container")
  base-btn(:class="$style.btn" :disabled="managedSourceStatus.phase === 'updating'" @click="handleUpdateSource") {{ $t('setting__basic_source_update_btn') }}
  span(:class="$style.status") {{ managedSourceStatusLabel }}
</template>

<script>
import { computed } from '@common/utils/vueTools'
import { useI18n } from '@root/lang'
import { dialog } from '@renderer/plugins/Dialog'
import { setUserApi } from '@renderer/core/apiSource'
import { MANAGED_USER_API_ID } from '@common/musicSource'
import { managedSourceStatus, updateManagedSource } from '@renderer/features/musicSource/managedSource'

export default {
  setup() {
    const t = useI18n()
    const managedSourceStatusLabel = computed(() => {
      if (managedSourceStatus.value.phase == 'updating') return t('setting__basic_source_update_loading')
      if (managedSourceStatus.value.phase == 'error') return t('setting__basic_source_update_failed')
      if (managedSourceStatus.value.manifest) return `${t('setting__basic_source_update_version')} v${managedSourceStatus.value.manifest.version}`
      return t('setting__basic_source_update_idle')
    })

    const handleUpdateSource = async() => {
      try {
        await updateManagedSource()
        await setUserApi(MANAGED_USER_API_ID, true)
        void dialog({ message: t('setting__basic_source_update_success'), confirmButtonText: t('ok') })
      } catch (error) {
        void dialog({ message: error instanceof Error ? error.message : t('setting__basic_source_update_failed'), confirmButtonText: t('ok') })
      }
    }

    return {
      managedSourceStatus,
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
