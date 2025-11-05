<template>
  <div class="markdown-editor">
    <div class="editor-header">
      <h3>{{ resourceTitle }}</h3>
    <div v-if="!readOnly" class="editor-actions">
      <button
        @click="handleSave"
        :disabled="saving || (!hasChanges && !saved)"
        class="save-button"
        :class="{ 'saved': saved && !hasChanges }"
      >
        {{ saving ? 'Saving...' : saved && !hasChanges ? 'Saved' : 'Save' }}
      </button>
      <button
        @click="handleCancel"
        :disabled="saving"
        class="cancel-button"
      >
        Close
      </button>
    </div>
    <div v-else class="editor-actions">
      <button
        @click="handleCancel"
        class="cancel-button"
      >
        Close
      </button>
    </div>
    </div>
    <div class="editor-content">
      <EditorContent :editor="editor" />
    </div>
    <div v-if="saveError" class="error-message">{{ saveError }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';

const props = withDefaults(defineProps<{
  resourceId: string;
  resourceTitle: string;
  initialContent?: string;
  readOnly?: boolean;
}>(), {
  readOnly: false,
});

const emit = defineEmits<{
  save: [content: string];
  cancel: [];
}>();

const saving = ref(false);
const saveError = ref('');
const hasChanges = ref(false);
const saved = ref(false);

const editor = useEditor({
  extensions: [StarterKit],
  content: props.initialContent || '',
  editable: !props.readOnly,
  editorProps: {
    attributes: {
      class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none',
    },
  },
  onUpdate: () => {
    hasChanges.value = true;
    saved.value = false; // Reset saved state when content changes
  },
});

// Watch for content changes from outside
watch(
  () => props.initialContent,
  (newContent) => {
    if (editor.value && newContent !== undefined && editor.value.getHTML() !== newContent) {
      editor.value.commands.setContent(newContent || '');
      hasChanges.value = false;
      saved.value = false; // Reset saved state when content changes externally
    }
  }
);

// Watch for readOnly changes
watch(
  () => props.readOnly,
  (readOnly) => {
    if (editor.value) {
      editor.value.setEditable(!readOnly);
    }
  }
);

onMounted(() => {
  if (editor.value && props.initialContent) {
    editor.value.commands.setContent(props.initialContent);
  }
});

onBeforeUnmount(() => {
  if (editor.value) {
    editor.value.destroy();
  }
});

async function handleSave() {
  if (!editor.value) {
    return;
  }

  saving.value = true;
  saveError.value = '';

  try {
    const content = editor.value.getHTML();
    emit('save', content);
    // Assume success - parent will handle errors via alerts
    hasChanges.value = false;
    saved.value = true;
  } catch (err) {
    saveError.value = err instanceof Error ? err.message : 'Failed to save';
    saved.value = false;
  } finally {
    saving.value = false;
  }
}

function handleCancel() {
  if (editor.value && props.initialContent !== undefined) {
    editor.value.commands.setContent(props.initialContent || '');
    hasChanges.value = false;
    saved.value = false; // Reset saved state on cancel
  }
  emit('cancel');
}
</script>

<style scoped>
.markdown-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--gunmetal-bg-dark);
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
  background-color: var(--gunmetal-bg);
}

.editor-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--color-heading);
  font-weight: 600;
}

.editor-actions {
  display: flex;
  gap: 0.75rem;
}

.save-button,
.cancel-button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.save-button {
  background-color: var(--color-accent);
  color: var(--gunmetal-bg-dark);
  font-weight: 600;
}

.save-button:hover:not(:disabled) {
  background-color: var(--color-accent-hover);
}

.save-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.save-button.saved {
  background-color: var(--gunmetal-secondary) !important;
  cursor: not-allowed;
}

.save-button.saved:disabled {
  background-color: var(--gunmetal-secondary) !important;
  opacity: 0.8;
  cursor: not-allowed;
}

.save-button.saved:hover {
  background-color: var(--gunmetal-secondary) !important;
  cursor: not-allowed;
}

.cancel-button {
  background-color: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.cancel-button:hover:not(:disabled) {
  background-color: rgba(132, 136, 143, 0.1);
  border-color: var(--gunmetal-secondary);
}

.cancel-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.editor-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.editor-content :deep(.ProseMirror) {
  outline: none;
  min-height: 300px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  font-size: 1rem;
  line-height: 1.6;
  color: var(--color-text);
}

.editor-content :deep(.ProseMirror p) {
  margin: 0.75rem 0;
}

.editor-content :deep(.ProseMirror h1) {
  font-size: 2rem;
  font-weight: 700;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}

.editor-content :deep(.ProseMirror h2) {
  font-size: 1.5rem;
  font-weight: 600;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
}

.editor-content :deep(.ProseMirror h3) {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.editor-content :deep(.ProseMirror ul),
.editor-content :deep(.ProseMirror ol) {
  margin: 0.75rem 0;
  padding-left: 2rem;
}

.editor-content :deep(.ProseMirror li) {
  margin: 0.25rem 0;
}

.editor-content :deep(.ProseMirror code) {
  background-color: var(--gunmetal-bg);
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
  color: var(--color-accent);
}

.editor-content :deep(.ProseMirror pre) {
  background-color: var(--gunmetal-bg);
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
  margin: 1rem 0;
  border: 1px solid var(--color-border);
}

.editor-content :deep(.ProseMirror pre code) {
  background-color: transparent;
  padding: 0;
  color: var(--color-text);
}

.editor-content :deep(.ProseMirror blockquote) {
  border-left: 4px solid var(--color-accent);
  padding-left: 1rem;
  margin: 1rem 0;
  color: var(--color-text-secondary);
  font-style: italic;
}

.editor-content :deep(.ProseMirror strong) {
  font-weight: 600;
  color: var(--color-heading);
}

.editor-content :deep(.ProseMirror em) {
  font-style: italic;
}

.editor-content :deep(.ProseMirror h1),
.editor-content :deep(.ProseMirror h2),
.editor-content :deep(.ProseMirror h3) {
  color: var(--color-heading);
}

.error-message {
  padding: 0.75rem 1.5rem;
  background-color: rgba(255, 107, 107, 0.15);
  color: #ff6b6b;
  font-size: 0.9rem;
  border-top: 1px solid var(--color-border);
}
</style>

