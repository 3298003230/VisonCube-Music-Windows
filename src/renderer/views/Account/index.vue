<template>
  <main :class="$style.page">
    <section v-if="!authReady" :class="$style.panel">
      <p :class="$style.loadingState">{{ $t('account__loading') }}</p>
    </section>

    <section v-else-if="!authUser" :class="[$style.panel, $style.authPanel]">
      <div :class="$style.brand">
        <img :src="logoImage" alt="VisonCube Music">
        <h1>{{ isRegister ? $t('account__register_title') : $t('account__login_title') }}</h1>
      </div>

      <div :class="$style.tabs" role="tablist">
        <button type="button" :class="{[$style.activeTab]: !isRegister}" role="tab" :aria-selected="!isRegister" @click="isRegister = false">
          {{ $t('account__login_tab') }}
        </button>
        <button type="button" :class="{[$style.activeTab]: isRegister}" role="tab" :aria-selected="isRegister" @click="isRegister = true">
          {{ $t('account__register_tab') }}
        </button>
      </div>

      <form :class="$style.form" @submit.prevent="handleSubmit">
        <label :class="$style.field">
          <span>{{ $t('account__username') }}</span>
          <input v-model="form.username" autocomplete="username" required :placeholder="$t('account__username_placeholder')">
        </label>
        <label v-if="isRegister" :class="$style.field">
          <span>{{ $t('account__email') }}</span>
          <input v-model="form.email" type="email" autocomplete="email" required :placeholder="$t('account__email_placeholder')">
        </label>
        <label :class="$style.field">
          <span>{{ $t('account__password') }}</span>
          <input v-model="form.password" type="password" autocomplete="current-password" required :placeholder="$t('account__password_placeholder')">
        </label>
        <label v-if="isRegister" :class="$style.field">
          <span>{{ $t('account__password_confirm') }}</span>
          <input v-model="form.confirmPassword" type="password" autocomplete="new-password" required :placeholder="$t('account__password_confirm_placeholder')">
        </label>

        <p v-if="errorMessage" :class="$style.error" role="alert">{{ errorMessage }}</p>
        <button type="submit" :class="$style.primaryButton" :disabled="submitting">
          {{ submitting ? $t('account__loading') : (isRegister ? $t('account__register_action') : $t('account__login_action')) }}
        </button>
      </form>
    </section>

    <section v-else :class="$style.panel">
      <div :class="$style.pageHeader">
        <div>
          <p :class="$style.eyebrow">{{ $t('account__center_label') }}</p>
          <h1>{{ $t('account__center_title') }}</h1>
        </div>
        <div :class="$style.avatar">{{ avatarText }}</div>
      </div>

      <div :class="$style.summary">
        <strong>{{ user.username }}</strong>
        <span>{{ user.email || $t('account__email_unbound') }}</span>
      </div>

      <dl :class="$style.details">
        <div>
          <dt>{{ $t('account__role') }}</dt>
          <dd>{{ user.role || $t('account__role_user') }}</dd>
        </div>
        <div>
          <dt>{{ $t('account__email_status') }}</dt>
          <dd :class="user.email_verified_at ? $style.success : $style.warning">
            {{ user.email_verified_at ? $t('account__email_verified') : $t('account__email_unverified') }}
          </dd>
        </div>
      </dl>

      <div :class="$style.syncSection">
        <h2>{{ $t('account__sync_title') }}</h2>
        <p :class="$style.syncStatus">{{ syncStatusText }}</p>
        <p v-if="lastSyncText" :class="$style.syncMeta">{{ lastSyncText }}</p>
        <p v-if="musicCloudSyncStatus.error" :class="$style.syncMeta">{{ musicCloudSyncStatus.error }}</p>
        <div v-if="musicCloudSyncStatus.phase === 'conflict'" :class="$style.syncActions">
          <button type="button" :class="$style.secondaryButton" :disabled="syncBusy" @click="resolveSyncConflict('local')">
            {{ $t('account__sync_keep_local') }}
          </button>
          <button type="button" :class="$style.primaryButton" :disabled="syncBusy" @click="resolveSyncConflict('remote')">
            {{ $t('account__sync_use_cloud') }}
          </button>
        </div>
        <div v-else-if="musicCloudSyncStatus.phase !== 'success'" :class="$style.syncActions">
          <button type="button" :class="$style.secondaryButton" :disabled="syncBusy" @click="retrySync">
            {{ $t('account__sync_retry') }}
          </button>
        </div>
      </div>

      <p v-if="errorMessage" :class="$style.error" role="alert">{{ errorMessage }}</p>
      <div :class="$style.actions">
        <button type="button" :class="$style.primaryButton" @click="goToPassword">{{ $t('account__change_password') }}</button>
        <button type="button" :class="$style.secondaryButton" :disabled="submitting" @click="handleSignOut">{{ $t('account__sign_out') }}</button>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from '@common/utils/vueTools'
import { useRouter } from '@common/utils/vueRouter'
import { useI18n } from '@renderer/plugins/i18n'
import { AuthApiError } from '@renderer/features/auth/api'
import { authReady, authUser, login, register, signOut } from '@renderer/features/auth/state'
import type { AuthUser } from '@renderer/features/auth/models'
import {
  musicCloudSyncStatus,
  resolveMusicPlaylistConflicts,
  syncMusicCloudNow,
} from '@renderer/features/musicSync'
import logoImage from '@renderer/assets/images/visoncube-music-logo.png'

const router = useRouter()
const t = useI18n()
const isRegister = ref(false)
const submitting = ref(false)
const errorMessage = ref('')
const form = reactive({ username: '', email: '', password: '', confirmPassword: '' })

const user = computed<AuthUser>(() => authUser.value!)
const avatarText = computed(() => authUser.value?.username.slice(0, 1).toUpperCase() ?? '?')
const syncBusy = computed(() => musicCloudSyncStatus.value.phase === 'syncing')
const syncStatusText = computed(() => {
  switch (musicCloudSyncStatus.value.phase) {
    case 'syncing': return t('account__sync_syncing')
    case 'success': return t('account__sync_success')
    case 'partial': return t('account__sync_partial')
    case 'error': return t('account__sync_error')
    case 'conflict': return t('account__sync_conflict', { num: musicCloudSyncStatus.value.conflictCount })
    default: return t('account__sync_idle')
  }
})
const lastSyncText = computed(() => musicCloudSyncStatus.value.lastSuccessAt
  ? t('account__sync_last', { time: new Date(musicCloudSyncStatus.value.lastSuccessAt).toLocaleString() })
  : '')

const getErrorMessage = (error: unknown) => error instanceof AuthApiError ? error.message : t('account__unknown_error')

const handleSubmit = async() => {
  errorMessage.value = ''
  if (isRegister.value && form.password !== form.confirmPassword) {
    errorMessage.value = t('account__password_mismatch')
    return
  }
  submitting.value = true
  try {
    if (isRegister.value) {
      await register({ username: form.username.trim(), email: form.email.trim(), password: form.password })
    } else {
      await login({ username: form.username.trim(), password: form.password })
    }
    form.password = ''
    form.confirmPassword = ''
    await router.replace('/search')
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  } finally {
    submitting.value = false
  }
}

const goToPassword = () => {
  void router.push('/account/password')
}

const retrySync = () => {
  void syncMusicCloudNow()
}

const resolveSyncConflict = (strategy: 'local' | 'remote') => {
  void resolveMusicPlaylistConflicts(strategy)
}

const handleSignOut = async() => {
  submitting.value = true
  errorMessage.value = ''
  await signOut()
  submitting.value = false
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.page {
  height: 100%;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
  background: var(--color-app-background);
}

.panel {
  width: min(100%, 560px);
  padding: 28px 32px 32px;
  border-radius: 10px;
  background: var(--color-content-background);
  border: 1px solid var(--color-primary-alpha-300);
  box-shadow: 0 8px 30px rgba(0, 0, 0, .1);
  box-sizing: border-box;
}

.authPanel {
  width: min(100%, 440px);
  padding: 30px 32px 32px;
}

.brand, .pageHeader {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand {
  flex-direction: column;
  gap: 12px;
  text-align: center;
}

.brand img {
  width: 72px;
  height: 72px;
  object-fit: contain;
}

.eyebrow {
  margin: 0 0 4px;
  color: var(--color-primary);
  font-size: 12px;
  letter-spacing: .04em;
}

h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.tabs {
  display: flex;
  gap: 4px;
  margin: 24px 0 20px;
  padding: 4px;
  border-radius: @form-radius;
  background: var(--color-primary-background);
}

.tabs button {
  position: relative;
  flex: 1;
  border: 0;
  border-radius: @form-radius;
  padding: 8px 12px;
  color: var(--color-font-label);
  background: none;
  cursor: pointer;
  font-size: 14px;
}

.tabs button.activeTab {
  color: var(--color-primary);
  font-weight: 600;
  background: var(--color-content-background);
  box-shadow: 0 1px 4px rgba(0, 0, 0, .08);
}

.tabs button.activeTab:after {
  display: none;
}

.form {
  display: grid;
  gap: 16px;
}

.field {
  display: grid;
  gap: 7px;
  color: var(--color-font-label);
  font-size: 13px;
}

.field input {
  width: 100%;
  min-height: 40px;
  border: 1px solid var(--color-primary-alpha-300);
  border-radius: @form-radius;
  padding: 10px 11px;
  color: var(--color-font);
  background: var(--color-primary-background);
  outline: none;
  box-sizing: border-box;
  transition: border-color .2s ease, background-color .2s ease;
}

.field input:focus {
  border-color: var(--color-primary);
  background: var(--color-primary-background-hover);
}

.primaryButton, .secondaryButton {
  min-height: 38px;
  border: 0;
  border-radius: @form-radius;
  padding: 0 18px;
  cursor: pointer;
  font-size: 14px;
  transition: opacity .2s ease, background-color .2s ease;
}

.primaryButton {
  color: var(--color-button-font);
  background: var(--color-button-background);
}

.primaryButton:hover, .secondaryButton:hover { opacity: .86; }
.primaryButton:disabled, .secondaryButton:disabled { opacity: .45; cursor: default; }

.secondaryButton {
  color: var(--color-font);
  background: var(--color-primary-background);
}

.error {
  margin: 0;
  color: var(--color-error, #d05c5c);
  font-size: 13px;
  line-height: 1.5;
}

.loadingState {
  margin: 0;
  color: var(--color-font-label);
  text-align: center;
}

.pageHeader {
  justify-content: space-between;
  align-items: flex-start;
}

.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  color: var(--color-button-font);
  background: var(--color-primary);
  font-size: 20px;
  font-weight: 600;
}

.summary {
  display: grid;
  gap: 5px;
  margin: 28px 0 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--color-primary-alpha-300);
}

.summary strong { font-size: 18px; }
.summary span { color: var(--color-font-label); font-size: 13px; }

.details {
  display: grid;
  gap: 1px;
  margin: 0;
  overflow: hidden;
  border-radius: @form-radius;
  background: var(--color-primary-alpha-300);
}

.details div {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 13px 15px;
  background: var(--color-content-background);
}

.details dt { color: var(--color-font-label); }
.details dd { margin: 0; text-align: right; word-break: break-all; }
.success { color: var(--color-primary); }
.warning { color: var(--color-error, #d05c5c); }

.syncSection {
  margin-top: 22px;
  padding-top: 20px;
  border-top: 1px solid var(--color-primary-alpha-300);
}

.syncSection h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.syncStatus {
  margin: 7px 0 0;
  color: var(--color-font);
  font-size: 13px;
  line-height: 1.5;
}

.syncMeta {
  margin: 4px 0 0;
  color: var(--color-font-label);
  font-size: 12px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.syncActions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 24px;
}

@media (max-height: 700px) {
  .page {
    align-items: flex-start;
    padding-top: 20px;
  }
}
</style>
