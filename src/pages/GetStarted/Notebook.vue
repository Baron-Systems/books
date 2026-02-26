<template>
  <div
    class="
      notebook-root
      flex
      flex-1
      min-h-0
      overflow-hidden
      rounded-2xl
      border border-gray-200 dark:border-gray-800
      bg-white dark:bg-gray-900
      shadow-sm
    "
  >
    <!-- List Pane (سايدبار الملاحظات على اليمين في الواجهة العربية) -->
    <aside
      class="list-pane flex flex-col border-e border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/80 overflow-hidden"
      style="flex: 0 0 280px; width: 280px; min-width: 280px; max-width: 280px;"
    >
      <header class="p-3 border-b border-gray-200 dark:border-gray-800 flex flex-col gap-2">
        <Button
          type="primary"
          class="w-full justify-center gap-2 h-9 text-sm"
          @click="createNew"
        >
          <feather-icon name="plus" class="w-4 h-4" />
          <span>{{ t`ملاحظة جديدة` }}</span>
        </Button>
        <div class="flex items-center gap-2">
          <input
            v-model="searchQuery"
            type="search"
            :placeholder="t`بحث في الملاحظات...`"
            class="
              flex-1 min-w-0 h-9 px-3 rounded-lg
              border border-gray-200 dark:border-gray-700
              bg-white dark:bg-gray-875
              text-sm text-gray-900 dark:text-gray-100
              placeholder-gray-400 dark:placeholder-gray-500
              outline-none focus:ring-2 focus:ring-blue-500/30
            "
          />
        </div>
      </header>
      <div class="flex-1 overflow-y-auto custom-scroll custom-scroll-thumb1">
        <button
          v-for="note in filteredNotes"
          :key="note.id"
          type="button"
          class="
            note-row
            w-full text-start px-3 py-3
            border-b border-gray-100 dark:border-gray-800/80
            transition-colors
            hover:bg-gray-100 dark:hover:bg-gray-800/80
          "
          :class="{
            'bg-blue-50 dark:bg-blue-950/40 border-s-2 border-s-blue-500': selectedId === note.id,
          }"
          @click="selectNote(note.id)"
        >
          <p class="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
            {{ note.title || t`بدون عنوان` }}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {{ previewFor(note) }}
          </p>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {{ formatDate(note.updatedAt) }}
          </p>
        </button>
        <p
          v-if="filteredNotes.length === 0"
          class="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center"
        >
          {{ searchQuery ? t`لا توجد نتائج` : t`لا توجد ملاحظات بعد` }}
        </p>
      </div>
    </aside>

    <!-- Editor Pane -->
    <main class="editor-pane flex-1 flex flex-col min-w-0 min-h-0">
      <template v-if="selectedNote">
        <header
          class="
            flex-shrink-0
            flex items-center gap-2
            px-4 py-2
            border-b border-gray-200 dark:border-gray-800
            bg-white dark:bg-gray-875
          "
        >
          <input
            ref="titleInputRef"
            v-model="editorTitle"
            type="text"
            class="
              flex-1 min-w-0 h-9 px-3 rounded-lg
              border border-gray-200 dark:border-gray-700
              bg-gray-50 dark:bg-gray-900
              text-sm font-medium text-gray-900 dark:text-gray-100
              outline-none focus:ring-2 focus:ring-blue-500/30
            "
            :placeholder="t`عنوان الملاحظة`"
            @blur="syncEditorToNote"
          />
          <span
            v-if="savedIndicator"
            class="text-xs text-green-600 dark:text-green-400 whitespace-nowrap"
          >
            {{ t`تم الحفظ` }}
          </span>
          <Button
            type="secondary"
            class="shrink-0 h-9 px-3 text-sm"
            @click="saveNow"
          >
            {{ t`حفظ` }}
          </Button>
          <Button
            type="secondary"
            class="shrink-0 h-9 px-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
            @click="confirmDelete"
          >
            {{ t`حذف` }}
          </Button>
        </header>
        <div class="flex-1 flex flex-col min-h-0 p-4 overflow-hidden">
          <textarea
            v-model="editorContent"
            class="
              flex-1 min-h-[120px] w-full resize-none
              px-3 py-3 rounded-lg
              border border-gray-200 dark:border-gray-700
              bg-gray-50/50 dark:bg-gray-900/50
              text-sm text-gray-900 dark:text-gray-100
              placeholder-gray-400 dark:placeholder-gray-500
              outline-none focus:ring-2 focus:ring-blue-500/30
              leading-relaxed
            "
            :placeholder="t`اكتب ملاحظاتك هنا...`"
            @input="scheduleSave"
          />
        </div>
      </template>
      <div
        v-else
        class="
          flex-1 flex flex-col items-center justify-center
          p-8 text-center text-gray-500 dark:text-gray-400
        "
      >
        <feather-icon name="file-text" class="w-12 h-12 mb-3 opacity-50" />
        <p class="text-sm font-medium">
          {{ t`اختر ملاحظة من القائمة أو أنشئ ملاحظة جديدة` }}
        </p>
      </div>
    </main>
  </div>
</template>

<script lang="ts">
import { t } from 'fyo';
import Button from 'src/components/Button.vue';
import { showDialog, showToast } from 'src/utils/interactive';
import {
  createNote,
  deleteNote,
  getNotes,
  type Note,
  saveNote,
} from 'src/utils/notesService';
import { defineComponent, nextTick, ref, computed, watch } from 'vue';

const DEBOUNCE_MS = 600;

export default defineComponent({
  name: 'GetStartedNotebook',
  components: { Button },
  setup() {
    const notes = ref<Note[]>(getNotes());
    const selectedId = ref<string | null>(null);
    const searchQuery = ref('');
    const editorTitle = ref('');
    const editorContent = ref('');
    const savedIndicator = ref(false);
    const titleInputRef = ref<HTMLInputElement | null>(null);
    let saveTimer: ReturnType<typeof setTimeout> | null = null;

    const filteredNotes = computed(() => {
      const list = notes.value;
      const q = searchQuery.value.trim().toLowerCase();
      if (!q) return list;
      return list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
      );
    });

    const selectedNote = computed(() =>
      selectedId.value
        ? notes.value.find((n) => n.id === selectedId.value) ?? null
        : null
    );

    function refreshNotes() {
      notes.value = getNotes();
    }

    function previewFor(note: Note): string {
      const text = (note.content || '').trim();
      if (!text) return '';
      const firstLine = text.split(/\r?\n/)[0] ?? '';
      return firstLine.slice(0, 80) + (firstLine.length > 80 ? '…' : '');
    }

    function formatDate(iso: string): string {
      const d = new Date(iso);
      const now = new Date();
      const today =
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate();
      if (today) {
        return d.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
        });
      }
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday =
        d.getFullYear() === yesterday.getFullYear() &&
        d.getMonth() === yesterday.getMonth() &&
        d.getDate() === yesterday.getDate();
      if (isYesterday) return t`أمس`;
      return d.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }

    function selectNote(id: string) {
      syncEditorToNote();
      selectedId.value = id;
      const n = notes.value.find((note) => note.id === id);
      if (n) {
        editorTitle.value = n.title;
        editorContent.value = n.content;
      }
      nextTick(() => titleInputRef.value?.focus());
    }

    function syncEditorToNote() {
      const id = selectedId.value;
      const n = id ? notes.value.find((note) => note.id === id) : null;
      if (!n) return;
      const title = editorTitle.value.trim();
      const content = editorContent.value;
      if (n.title !== title || n.content !== content) {
        saveNote({ ...n, title, content });
        refreshNotes();
      }
    }

    function scheduleSave() {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        saveTimer = null;
        syncEditorToNote();
        if (selectedId.value) {
          refreshNotes();
          savedIndicator.value = true;
          setTimeout(() => {
            savedIndicator.value = false;
          }, 2000);
        }
      }, DEBOUNCE_MS);
    }

    function saveNow() {
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      syncEditorToNote();
      if (selectedId.value) {
        refreshNotes();
        savedIndicator.value = true;
        setTimeout(() => {
          savedIndicator.value = false;
        }, 2000);
        showToast({ message: t`تم الحفظ`, type: 'success', duration: 'short' });
      }
    }

    function createNew() {
      syncEditorToNote();
      const note = createNote();
      refreshNotes();
      selectedId.value = note.id;
      editorTitle.value = note.title;
      editorContent.value = note.content;
      nextTick(() => titleInputRef.value?.focus());
    }

    async function confirmDelete() {
      const id = selectedId.value;
      if (!id) return;
      const confirmed = await showDialog({
        title: t`حذف الملاحظة؟`,
        detail: t`هل تريد حذف هذه الملاحظة؟ لا يمكن التراجع.`,
        type: 'warning',
        buttons: [
          {
            label: t`نعم، احذف`,
            action: () => true,
            isPrimary: true,
          },
          {
            label: t`إلغاء`,
            action: () => false,
            isEscape: true,
          },
        ],
      });
      if (confirmed) {
        deleteNote(id);
        refreshNotes();
        if (selectedId.value === id) {
          selectedId.value = null;
          editorTitle.value = '';
          editorContent.value = '';
        }
        showToast({ message: t`تم الحذف`, type: 'success', duration: 'short' });
      }
    }

    watch(selectedId, (id) => {
      if (!id) return;
      const n = notes.value.find((note) => note.id === id);
      if (n) {
        editorTitle.value = n.title;
        editorContent.value = n.content;
      }
    });

    return {
      notes,
      selectedId,
      searchQuery,
      filteredNotes,
      selectedNote,
      editorTitle,
      editorContent,
      savedIndicator,
      titleInputRef,
      previewFor,
      formatDate,
      selectNote,
      createNew,
      saveNow,
      syncEditorToNote,
      scheduleSave,
      confirmDelete,
    };
  },
});
</script>

<style scoped>
.notebook-root {
  --notebook-list-width: 280px;
}
.list-pane {
  order: 1;
  flex: 0 0 280px !important;
  width: 280px !important;
  min-width: 280px !important;
  max-width: 280px !important;
}
.editor-pane {
  order: 2;
  min-width: 0; /* يسمح للمحرر بالانكماش ولا يدفع العمود */
}
[dir='rtl'] .note-row.border-s-2 {
  border-inline-start: none;
  border-inline-end: 2px solid var(--tw-color-blue-500);
}
/* منع محتوى الصفوف من توسيع العمود */
.note-row {
  min-width: 0;
}
.note-row p {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
