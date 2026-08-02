<template>
  <main :class="$style.page">
    <section :class="$style.panel">
      <button type="button" :class="$style.back" @click="goBack">‹ {{ $t('account__back') }}</button>
      <p :class="$style.eyebrow">{{ $t('account__center_label') }}</p>
      <h1>{{ $t('account__change_password_title') }}</h1>
      <p :class="$style.caption">{{ $t('account__change_password_caption') }}</p>

      <form :class="$style.form" @submit.prevent="handleSubmit">
        <label :class="$style.field">
          <span>{{ $t('account__old_password') }}</span>
          <input v-model="form.oldPassword" type="password" autocomplete="current-password" required>
        </label>
        <label :class="$style.field">
          <span>{{ $t('account__new_password') }}</span>
          <input v-model="form.newPassword" type="password" autocomplete="new-password" required>
        </label>
        <label :class="$style.field">
          <span>{{ $t('account__password_confirm') }}</span>
          <input v-model="form.confirmPassword" type="password" autocomplete="new-password" required>
        </label>
        <p v-if="errorMessage" :class="$style.error" role="alert">{{ errorMessage }}</p>
        <div :class="$style.actions">
          <button type="button" :class="$style.secondaryButton" @click="goBack">{{ $t('account__cancel') }}</button>
          <button type="submit" :class="$style.primaryButton" :disabled="submitting">
            {{ submitting ? $t('account__loading') : $t('account__save_password') }}
          </button>
        </div>
      </form>
    </section>
  </main>
</template>

<script setup lang="ts">
import { reactive, ref } from '@common/utils/vueTools'
import { useRouter } from '@common/utils/vueRouter'
import { useI18n } from '@renderer/plugins/i18n'
import { AuthApiError } from '@renderer/features/auth/api'
import { authUser, changePassword } from '@renderer/features/auth/state'

const router = useRouter()
const t = useI18n()
const submitting = ref(false)
const errorMessage = ref('')
const form = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })

const goBack = () => {
  void router.push('/account')
}

const handleSubmit = async() => {
  errorMessage.value = ''
  if (!authUser.value) {
    goBack()
    return
  }
  if (form.newPassword !== form.confirmPassword) {
    errorMessage.value = t('account__password_mismatch')
    return
  }
  submitting.value = true
  try {
    await changePassword(form.oldPassword, form.newPassword)
    goBack()
  } catch (error) {
    errorMessage.value = error instanceof AuthApiError ? error.message : t('account__unknown_error')
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.page {
  height: 100%;
  overflow: auto;
  display: flex;
  justify-content: center;
  padding: 44px 24px;
  box-sizing: border-box;
}

.panel {
  width: min(100%, 560px);
  align-self: flex-start;
  padding: 28px 32px 32px;
  border-radius: 10px;
  background: var(--color-content-background);
  box-shadow: 0 8px 30px rgba(0, 0, 0, .1);
  box-sizing: border-box;
}

.back {
  display: block;
  border: 0;
  margin: 0 0 26px;
  padding: 0;
  color: var(--color-primary);
  background: none;
  cursor: pointer;
  font-size: 13px;
}

.eyebrow {
  margin: 0 0 4px;
  color: var(--color-primary);
  font-size: 12px;
  letter-spacing: .04em;
}

h1 { margin: 0; font-size: 22px; font-weight: 600; }
.caption { margin: 8px 0 26px; color: var(--color-font-label); font-size: 13px; }

.form { display: grid; gap: 16px; }
.field { display: grid; gap: 7px; color: var(--color-font-label); font-size: 13px; }
.field input {
  width: 100%;
  border: 1px solid var(--color-primary-alpha-300);
  border-radius: @form-radius;
  padding: 10px 11px;
  color: var(--color-font);
  background: var(--color-primary-background);
  outline: none;
  box-sizing: border-box;
}
.field input:focus { border-color: var(--color-primary); }

.error { margin: 0; color: var(--color-error, #d05c5c); font-size: 13px; line-height: 1.5; }
.actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
.primaryButton, .secondaryButton { min-height: 38px; border: 0; border-radius: @form-radius; padding: 0 18px; cursor: pointer; font-size: 14px; }
.primaryButton { color: var(--color-button-font); background: var(--color-button-background); }
.secondaryButton { color: var(--color-font); background: var(--color-primary-background); }
.primaryButton:disabled { opacity: .45; cursor: default; }
</style>
