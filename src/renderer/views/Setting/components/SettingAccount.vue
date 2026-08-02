<template lang="pug">
dt#account {{ $t('account__setting_title') }}
dd
  div(:class="$style.account")
    template(v-if="authUser")
      div(:class="$style.identityRow")
        div(:class="$style.identity")
          div(:class="$style.avatar") {{ avatarText }}
          div(:class="$style.identityText")
            strong(:class="$style.username") {{ authUser.username }}
            span(:class="$style.email") {{ authUser.email || $t('account__email_unbound') }}
        div(:class="[$style.status, authUser.email_verified_at ? $style.success : $style.warning]")
          | {{ authUser.email_verified_at ? $t('account__email_verified') : $t('account__email_unverified') }}
      div(:class="$style.actions")
        base-btn(min @click="openAccount") {{ $t('account__open_center') }}
        base-btn(min outline @click="handleSignOut") {{ $t('account__sign_out') }}
    template(v-else)
      p(:class="$style.signedOut") {{ $t('account__setting_signed_out') }}
      div(:class="$style.actions")
        base-btn(@click="openAccount") {{ $t('account__login_action') }}
</template>

<script setup lang="ts">
import { computed } from '@common/utils/vueTools'
import { useRouter } from '@common/utils/vueRouter'
import { authUser, signOut } from '@renderer/features/auth/state'

const router = useRouter()
const avatarText = computed(() => authUser.value?.username.slice(0, 1).toUpperCase() ?? '?')

const openAccount = () => {
  void router.push('/account')
}

const handleSignOut = () => {
  void signOut()
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.account {
  width: min(100%, 680px);
  padding: 18px 20px;
  box-sizing: border-box;
  border-radius: @form-radius;
  background: var(--color-primary-background);
}

.identityRow {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.identity {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 12px;
}

.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: var(--color-button-font);
  background: var(--color-primary);
  font-weight: 600;
}

.identityText {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.username, .email {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.email, .signedOut {
  margin: 0;
  color: var(--color-font-label);
}

.status {
  display: inline-flex;
  flex: none;
  align-items: center;
  min-height: 24px;
  padding: 0 9px;
  border-radius: 999px;
  font-size: 12px;
}

.success {
  color: var(--color-primary);
  background: var(--color-primary-alpha-200);
}

.warning {
  color: var(--color-error, #d05c5c);
  background: var(--color-primary-background-hover);
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 18px;
}

@media (max-width: 560px) {
  .identityRow {
    display: grid;
    gap: 12px;
  }

  .status {
    justify-self: start;
  }
}
</style>
