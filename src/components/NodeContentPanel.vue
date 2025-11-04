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
      <div class="dialog-body">
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
          <h3 class="resources-title">Resources</h3>
          <div v-if="loadingResources" class="loading">Loading resources...</div>
          <div v-else-if="resourcesError" class="error">{{ resourcesError }}</div>
          <div v-else-if="resources.length === 0" class="empty-state">
            <p>No resources yet. Resources will appear here when added.</p>
          </div>
          <div v-else class="resources-list">
            <div
              v-for="(resource, index) in resources"
              :key="resource._id"
              class="resource-item"
            >
              <div class="resource-index">{{ index + 1 }}</div>
              <div class="resource-content">
                <div class="resource-title">{{ resource.title }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoadmapStore } from '../stores/roadmap';
import { storeToRefs } from 'pinia';

const roadmapStore = useRoadmapStore();
const { selectedNode, nodeResources, loadingResources, error, nodes } = storeToRefs(roadmapStore);

const resources = computed(() => nodeResources.value);
const resourcesError = computed(() => error.value);

const editingTitle = ref('');
const originalTitle = ref('');
const hasDuplicateError = ref(false);

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
  if (!selectedNode.value) return;

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

.resources-title {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  color: #333;
  font-weight: 600;
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

.resource-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s;
}

.resource-item:last-child {
  border-bottom: none;
}

.resource-item:hover {
  background-color: #f9f9f9;
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
}

.resource-title {
  font-size: 0.95rem;
  color: #333;
  font-weight: 500;
}
</style>

