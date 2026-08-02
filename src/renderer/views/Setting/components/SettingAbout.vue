<template lang="pug">
dt#about {{ $t('setting__about') }}
dd
  .p.small VisonCube Music
  .p.small {{ $t('setting__update_current_label') }}{{ APP_DISPLAY_VERSION }}
</template>

<script>
import { versionInfo } from '@renderer/store'
import { APP_DISPLAY_VERSION } from '@common/version'

export default {
  name: 'SettingAbout',
  setup() {
    return {
      versionInfo,
      APP_DISPLAY_VERSION,
    }
  },
}
</script>
