<template>
  <div
    class="flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-gray-900 px-4"
  >
    <div
      class="w-full max-w-md bg-white dark:bg-gray-875 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 p-6 space-y-4"
    >
      <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-25 text-center">
        {{ 'تسجيل الدخول' }}
      </h1>
      <p class="text-sm text-gray-600 dark:text-gray-400 text-center">
        {{ 'أدخل اسم المستخدم وكلمة المرور للمتابعة.' }}
      </p>

      <div class="space-y-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            {{ 'اسم المستخدم' }}
          </label>
          <input
            v-model="username"
            type="text"
            class="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            autocomplete="username"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            {{ 'كلمة المرور' }}
          </label>
          <input
            v-model="password"
            type="password"
            class="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            autocomplete="current-password"
            @keyup.enter="onSubmit"
          />
        </div>

        <div class="flex items-center text-xs text-gray-600 dark:text-gray-400">
          <label class="inline-flex items-center gap-1">
            <input
              v-model="rememberUsername"
              type="checkbox"
              class="rounded border-gray-300 dark:border-gray-700 text-blue-600"
            />
            <span>{{ 'تذكر اسم المستخدم' }}</span>
          </label>
        </div>
      </div>

      <p v-if="error" class="text-sm text-red-600 dark:text-red-400">
        {{ error }}
      </p>

      <button
        class="w-full py-2.5 rounded-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
        :disabled="loading || !username || !password"
        @click="onSubmit"
      >
        <span v-if="!loading">{{ 'دخول' }}</span>
        <span v-else>{{ 'جاري التحقق...' }}</span>
      </button>

      <p class="text-xs text-gray-500 dark:text-gray-500 text-center">
        {{
          'المستخدم Admin يمتلك كامل الصلاحيات ويمكنه إنشاء مستخدمين وصلاحيات مخصصة.'
        }}
      </p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { login } from 'src/utils/authService';

export default defineComponent({
  name: 'Login',
  emits: ['logged-in'],
  data() {
    let lastUsername = '';
    try {
      lastUsername = localStorage.getItem('lastUsername') ?? '';
    } catch {
      // ignore
    }

    return {
      username: lastUsername,
      password: '',
      rememberUsername: !!lastUsername,
      loading: false,
      error: '',
    };
  },
  watch: {
    rememberUsername(value: boolean) {
      if (!value) {
        try {
          localStorage.removeItem('lastUsername');
        } catch {
          // ignore
        }
      } else if (this.username) {
        try {
          localStorage.setItem('lastUsername', this.username);
        } catch {
          // ignore
        }
      }
    },
    username(value: string) {
      if (this.rememberUsername && value) {
        try {
          localStorage.setItem('lastUsername', value);
        } catch {
          // ignore
        }
      }
    },
  },
  methods: {
    async onSubmit() {
      if (!this.username || !this.password || this.loading) {
        return;
      }

      this.error = '';
      this.loading = true;
      try {
        await login(this.username.trim(), this.password);
        this.$emit('logged-in');
      } catch (err) {
        if (err instanceof Error) {
          this.error = err.message;
        } else {
          this.error = 'حدث خطأ غير متوقع أثناء تسجيل الدخول.';
        }
      } finally {
        this.loading = false;
      }
    },
  },
});
</script>

