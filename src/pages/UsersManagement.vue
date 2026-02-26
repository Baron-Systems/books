<template>
  <FormContainer>
    <template #header>
      <Button type="primary" @click="openCreate">
        {{ 'إضافة مستخدم' }}
      </Button>
    </template>
    <template #body>
      <FormHeader
        :form-title="'إدارة المستخدمين'"
        :form-sub-title="'Admin فقط'"
        class="sticky top-0 bg-white dark:bg-gray-890 border-b dark:border-gray-800"
      />

      <div class="p-4">
        <div v-if="!hasManagePermission" class="text-sm text-red-600 dark:text-red-400">
          {{ 'ليس لديك صلاحية إدارة المستخدمين.' }}
        </div>

        <div v-else>
          <div class="mb-3 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>{{ 'المستخدم Admin يمتلك جميع الصلاحيات ولا يمكن تعطيله.' }}</span>
            <button
              class="text-blue-600 dark:text-blue-300 hover:underline"
              type="button"
              @click="loadUsers"
            >
              {{ 'تحديث القائمة' }}
            </button>
          </div>

          <div class="overflow-auto custom-scroll custom-scroll-thumb1 border app-border rounded-lg">
            <table class="min-w-full text-sm">
              <thead class="bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300">
                <tr>
                  <th class="px-3 py-2 text-start">{{ 'اسم المستخدم' }}</th>
                  <th class="px-3 py-2 text-start">{{ 'الاسم' }}</th>
                  <th class="px-3 py-2 text-start">{{ 'الدور' }}</th>
                  <th class="px-3 py-2 text-start">{{ 'الحالة' }}</th>
                  <th class="px-3 py-2 text-start">{{ 'آخر دخول' }}</th>
                  <th class="px-3 py-2 text-start">{{ 'إجراءات' }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="user in users"
                  :key="user.id"
                  class="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  <td class="px-3 py-2 font-mono text-xs">
                    {{ user.username || '—' }}
                  </td>
                  <td class="px-3 py-2">
                    {{ user.fullName || '—' }}
                  </td>
                  <td class="px-3 py-2">
                    <span
                      class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                      :class="
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
                      "
                    >
                      {{ user.role === 'admin' ? 'Admin' : 'User' }}
                    </span>
                  </td>
                  <td class="px-3 py-2">
                    <span
                      class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                      :class="
                        user.isActive
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200'
                      "
                    >
                      {{ user.isActive ? 'مفعل' : 'معطل' }}
                    </span>
                  </td>
                  <td class="px-3 py-2 text-xs">
                    {{ user.lastLoginAt || '—' }}
                  </td>
                  <td class="px-3 py-2 space-x-2 space-x-reverse">
                    <button
                      class="text-blue-600 dark:text-blue-300 hover:underline text-xs"
                      type="button"
                      @click="openEdit(user)"
                    >
                      {{ 'تعديل' }}
                    </button>
                    <button
                      v-if="user.username !== 'admin'"
                      class="text-xs"
                      type="button"
                      :class="
                        user.isActive
                          ? 'text-red-600 dark:text-red-400 hover:underline'
                          : 'text-green-700 dark:text-green-300 hover:underline'
                      "
                      @click="toggleActive(user)"
                    >
                      {{ user.isActive ? 'تعطيل' : 'تفعيل' }}
                    </button>
                    <button
                      class="text-xs text-amber-600 dark:text-amber-300 hover:underline"
                      type="button"
                      @click="openResetPassword(user)"
                    >
                      {{ 'إعادة تعيين كلمة المرور' }}
                    </button>
                    <button
                      v-if="user.username !== 'admin'"
                      class="text-xs text-red-600 dark:text-red-400 hover:underline"
                      type="button"
                      @click="confirmDelete(user)"
                    >
                      {{ 'حذف' }}
                    </button>
                  </td>
                </tr>
                <tr v-if="!users.length">
                  <td colspan="6" class="px-3 py-4 text-center text-xs text-gray-500 dark:text-gray-400">
                    {{ 'لا يوجد مستخدمون بعد.' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Dialog: add/edit user -->
      <Modal :open-modal="showUserForm" @closemodal="closeUserForm">
        <div class="w-form p-4">
          <h2 class="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-25">
            {{ isEditing ? 'تعديل مستخدم' : 'إضافة مستخدم' }}
          </h2>

          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs mb-1 text-gray-700 dark:text-gray-200">
                  {{ 'اسم المستخدم' }}
                </label>
                <input
                  v-model="form.username"
                  type="text"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-2 py-1.5 text-xs outline-none"
                />
              </div>
              <div>
                <label class="block text-xs mb-1 text-gray-700 dark:text-gray-200">
                  {{ 'الاسم الكامل' }}
                </label>
                <input
                  v-model="form.fullName"
                  type="text"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-2 py-1.5 text-xs outline-none"
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs mb-1 text-gray-700 dark:text-gray-200">
                  {{ 'الدور' }}
                </label>
                <select
                  v-model="form.role"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-2 py-1.5 text-xs outline-none"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div class="flex items-center mt-5">
                <label class="inline-flex items-center gap-1 text-xs text-gray-700 dark:text-gray-200">
                  <input
                    v-model="form.isActive"
                    type="checkbox"
                    class="rounded border-gray-300 dark:border-gray-700 text-blue-600"
                  />
                  <span>{{ 'مفعل' }}</span>
                </label>
              </div>
            </div>

            <div v-if="!isEditing || changePasswordMode" class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs mb-1 text-gray-700 dark:text-gray-200">
                  {{ 'كلمة المرور' }}
                </label>
                <input
                  v-model="form.password"
                  type="password"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-2 py-1.5 text-xs outline-none"
                />
              </div>
              <div>
                <label class="block text-xs mb-1 text-gray-700 dark:text-gray-200">
                  {{ 'تأكيد كلمة المرور' }}
                </label>
                <input
                  v-model="form.passwordConfirm"
                  type="password"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-2 py-1.5 text-xs outline-none"
                />
              </div>
            </div>

            <div v-if="isEditing && !changePasswordMode" class="flex justify-end">
              <button
                class="text-xs text-amber-600 dark:text-amber-300 hover:underline"
                type="button"
                @click="changePasswordMode = true"
              >
                {{ 'تغيير كلمة المرور' }}
              </button>
            </div>

            <div>
              <p class="text-xs font-semibold mb-1 text-gray-800 dark:text-gray-200">
                {{ 'الصلاحيات' }}
              </p>
              <div class="space-y-2 max-h-64 overflow-auto custom-scroll custom-scroll-thumb1 border rounded-md p-2">
                <div
                  v-for="group in permissionGroups"
                  :key="group.id"
                  class="border-b last:border-0 border-gray-200 dark:border-gray-800 pb-2 mb-2 last:pb-0 last:mb-0"
                >
                  <p class="text-xs font-semibold mb-1 text-gray-800 dark:text-gray-200">
                    {{ group.label }}
                  </p>
                  <div class="grid grid-cols-2 gap-1">
                    <label
                      v-for="perm in group.permissions"
                      :key="perm.code"
                      class="inline-flex items-start gap-1 text-[11px] text-gray-700 dark:text-gray-200"
                    >
                      <input
                        v-model="form.permissions"
                        type="checkbox"
                        class="mt-0.5 rounded border-gray-300 dark:border-gray-700 text-blue-600"
                        :value="perm.code"
                      />
                      <span>
                        <span class="font-semibold">{{ perm.label }}</span>
                        <span v-if="perm.description" class="block text-[10px] text-gray-500 dark:text-gray-400">
                          {{ perm.description }}
                        </span>
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <p class="text-xs font-semibold mb-1 text-gray-800 dark:text-gray-200">
                {{ 'الواجهات المسموحة' }}
              </p>
              <p class="text-[10px] text-gray-500 dark:text-gray-400 mb-1">
                {{ 'حدد الواجهات التي يمكن للمستخدم الوصول إليها. إن تركت القائمة فارغة سيتم اشتقاق الواجهات من الصلاحيات أعلاه.' }}
              </p>
              <div class="space-y-2 max-h-48 overflow-auto custom-scroll custom-scroll-thumb1 border rounded-md p-2">
                <div
                  v-for="group in interfaceGroups"
                  :key="group.id"
                  class="border-b last:border-0 border-gray-200 dark:border-gray-800 pb-2 mb-2 last:pb-0 last:mb-0"
                >
                  <p class="text-xs font-semibold mb-1 text-gray-800 dark:text-gray-200">
                    {{ group.label }}
                  </p>
                  <div class="grid grid-cols-2 gap-1">
                    <label
                      v-for="iface in group.interfaces"
                      :key="iface.id"
                      class="inline-flex items-center gap-1 text-[11px] text-gray-700 dark:text-gray-200"
                    >
                      <input
                        type="checkbox"
                        class="rounded border-gray-300 dark:border-gray-700 text-blue-600"
                        :checked="form.allowedInterfaces.includes(iface.id)"
                        @change="toggleAllowedInterface(iface.id)"
                      />
                      <span>{{ iface.label }}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <p v-if="formError" class="text-xs text-red-600 dark:text-red-400">
              {{ formError }}
            </p>

            <div class="flex justify-end gap-2 mt-3">
              <Button type="secondary" @click="closeUserForm">
                {{ 'إلغاء' }}
              </Button>
              <Button type="primary" @click="submitUser" :disabled="formLoading">
                {{ formLoading ? 'جارٍ الحفظ...' : 'حفظ' }}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </template>
  </FormContainer>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import Button from 'src/components/Button.vue';
import FormContainer from 'src/components/FormContainer.vue';
import FormHeader from 'src/components/FormHeader.vue';
import Modal from 'src/components/Modal.vue';
import { permissionGroups, PERMISSIONS, type PermissionCode } from 'src/utils/permissions';
import { interfaceGroups } from 'src/utils/interfaces';
import {
  listUsers,
  setActive,
  updateUser,
  createUser,
  resetPassword,
  deleteUser,
  type UserListItem,
} from 'src/utils/userService';
import { hasPermission } from 'src/utils/authService';
import { showDialog, showToast } from 'src/utils/interactive';

export default defineComponent({
  name: 'UsersManagement',
  components: {
    FormContainer,
    FormHeader,
    Button,
    Modal,
  },
  data() {
    return {
      users: [] as UserListItem[],
      loading: false,
      showUserForm: false,
      isEditing: false,
      form: {
        id: '',
        username: '',
        fullName: '',
        role: 'user' as 'admin' | 'user',
        isActive: true,
        password: '',
        passwordConfirm: '',
        permissions: [] as PermissionCode[],
        allowedInterfaces: [] as string[],
      },
      formError: '',
      formLoading: false,
      changePasswordMode: false,
    };
  },
  computed: {
    permissionGroups() {
      return permissionGroups;
    },
    interfaceGroups() {
      return interfaceGroups;
    },
    hasManagePermission(): boolean {
      return hasPermission(PERMISSIONS.USERS_MANAGE);
    },
  },
  async mounted() {
    if (this.hasManagePermission) {
      await this.loadUsers();
    }
  },
  methods: {
    async loadUsers() {
      try {
        this.loading = true;
        this.users = await listUsers();
      } catch (err) {
        console.error(err);
        showToast({
          type: 'error',
          message: 'فشل في تحميل قائمة المستخدمين',
        });
      } finally {
        this.loading = false;
      }
    },
    openCreate() {
      this.isEditing = false;
      this.changePasswordMode = true;
      this.formError = '';
      this.form = {
        id: '',
        username: '',
        fullName: '',
        role: 'user',
        isActive: true,
        password: '',
        passwordConfirm: '',
        permissions: [],
        allowedInterfaces: [],
      };
      this.showUserForm = true;
    },
    openEdit(user: UserListItem) {
      this.isEditing = true;
      this.changePasswordMode = false;
      this.formError = '';
      this.form = {
        id: user.id,
        username: user.username,
        fullName: user.fullName || '',
        role: user.role,
        isActive: user.isActive,
        password: '',
        passwordConfirm: '',
        permissions: [...user.permissions],
        allowedInterfaces: user.allowedInterfaces ? [...user.allowedInterfaces] : [],
      };
      this.showUserForm = true;
    },
    toggleAllowedInterface(interfaceId: string) {
      const i = this.form.allowedInterfaces.indexOf(interfaceId);
      if (i >= 0) {
        this.form.allowedInterfaces = this.form.allowedInterfaces.filter((id) => id !== interfaceId);
      } else {
        this.form.allowedInterfaces = [...this.form.allowedInterfaces, interfaceId];
      }
    },
    closeUserForm() {
      this.showUserForm = false;
      this.formLoading = false;
      this.formError = '';
      this.changePasswordMode = false;
    },
    validateForm(): boolean {
      const username = (this.form.username || '').trim();
      const fullName = (this.form.fullName || '').trim();

      if (!username) {
        this.formError = 'اسم المستخدم مطلوب';
        return false;
      }
      if (!this.isEditing || this.changePasswordMode) {
        if (!this.form.password) {
          this.formError = 'كلمة المرور مطلوبة';
          return false;
        }
        if (this.form.password !== this.form.passwordConfirm) {
          this.formError = 'كلمتا المرور غير متطابقتين';
          return false;
        }
      }
      this.formError = '';
      return true;
    },
    async submitUser() {
      const username = (this.form.username || '').trim();
      const fullName = (this.form.fullName || '').trim();

      if (!this.validateForm()) {
        return;
      }

      this.formLoading = true;
      try {
        if (this.isEditing) {
          await updateUser(this.form.id, {
            username,
            fullName: fullName || null,
            role: this.form.role,
            allowedInterfaces: this.form.allowedInterfaces.length ? this.form.allowedInterfaces : null,
            isActive: this.form.isActive,
            permissions: this.form.permissions,
          });
          if (this.changePasswordMode && this.form.password) {
            await resetPassword(this.form.id, this.form.password);
          }
          showToast({ type: 'success', message: 'تم تحديث المستخدم بنجاح' });
        } else {
          await createUser({
            username,
            fullName: fullName || undefined,
            role: this.form.role,
            isActive: this.form.isActive,
            password: this.form.password,
            permissions: this.form.permissions,
            allowedInterfaces: this.form.allowedInterfaces.length ? this.form.allowedInterfaces : null,
          });
          showToast({ type: 'success', message: 'تم إنشاء المستخدم بنجاح' });
        }

        await this.loadUsers();
        this.closeUserForm();
      } catch (err) {
        console.error(err);
        if (err instanceof Error) {
          this.formError = err.message;
        } else {
          this.formError = 'حدث خطأ أثناء حفظ المستخدم.';
        }
      } finally {
        this.formLoading = false;
      }
    },
    async toggleActive(user: UserListItem) {
      try {
        await setActive(user.id, !user.isActive);
        await this.loadUsers();
        showToast({
          type: 'success',
          message: user.isActive ? 'تم تعطيل المستخدم' : 'تم تفعيل المستخدم',
        });
      } catch (err) {
        console.error(err);
        showToast({
          type: 'error',
          message: 'فشل في تحديث حالة المستخدم',
        });
      }
    },
    openResetPassword(user: UserListItem) {
      this.openEdit(user);
      this.changePasswordMode = true;
    },
    async confirmDelete(user: UserListItem) {
      const confirmed = (await showDialog({
        title: 'حذف المستخدم',
        detail: `سيتم حذف المستخدم "${user.username || user.id}". هذا الإجراء لا يمكن التراجع عنه.`,
        type: 'warning',
        buttons: [
          {
            label: 'نعم',
            isPrimary: true,
            action: () => true,
          },
          {
            label: 'لا',
            isEscape: true,
            action: () => false,
          },
        ],
      })) as boolean;

      if (!confirmed) {
        return;
      }

      try {
        await deleteUser(user.id);
        await this.loadUsers();
        showToast({
          type: 'success',
          message: 'تم حذف المستخدم بنجاح',
        });
      } catch (err) {
        console.error(err);
        showToast({
          type: 'error',
          message: 'فشل في حذف المستخدم',
        });
      }
    },
  },
});
</script>

