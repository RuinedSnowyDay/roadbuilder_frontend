<template>
  <div class="markdown-editor">
    <div class="editor-header">
      <h3>{{ resourceTitle }}</h3>
      <div class="editor-actions">
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

const props = defineProps<{
  resourceId: string;
  resourceTitle: string;
  initialContent?: string;
}>();

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
  background-color: white;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e0e0e0;
  background-color: #f9f9f9;
}

.editor-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #333;
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
  background-color: #4caf50;
  color: white;
}

.save-button:hover:not(:disabled) {
  background-color: #45a049;
}

.save-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.save-button.saved {
  background-color: #81c784 !important; /* Green-grey color */
  cursor: not-allowed;
}

.save-button.saved:disabled {
  background-color: #81c784 !important; /* Green-grey color */
  opacity: 0.8;
  cursor: not-allowed;
}

.save-button.saved:hover {
  background-color: #81c784 !important; /* Keep green-grey on hover */
  cursor: not-allowed;
}

.cancel-button {
  background-color: #f5f5f5;
  color: #333;
}

.cancel-button:hover:not(:disabled) {
  background-color: #e0e0e0;
}

.cancel-button:disabled {
  opacity: 0.6;
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
  color: #333;
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
  background-color: #f5f5f5;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

.editor-content :deep(.ProseMirror pre) {
  background-color: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
  margin: 1rem 0;
}

.editor-content :deep(.ProseMirror pre code) {
  background-color: transparent;
  padding: 0;
}

.editor-content :deep(.ProseMirror blockquote) {
  border-left: 4px solid #e0e0e0;
  padding-left: 1rem;
  margin: 1rem 0;
  color: #666;
  font-style: italic;
}

.editor-content :deep(.ProseMirror strong) {
  font-weight: 600;
}

.editor-content :deep(.ProseMirror em) {
  font-style: italic;
}

.error-message {
  padding: 0.75rem 1.5rem;
  background-color: #ffebee;
  color: #f44336;
  font-size: 0.9rem;
  border-top: 1px solid #e0e0e0;
}
</style>

