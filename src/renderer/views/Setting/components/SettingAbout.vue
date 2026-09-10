<template lang="pug">
dt#about {{ $t('setting__about') }}
dd
  .p.small VisonCube Music
  .p.small {{ $t('setting__update_current_label') }}{{ APP_DISPLAY_VERSION }}
</template>

<script>
import { APP_DISPLAY_VERSION } from '@common/version'

export default {
  name: 'SettingAbout',
  setup() {
    return {
      APP_DISPLAY_VERSION,
    }
  },
}
</script>
