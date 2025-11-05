<template>
  <div
    v-if="selectedNode"
    class="dialog-overlay"
    @click="handleClose"
  >
    <div class="node-content-dialog" @click.stop>
      <div class="dialog-header">
        <h2>Node Content</h2>
        <button @click="handleClose" class="close-button" title="Close">×</button>
      </div>
      <div class="dialog-body" :class="{ 'has-editor': editingResource }">
        <!-- Node Title Editor -->
        <div class="title-section">
          <label for="node-title-input" class="title-label">Node Title:</label>
          <div class="title-input-wrapper">
            <input
              id="node-title-input"
              v-model="editingTitle"
              type="text"
              class="title-input"
              :class="{ 'error': hasDuplicateError }"
              :disabled="isSharedRoadmap"
              @blur="handleTitleBlur"
              @keyup.enter="handleTitleSubmit"
              @keyup.esc="handleTitleCancel"
            />
            <div v-if="hasDuplicateError" class="error-message">
              A node with this title already exists. Reverting to previous name.
            </div>
          </div>
        </div>

        <!-- Resources Section -->
        <div class="resources-section">
          <div class="resources-header">
            <h3 class="resources-title">Resources</h3>
            <button
              v-if="!isSharedRoadmap"
              @click="showAddResourceDialog = true"
              class="add-resource-button"
              title="Add Resource"
            >
              + Add Resource
            </button>
          </div>
          <div v-if="loadingResources" class="loading">Loading resources...</div>
          <div v-else-if="resourcesError" class="error">{{ resourcesError }}</div>
          <div v-else-if="resources.length === 0" class="empty-state">
            <p>No resources yet. Click "Add Resource" to get started.</p>
          </div>
          <div v-else class="resources-list">
            <div
              v-for="(resource, index) in resources"
              :key="resource._id"
              class="resource-item"
              :class="{ 'dragging': draggingIndex === index, 'drag-over': dragOverIndex === index }"
              :draggable="!isSharedRoadmap"
              @dragstart="handleDragStart($event, index)"
              @dragend="handleDragEnd"
              @dragover.prevent="handleDragOver($event, index)"
              @dragenter.prevent="handleDragEnter(index)"
              @dragleave="handleDragLeave"
              @drop="handleDrop($event, index)"
              @click="loadResourceCheckIfNeeded(resource.resource)"
            >
              <div class="resource-drag-handle" title="Drag to reorder">⋮⋮</div>
              <div class="resource-index">{{ index + 1 }}</div>
              <input
                type="checkbox"
                :checked="isResourceChecked(resource.resource)"
                @change="handleToggleResource(resource.resource)"
                @click.stop
                class="resource-checkbox"
                title="Mark as complete"
              />
              <div
                class="resource-content"
                :class="{ 'completed': isResourceChecked(resource.resource) }"
                @click="handleResourceClick(resource)"
                title="Click to edit content"
                style="cursor: pointer;"
              >
                <div class="resource-title">{{ resource.title }}</div>
              </div>
              <button
                v-if="!isSharedRoadmap"
                @click.stop="handleDeleteResource(index)"
                class="delete-resource-button"
                title="Delete Resource"
                :disabled="deletingResourceIndex === index"
              >
                {{ deletingResourceIndex === index ? '...' : '×' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Markdown Editor -->
        <div v-if="editingResource" class="editor-section">
          <MarkdownEditor
            :resource-id="editingResource._id"
            :resource-title="editingResource.title"
            :initial-content="editingResourceContent"
            :read-only="isSharedRoadmap"
            @save="handleSaveResourceContent"
            @cancel="handleCancelEditResource"
          />
        </div>
      </div>
    </div>

    <!-- Add Resource Dialog -->
    <div
      v-if="showAddResourceDialog"
      class="dialog-overlay-small"
      @click="showAddResourceDialog = false"
    >
      <div class="dialog-content-small" @click.stop>
        <h3>Add Resource</h3>
        <form @submit.prevent="handleAddResource">
          <div class="form-group">
            <label for="resource-title-input">Resource Title *</label>
            <input
              id="resource-title-input"
              v-model="newResourceTitle"
              type="text"
              required
              placeholder="Enter resource title"
              :disabled="addingResource"
              autofocus
            />
          </div>
          <div v-if="addResourceError" class="error-message">{{ addResourceError }}</div>
          <div class="dialog-actions">
            <button
              type="button"
              @click="handleCancelAddResource"
              :disabled="addingResource"
              class="cancel-button"
            >
              Cancel
            </button>
            <button type="submit" :disabled="addingResource" class="submit-button">
              {{ addingResource ? 'Adding...' : 'Add' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoadmapStore } from '../stores/roadmap';
import { storeToRefs } from 'pinia';
import MarkdownEditor from './MarkdownEditor.vue';
import type { IndexedResource } from '../services/types';

const roadmapStore = useRoadmapStore();
const { selectedNode, nodeResources, loadingResources, error, nodes, resourceChecks, isSharedRoadmap } = storeToRefs(roadmapStore);

const resources = computed(() => nodeResources.value);
const resourcesError = computed(() => error.value);

const editingTitle = ref('');
const originalTitle = ref('');
const hasDuplicateError = ref(false);

// Add Resource state
const showAddResourceDialog = ref(false);
const newResourceTitle = ref('');
const addingResource = ref(false);
const addResourceError = ref('');
const deletingResourceIndex = ref<number | null>(null);

// Drag and drop state
const draggingIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);

// Resource editing state
const editingResource = ref<IndexedResource | null>(null);
const editingResourceContent = ref<string>('');

// Watch for selectedNode changes to initialize title editing
watch(selectedNode, (newNode) => {
  if (newNode) {
    editingTitle.value = newNode.title;
    originalTitle.value = newNode.title;
    hasDuplicateError.value = false;
  }
}, { immediate: true });

async function handleClose() {
  // Save any pending changes before closing
  if (selectedNode.value && editingTitle.value !== originalTitle.value && !hasDuplicateError.value) {
    // Title was changed, save it
    await handleTitleSubmit();
  }
  roadmapStore.clearSelectedNode();
}

function checkDuplicateTitle(title: string): boolean {
  if (!selectedNode.value) return false;
  // Check if any other node has this title
  return nodes.value.some(
    (node) => node._id !== selectedNode.value!._id && node.title === title.trim()
  );
}

async function handleTitleSubmit() {
  if (!selectedNode.value || isSharedRoadmap.value) return;

  const newTitle = editingTitle.value.trim();
  if (newTitle === originalTitle.value) {
    // No change, just remove focus
    return;
  }

  if (!newTitle) {
    // Empty title, revert
    editingTitle.value = originalTitle.value;
    return;
  }

  // Check for duplicate
  if (checkDuplicateTitle(newTitle)) {
    hasDuplicateError.value = true;
    // Revert to original title instantly
    editingTitle.value = originalTitle.value;
    if (selectedNode.value) {
      roadmapStore.updateNodeTitle(selectedNode.value._id, originalTitle.value);
    }
    // Clear error message after a short delay
    setTimeout(() => {
      hasDuplicateError.value = false;
    }, 2000);
    return;
  }

  // Update title
  const error = await roadmapStore.updateNodeTitle(selectedNode.value._id, newTitle);
  if (error) {
    // Revert on error
    editingTitle.value = originalTitle.value;
    alert(`Failed to update title: ${error}`);
  } else {
    // Success - update original title
    originalTitle.value = newTitle;
  }
}

function handleTitleBlur() {
  handleTitleSubmit();
}

function handleTitleCancel() {
  if (!selectedNode.value) return;
  editingTitle.value = originalTitle.value;
  hasDuplicateError.value = false;
}

async function handleAddResource() {
  if (isSharedRoadmap.value) return;
  
  if (!newResourceTitle.value.trim()) {
    addResourceError.value = 'Resource title is required';
    return;
  }

  addingResource.value = true;
  addResourceError.value = '';

  try {
    const error = await roadmapStore.addResource(newResourceTitle.value.trim());
    if (error) {
      addResourceError.value = error;
    } else {
      // Success - close dialog and reset form
      showAddResourceDialog.value = false;
      newResourceTitle.value = '';
      addResourceError.value = '';
    }
  } catch (err) {
    addResourceError.value = err instanceof Error ? err.message : 'Failed to add resource';
  } finally {
    addingResource.value = false;
  }
}

function handleCancelAddResource() {
  showAddResourceDialog.value = false;
  newResourceTitle.value = '';
  addResourceError.value = '';
}

async function handleDeleteResource(index: number) {
  if (isSharedRoadmap.value) return;
  
  if (confirm(`Are you sure you want to delete "${resources.value[index]?.title}"?`)) {
    deletingResourceIndex.value = index;
    const resourceToDelete = resources.value[index];

    try {
      const error = await roadmapStore.removeResource(index);
      if (error) {
        alert(`Failed to delete resource: ${error}`);
      } else {
        // If the deleted resource was being edited, close the editor
        if (editingResource.value && editingResource.value._id === resourceToDelete?._id) {
          editingResource.value = null;
          editingResourceContent.value = '';
        }
      }
    } catch (err) {
      alert(`Failed to delete resource: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      deletingResourceIndex.value = null;
    }
  }
}

// Drag and drop handlers
function handleDragStart(event: DragEvent, index: number) {
  draggingIndex.value = index;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', index.toString());
  }
}

function handleDragEnd() {
  draggingIndex.value = null;
  dragOverIndex.value = null;
}

function handleDragOver(event: DragEvent, index: number) {
  if (draggingIndex.value !== null && draggingIndex.value !== index) {
    event.preventDefault();
    dragOverIndex.value = index;
  }
}

function handleDragEnter(index: number) {
  if (draggingIndex.value !== null && draggingIndex.value !== index) {
    dragOverIndex.value = index;
  }
}

function handleDragLeave() {
  // Only clear if we're not entering another item
  setTimeout(() => {
    if (dragOverIndex.value !== null) {
      dragOverIndex.value = null;
    }
  }, 50);
}

async function handleDrop(event: DragEvent, toIndex: number) {
  event.preventDefault();
  
  if (isSharedRoadmap.value) return;

  if (draggingIndex.value === null || draggingIndex.value === toIndex) {
    dragOverIndex.value = null;
    return;
  }

  const fromIndex = draggingIndex.value;
  draggingIndex.value = null;
  dragOverIndex.value = null;

  try {
    const error = await roadmapStore.reorderResource(fromIndex, toIndex);
    if (error) {
      alert(`Failed to reorder resource: ${error}`);
    }
  } catch (err) {
    alert(`Failed to reorder resource: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

// Resource check management
function isResourceChecked(resourceId: string): boolean {
  const check = resourceChecks.value.get(resourceId);
  return check?.checked || false;
}

async function loadResourceCheckIfNeeded(resourceId: string) {
  if (!resourceChecks.value.has(resourceId)) {
    await roadmapStore.loadResourceCheck(resourceId);
  }
}

async function handleToggleResource(resourceId: string) {
  // Load check if not cached
  // Note: Checks are user-specific, so each user can have their own check for the same resource
  // This works even for shared roadmaps - each user tracks their own progress
  if (!resourceChecks.value.has(resourceId)) {
    await roadmapStore.loadResourceCheck(resourceId);
  }

  // Toggle the check
  const error = await roadmapStore.toggleResourceCompletion(resourceId);
  if (error) {
    alert(`Failed to toggle resource completion: ${error}`);
  }
}

// Resource content editing
async function handleResourceClick(resource: IndexedResource) {
  editingResource.value = resource;
  editingResourceContent.value = 'Loading...';

  // Load content and check status in parallel
  const [content] = await Promise.all([
    roadmapStore.loadResourceContent(resource.resource),
    roadmapStore.loadResourceCheck(resource.resource),
  ]);

  editingResourceContent.value = content || '';
  // Check is cached in store, no need to do anything else
}

async function handleSaveResourceContent(content: string) {
  if (!editingResource.value || isSharedRoadmap.value) {
    return;
  }

  try {
    const error = await roadmapStore.updateResourceContent(editingResource.value.resource, content);
    if (error) {
      alert(`Failed to save resource content: ${error}`);
      return false; // Indicate failure
    } else {
      // Success - update cached content but keep editor open
      editingResourceContent.value = content;
      return true; // Indicate success
    }
  } catch (err) {
    alert(`Failed to save resource content: ${err instanceof Error ? err.message : 'Unknown error'}`);
    return false; // Indicate failure
  }
}

function handleCancelEditResource() {
  editingResource.value = null;
  editingResourceContent.value = '';
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.node-content-dialog {
  background-color: white;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
  background-color: #f9f9f9;
  border-radius: 8px 8px 0 0;
}

.dialog-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: #333;
  font-weight: 600;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #666;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.close-button:hover {
  background-color: #e0e0e0;
  color: #333;
}

.dialog-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.dialog-body.has-editor {
  max-height: 80vh;
}

.title-section {
  margin-bottom: 2rem;
}

.title-label {
  display: block;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
}

.title-input-wrapper {
  position: relative;
  min-height: 44px; /* Reserve space for error message to prevent layout shift */
}

.title-input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.2s;
  box-sizing: border-box;
  height: 44px; /* Fixed height to prevent layout shift */
  min-height: 44px;
  max-height: 44px;
}

.title-input:focus {
  outline: none;
  border-color: #4caf50;
}

.title-input.error {
  border-color: #f44336;
  animation: shake 0.3s;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.error-message {
  margin-top: 0.5rem;
  color: #f44336;
  font-size: 0.85rem;
  animation: fadeIn 0.3s;
  min-height: 20px; /* Reserve space to prevent layout shift */
  display: block;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.resources-section {
  margin-top: 1rem;
}

.editor-section {
  margin-top: 1.5rem;
  border-top: 2px solid #e0e0e0;
  padding-top: 1.5rem;
}

.resources-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.resources-title {
  margin: 0;
  font-size: 1.1rem;
  color: #333;
  font-weight: 600;
}

.add-resource-button {
  padding: 0.5rem 1rem;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.add-resource-button:hover {
  background-color: #45a049;
}

.loading,
.error,
.empty-state {
  padding: 2rem 1rem;
  text-align: center;
  color: #666;
}

.error {
  color: #f44336;
}

.empty-state p {
  margin: 0;
  font-size: 0.9rem;
}

.resources-list {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 0.5rem 0;
}

.resource-checkbox {
  margin-right: 0.5rem;
  cursor: pointer;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.resource-content.completed {
  opacity: 0.6;
  text-decoration: line-through;
}

.resource-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s, opacity 0.2s, transform 0.2s;
  cursor: move;
  position: relative;
}

.resource-item:last-child {
  border-bottom: none;
}

.resource-item:hover {
  background-color: #f9f9f9;
}

.resource-item:hover .delete-resource-button {
  opacity: 1;
}

.resource-item.dragging {
  opacity: 0.5;
  transform: scale(0.95);
}

.resource-item.drag-over {
  background-color: #e3f2fd;
  border-top: 2px solid #2196f3;
  transform: translateY(-2px);
}

.resource-drag-handle {
  color: #999;
  font-size: 1rem;
  cursor: grab;
  margin-right: 0.5rem;
  user-select: none;
  line-height: 1;
  padding: 0.25rem;
}

.resource-drag-handle:active {
  cursor: grabbing;
}

.resource-index {
  min-width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #e0e0e0;
  border-radius: 50%;
  font-size: 0.85rem;
  font-weight: 500;
  color: #666;
  margin-right: 0.75rem;
}

.resource-content {
  flex: 1;
  cursor: pointer;
  transition: color 0.2s;
}

.resource-content:hover {
  color: #4caf50;
}

.resource-title {
  font-size: 0.95rem;
  color: #333;
  font-weight: 500;
}

.editor-section {
  margin-top: 1.5rem;
  border-top: 1px solid #e0e0e0;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 400px;
  max-height: 600px;
}

.delete-resource-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #f44336;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
  opacity: 0;
  margin-left: 0.5rem;
}

.delete-resource-button:hover {
  background-color: #ffebee;
  color: #c62828;
}

.delete-resource-button:disabled {
  opacity: 1;
  cursor: not-allowed;
}

.dialog-overlay-small {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
}

.dialog-content-small {
  background-color: white;
  border-radius: 8px;
  width: 90%;
  max-width: 400px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
}

.dialog-content-small h3 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  color: #333;
  font-weight: 600;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-weight: 500;
  color: #333;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #4caf50;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.cancel-button,
.submit-button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.cancel-button {
  background-color: #f5f5f5;
  color: #333;
}

.cancel-button:hover {
  background-color: #e0e0e0;
}

.submit-button {
  background-color: #4caf50;
  color: white;
}

.submit-button:hover {
  background-color: #45a049;
}

.submit-button:disabled,
.cancel-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

