<template lang="pug">
material-modal(:show="show" :bg-close="false" @close="handleCancel")
  main(:class="$style.main")
    h2 {{ $t('close_confirm__title') }}
    p(:class="$style.desc") {{ $t('close_confirm__desc') }}
    div(:class="$style.content")
      base-checkbox(
        id="close_confirm_remember" v-model="remember" :label="$t('close_confirm__remember')"
      )
    div(:class="$style.footer")
      base-btn(:class="$style.footerBtn" @click="handleAction('tray')") {{ $t('close_confirm__to_tray') }}
      base-btn(:class="$style.footerBtn" @click="handleAction('quit')") {{ $t('close_confirm__quit') }}
      base-btn(:class="[$style.footerBtn, $style.cancelBtn]" @click="handleCancel") {{ $t('btn_cancel') }}
</template>

<script>
import { onBeforeUnmount, onMounted, ref } from '@common/utils/vueTools'
import { appSetting, updateSetting } from '@renderer/store/setting'
import { onCloseRequest, sendCloseAction, sendCloseReady } from '@renderer/utils/ipc'

export default {
  name: 'CloseConfirmModal',
  setup() {
    const show = ref(false)
    const remember = ref(false)
    const submitting = ref(false)

    const handleCancel = () => {
      if (!show.value) return
      show.value = false
      sendCloseAction('cancel')
    }

    const handleAction = async(action) => {
      if (submitting.value) return
      submitting.value = true
      try {
        if (remember.value) {
          const setting = { 'common.closeAction': action }
          if (action == 'tray') setting['tray.enable'] = true
          try {
            await updateSetting(setting)
          } catch {
            // 设置持久化失败时仍执行用户明确选择的关闭动作，避免窗口被卡住。
          }
        }
        show.value = false
        sendCloseAction(action)
      } finally {
        submitting.value = false
        remember.value = false
      }
    }

    const removeCloseRequest = onCloseRequest(() => {
      if (appSetting['common.closeAction'] == 'tray' || appSetting['common.closeAction'] == 'quit') return
      if (show.value) return
      show.value = true
    })

    onMounted(() => {
      sendCloseReady()
    })

    onBeforeUnmount(() => {
      removeCloseRequest()
    })

    return {
      show,
      remember,
      handleCancel,
      handleAction,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.main {
  padding: 15px;
  max-width: 520px;
  min-width: 320px;
  display: flex;
  flex-flow: column nowrap;

  h2 {
    font-size: 16px;
    color: var(--color-font);
    line-height: 1.3;
    text-align: center;
  }
}

.desc {
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--color-font-label);
  text-align: center;
}

.content {
  margin-top: 15px;
  font-size: 14px;
}

.footer {
  display: flex;
  flex-flow: row nowrap;
  margin-top: 20px;
}

.footerBtn {
  flex: 1 1 0;
  min-height: 36px;
  padding: 0 10px !important;
  white-space: nowrap;

  + .footerBtn {
    margin-left: 15px;
  }
}
</style>
