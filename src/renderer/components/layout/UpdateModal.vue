<template lang="pug">
material-modal(:show="versionInfo.showModal" max-width="60%" @close="handleClose")
  main(v-if="versionInfo.isLatest" :class="$style.main")
    h2 已是最新版本
    div.scroll.select(:class="$style.info")
      div(:class="$style.current")
        h3 当前版本：{{ APP_DISPLAY_VERSION }}
        pre(v-if="versionInfo.newVersion?.desc" :class="$style.desc" v-text="versionInfo.newVersion.desc")
    div(:class="$style.footer")
      base-btn(v-if="versionInfo.status == 'checking'" :class="$style.btn" disabled) 检查更新中...
      base-btn(v-else :class="$style.btn" @click="handleCheckUpdate") 重新检查更新
  main(v-else-if="versionInfo.isUnknown" :class="$style.main")
    h2 更新信息获取失败
    div.scroll.select(:class="$style.info")
      div(:class="$style.current")
        h3 当前版本：{{ APP_DISPLAY_VERSION }}
        p(:class="$style.failureTip") 更新信息获取失败，请手动检查更新！
    div(:class="$style.footer")
      div(:class="$style.btns")
        base-btn(v-if="versionInfo.status == 'error'" :class="$style.btn2" @click="handleCheckUpdate") 重新检查更新
        base-btn(v-else :class="$style.btn2" disabled) 检查更新中...
        base-btn(:disabled="disabledIgnoreFailBtn" :class="$style.btn2" @click="handleIgnoreFailTipClick") 一周内不再提醒
  main(v-else-if="versionInfo.status == 'downloaded'" :class="$style.main")
    h2 更新已下载
    div.scroll.select(:class="$style.info")
      div(:class="$style.current")
        h3 最新版本：{{ versionInfo.newVersion?.displayVersion || versionInfo.newVersion?.version }}
        h3 当前版本：{{ APP_DISPLAY_VERSION }}
        pre(v-if="versionInfo.newVersion?.desc" :class="$style.desc" v-text="versionInfo.newVersion.desc")
    div(:class="$style.footer")
      base-btn(:class="$style.btn" @click="handleRestartClick") 重启并安装
  main(v-else :class="$style.main")
    h2 发现新版本
    div.scroll.select(:class="$style.info")
      div(:class="$style.current")
        h3 最新版本：{{ versionInfo.newVersion?.displayVersion || versionInfo.newVersion?.version }}
        h3 当前版本：{{ APP_DISPLAY_VERSION }}
        pre(v-if="versionInfo.newVersion?.desc" :class="$style.desc" v-text="versionInfo.newVersion.desc")
      div(v-if="history.length" :class="[$style.history, $style.desc]")
        h3 历史版本
        div(v-for="(ver, index) in history" :key="index" :class="$style.item")
          h4 v{{ ver.version }}
          pre(v-text="ver.desc")
    div(:class="$style.footer")
      p(v-if="progress" :class="$style.progress") {{ progress }}
      div(:class="$style.btns")
        base-btn(:class="$style.btn2" @click="handleIgnoreClick") {{ isIgnored ? '取消忽略' : '忽略此版本' }}
        base-btn(v-if="versionInfo.status == 'downloading'" :class="$style.btn2" disabled) 下载更新中...
        base-btn(v-else :class="$style.btn2" @click="handleDownloadClick") 下载更新
</template>

<script>
import { compareVer, sizeFormate } from '@common/utils'
import { dialog } from '@renderer/plugins/Dialog'
import { versionInfo } from '@renderer/store'
import { getIgnoreVersion, saveIgnoreVersion, quitUpdate, downloadUpdate, checkUpdate } from '@renderer/utils/ipc'
import { APP_DISPLAY_VERSION } from '@common/version'

export default {
  setup() {
    return {
      versionInfo,
      APP_DISPLAY_VERSION,
    }
  },
  data() {
    return {
      ignoreVersion: null,
      disabledIgnoreFailBtn: true,
    }
  },
  computed: {
    history() {
      if (!this.versionInfo.newVersion?.history) return []
      const currentVer = this.versionInfo.version
      return this.versionInfo.newVersion.history.filter(ver => compareVer(currentVer, ver.version) < 0)
    },
    progress() {
      return this.versionInfo.status == 'downloading'
        ? this.versionInfo.downloadProgress
          ? `${this.versionInfo.downloadProgress.percent.toFixed(2)}% - ${sizeFormate(this.versionInfo.downloadProgress.transferred)}/${sizeFormate(this.versionInfo.downloadProgress.total)} - ${sizeFormate(this.versionInfo.downloadProgress.bytesPerSecond)}/s`
          : '正在准备下载...'
        : ''
    },
    isIgnored() {
      return this.ignoreVersion == this.versionInfo.newVersion?.version
    },
  },
  created() {
    void getIgnoreVersion().then(version => {
      this.ignoreVersion = version
    })
    this.disabledIgnoreFailBtn = Date.now() - parseInt(localStorage.getItem('update__check_failed_tip') ?? '0') < 7 * 86400000
  },
  methods: {
    handleClose() {
      versionInfo.showModal = false
    },
    handleRestartClick(event) {
      this.handleClose()
      event.target.disabled = true
      quitUpdate()
    },
    async handleIgnoreClick() {
      if (this.isIgnored) {
        saveIgnoreVersion(this.ignoreVersion = null)
        return
      }

      if (this.history.length >= 2) {
        if (await dialog.confirm({
          message: window.i18n.t('update__ignore_tip', { num: this.history.length + 1 }),
          cancelButtonText: window.i18n.t('update__ignore_cancel'),
          confirmButtonText: window.i18n.t('update__ignore_confirm'),
        })) {
          return
        }
      }
      saveIgnoreVersion(this.ignoreVersion = this.versionInfo.newVersion?.version)
    },
    handleDownloadClick() {
      if (this.isIgnored) saveIgnoreVersion(this.ignoreVersion = null)
      versionInfo.status = 'downloading'
      downloadUpdate()
    },
    handleCheckUpdate() {
      if (this.isIgnored) saveIgnoreVersion(this.ignoreVersion = null)
      versionInfo.status = 'checking'
      versionInfo.reCheck = true
      checkUpdate()
    },
    handleIgnoreFailTipClick() {
      localStorage.setItem('update__check_failed_tip', Date.now().toString())
      this.disabledIgnoreFailBtn = true
      this.handleClose()
    },
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.main {
  padding: 15px 0;
  min-width: 300px;
  display: flex;
  flex-flow: column nowrap;
  overflow: hidden;
  * {
    box-sizing: border-box;
  }
  h2 {
    font-size: 16px;
    color: var(--color-font);
    line-height: 1.3;
    text-align: center;
    margin-bottom: 15px;
  }
  h3 {
    font-size: 14px;
    line-height: 1.3;
  }
  pre {
    white-space: pre-wrap;
    text-align: justify;
    margin-top: 10px;
  }
}

.info {
  flex: 1 1 auto;
  font-size: 14px;
  line-height: 1.5;
  overflow-y: auto;
  padding: 0 15px;
}
.desc {
  margin-top: 10px;
}
.failureTip,
.progress {
  margin-top: 10px;
  font-size: 13px;
  color: var(--color-primary-font);
  line-height: 1.5;
}
.history {
  margin-top: 15px;
  h3, h4 {
    font-weight: bold;
  }
}
.item {
  padding-top: 10px;
}
.footer {
  flex: 0 0 none;
  padding: 10px 15px 0;
}
.btns {
  display: flex;
  flex-flow: row nowrap;
  gap: 15px;
}
.btn,
.btn2 {
  margin-top: 10px;
  display: block;
}
.btn {
  width: 100%;
}
.btn2 {
  width: 50%;
}
</style>
