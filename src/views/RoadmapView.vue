<template>
  <div class="roadmap-view-container">
    <RouterLink to="/" class="back-link">← Back to My Roadmaps</RouterLink>
    <div v-if="loadingRoadmap" class="loading">Loading roadmap...</div>
    <div v-else-if="roadmapError" class="error">Error: {{ roadmapError }}</div>
    <div v-else-if="currentRoadmap" class="roadmap-info">
      <h1>Roadmap: {{ currentRoadmap.title }}</h1>
      <p v-if="currentRoadmap.description" class="description">
        {{ currentRoadmap.description }}
      </p>
      <div class="stats">
        <div class="stat-item">
          <span class="stat-label">Nodes:</span>
          <span class="stat-value">{{ nodes.length }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Connections:</span>
          <span class="stat-value">{{ edges.length }}</span>
        </div>
      </div>
      <div class="main-content">
        <div class="side-toolbar">
          <div class="toolbar-title">Actions</div>
          <button
            @click="actionMode = 'add'"
            :class="['toolbar-button', { active: actionMode === 'add' }]"
            title="Add Node"
          >
            <span class="toolbar-icon">+</span>
            <span class="toolbar-label">Add Node</span>
          </button>
          <button
            @click="actionMode = 'delete'"
            :class="['toolbar-button', { active: actionMode === 'delete' }]"
            title="Delete Node"
          >
            <span class="toolbar-icon">🗑️</span>
            <span class="toolbar-label">Delete</span>
          </button>
          <button
            @click="actionMode = 'connect'"
            :class="['toolbar-button', { active: actionMode === 'connect' }]"
            title="Connect Nodes"
          >
            <span class="toolbar-icon">🔗</span>
            <span class="toolbar-label">Connect</span>
          </button>
          <button
            @click="actionMode = 'select'"
            :class="['toolbar-button', { active: actionMode === 'select' }]"
            title="Select Mode"
          >
            <span class="toolbar-icon">👆</span>
            <span class="toolbar-label">Select</span>
          </button>
          <div v-if="actionMode === 'delete'" class="toolbar-hint">
            Click on a node or edge to delete it
          </div>
          <div v-if="actionMode === 'connect'" class="toolbar-hint">
            Click a source node, then click a target node to connect them
          </div>
          <div v-if="edgeError" class="toolbar-error">
            {{ edgeError }}
          </div>
        </div>
        <div class="graph-area">
          <div v-if="nodes.length === 0 && edges.length === 0" class="empty-message">
            <p>This roadmap is empty. Add nodes to see them visualized!</p>
          </div>
          <div v-else class="graph-container">
            <RoadmapEditor
              :nodes="nodes"
              :edges="edges"
              :delete-mode="actionMode === 'delete'"
              :connect-mode="actionMode === 'connect'"
              @node-double-click="handleNodeDoubleClick"
              @node-click="handleNodeClick"
              @edge-click="handleEdgeClick"
              @edge-created="handleEdgeCreated"
            />
          </div>
        </div>
      </div>

      <!-- Add Node Dialog -->
      <div
        v-if="showAddNodeDialog"
        class="dialog-overlay"
        @click="showAddNodeDialog = false; actionMode = 'select'"
      >
        <div class="dialog-content" @click.stop>
          <h2>Add New Node</h2>
          <form @submit.prevent="handleAddNode">
            <div class="form-group">
              <label for="node-title">Node Title *</label>
              <input
                id="node-title"
                v-model="newNodeTitle"
                type="text"
                required
                placeholder="Enter node title"
                :disabled="addingNode"
                autofocus
              />
            </div>
            <div v-if="addNodeError" class="error-message">{{ addNodeError }}</div>
            <div class="dialog-actions">
              <button
                type="button"
                @click="showAddNodeDialog = false; actionMode = 'select'"
                :disabled="addingNode"
                class="cancel-button"
              >
                Cancel
              </button>
              <button type="submit" :disabled="addingNode" class="submit-button">
                {{ addingNode ? 'Adding...' : 'Add Node' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Edit Node Dialog -->
      <div
        v-if="showEditNodeDialog"
        class="dialog-overlay"
        @click="showEditNodeDialog = false"
      >
        <div class="dialog-content" @click.stop>
          <h2>Edit Node Title</h2>
          <form @submit.prevent="handleEditNode">
            <div class="form-group">
              <label for="edit-node-title">Node Title *</label>
              <input
                id="edit-node-title"
                v-model="editingNodeTitle"
                type="text"
                required
                placeholder="Enter node title"
                :disabled="editingNode"
                autofocus
              />
            </div>
            <div v-if="editNodeError" class="error-message">{{ editNodeError }}</div>
            <div class="dialog-actions">
              <button
                type="button"
                @click="showEditNodeDialog = false"
                :disabled="editingNode"
                class="cancel-button"
              >
                Cancel
              </button>
              <button type="submit" :disabled="editingNode" class="submit-button">
                {{ editingNode ? 'Saving...' : 'Save' }}
              </button>
            </div>
          </form>
        </div>
      </div>

          <!-- Delete Node Confirmation Dialog -->
          <div
            v-if="showDeleteConfirm"
            class="dialog-overlay"
            @click="showDeleteConfirm = false"
          >
            <div class="dialog-content" @click.stop>
              <h2>Delete Node</h2>
              <p>Are you sure you want to delete the node "{{ deletingNodeTitle }}"?</p>
              <p class="warning-text">This will also remove all connections to this node.</p>
              <div class="dialog-actions">
                <button
                  type="button"
                  @click="showDeleteConfirm = false"
                  :disabled="deletingNode"
                  class="cancel-button"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  @click="handleDeleteNode"
                  :disabled="deletingNode"
                  class="delete-button"
                >
                  {{ deletingNode ? 'Deleting...' : 'Delete' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Delete Edge Confirmation Dialog -->
          <div
            v-if="showDeleteEdgeConfirm"
            class="dialog-overlay"
            @click="showDeleteEdgeConfirm = false"
          >
            <div class="dialog-content" @click.stop>
              <h2>Delete Connection</h2>
              <p>Are you sure you want to delete the connection "{{ deletingEdgeDescription }}"?</p>
              <div class="dialog-actions">
                <button
                  type="button"
                  @click="showDeleteEdgeConfirm = false"
                  :disabled="deletingEdge"
                  class="cancel-button"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  @click="handleDeleteEdge"
                  :disabled="deletingEdge"
                  class="delete-button"
                >
                  {{ deletingEdge ? 'Deleting...' : 'Delete' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import { useRoadmapStore } from '../stores/roadmap';
import { storeToRefs } from 'pinia';
import RoadmapEditor from '../components/RoadmapEditor.vue';
import type { Node, Edge } from '../services/types';

const route = useRoute();
const roadmapStore = useRoadmapStore();
const { currentRoadmap, nodes, edges, loadingRoadmap } = storeToRefs(roadmapStore);

const roadmapError = ref<string | null>(null);
const actionMode = ref<'add' | 'delete' | 'connect' | 'select'>('select');
const showAddNodeDialog = ref(false);
const newNodeTitle = ref('');
const addingNode = ref(false);
const addNodeError = ref('');

// Edit node dialog
const showEditNodeDialog = ref(false);
const editingNodeId = ref<string | null>(null);
const editingNodeTitle = ref('');
const originalNodeTitle = ref('');
const editingNode = ref(false);
const editNodeError = ref('');

// Delete confirmation
const showDeleteConfirm = ref(false);
const deletingNodeId = ref<string | null>(null);
const deletingNodeTitle = ref('');
const deletingNode = ref(false);

// Delete edge confirmation
const showDeleteEdgeConfirm = ref(false);
const deletingEdgeId = ref<string | null>(null);
const deletingEdgeDescription = ref('');
const deletingEdge = ref(false);

// Edge creation
const addingEdge = ref(false);
const edgeError = ref('');

onMounted(async () => {
  const roadmapId = route.params.id as string;
  if (roadmapId) {
    const error = await roadmapStore.loadRoadmap(roadmapId);
    if (error) {
      roadmapError.value = error;
    }
  }
});

async function handleAddNode() {
  if (!newNodeTitle.value.trim()) {
    addNodeError.value = 'Node title is required';
    return;
  }

  addingNode.value = true;
  addNodeError.value = '';

  try {
    const error = await roadmapStore.addNode(newNodeTitle.value.trim());
    if (error) {
      addNodeError.value = error;
    } else {
      // Success - close dialog and reset form
      showAddNodeDialog.value = false;
      newNodeTitle.value = '';
      actionMode.value = 'select';
    }
  } catch (err) {
    addNodeError.value = err instanceof Error ? err.message : 'Failed to add node';
  } finally {
    addingNode.value = false;
  }
}

function handleNodeDoubleClick(nodeId: string) {
  const node = nodes.value.find((n) => n._id === nodeId);
  if (node) {
    editingNodeId.value = nodeId;
    editingNodeTitle.value = node.title;
    originalNodeTitle.value = node.title;
    showEditNodeDialog.value = true;
    editNodeError.value = '';
  }
}

function handleNodeClick(nodeId: string) {
  if (actionMode.value === 'delete') {
    const node = nodes.value.find((n: Node) => n._id === nodeId);
    if (node) {
      deletingNodeId.value = nodeId;
      deletingNodeTitle.value = node.title;
      showDeleteConfirm.value = true;
    }
  }
}

function handleEdgeClick(edgeId: string) {
  if (actionMode.value === 'delete') {
    const edge = edges.value.find((e: Edge) => e._id === edgeId);
    if (edge) {
      deletingEdgeId.value = edgeId;
      const sourceNode = nodes.value.find((n: Node) => n._id === edge.source);
      const targetNode = nodes.value.find((n: Node) => n._id === edge.target);
      const sourceTitle = sourceNode?.title || 'Unknown';
      const targetTitle = targetNode?.title || 'Unknown';
      deletingEdgeDescription.value = `${sourceTitle} → ${targetTitle}`;
      showDeleteEdgeConfirm.value = true;
    }
  }
}

async function handleEditNode() {
  if (!editingNodeTitle.value.trim()) {
    editNodeError.value = 'Node title is required';
    return;
  }

  if (!editingNodeId.value) {
    return;
  }

  // Check if title changed
  if (editingNodeTitle.value.trim() === originalNodeTitle.value) {
    // No change, just close
    showEditNodeDialog.value = false;
    return;
  }

  editingNode.value = true;
  editNodeError.value = '';

  try {
    const error = await roadmapStore.updateNodeTitle(
      editingNodeId.value,
      editingNodeTitle.value.trim()
    );

    if (error) {
      // Show warning dialog for duplicate title
      if (error.includes('already exists')) {
        editNodeError.value = error;
        // Revert to original title
        editingNodeTitle.value = originalNodeTitle.value;
      } else {
        editNodeError.value = error;
      }
    } else {
      // Success - close dialog
      showEditNodeDialog.value = false;
      editingNodeId.value = null;
      editingNodeTitle.value = '';
      originalNodeTitle.value = '';
    }
  } catch (err) {
    editNodeError.value = err instanceof Error ? err.message : 'Failed to update node';
  } finally {
    editingNode.value = false;
  }
}

async function handleDeleteNode() {
  if (!deletingNodeId.value) {
    return;
  }

  deletingNode.value = true;

  try {
    const error = await roadmapStore.deleteNode(deletingNodeId.value);
    if (error) {
      alert(`Failed to delete node: ${error}`);
    } else {
      // Success - close dialog and exit delete mode
      showDeleteConfirm.value = false;
      deletingNodeId.value = null;
      deletingNodeTitle.value = '';
      actionMode.value = 'select';
    }
  } catch (err) {
    alert(`Failed to delete node: ${err instanceof Error ? err.message : 'Unknown error'}`);
  } finally {
    deletingNode.value = false;
  }
}

async function handleDeleteEdge() {
  if (!deletingEdgeId.value) {
    return;
  }

  deletingEdge.value = true;

  try {
    const error = await roadmapStore.deleteEdge(deletingEdgeId.value);
    if (error) {
      alert(`Failed to delete edge: ${error}`);
    } else {
      // Success - close dialog and exit delete mode
      showDeleteEdgeConfirm.value = false;
      deletingEdgeId.value = null;
      deletingEdgeDescription.value = '';
      actionMode.value = 'select';
    }
  } catch (err) {
    alert(`Failed to delete edge: ${err instanceof Error ? err.message : 'Unknown error'}`);
  } finally {
    deletingEdge.value = false;
  }
}

async function handleEdgeCreated(sourceNodeId: string, targetNodeId: string) {
  // Prevent creating edge from node to itself
  if (sourceNodeId === targetNodeId) {
    edgeError.value = 'Cannot connect a node to itself';
    setTimeout(() => {
      edgeError.value = '';
    }, 3000);
    return;
  }

  addingEdge.value = true;
  edgeError.value = '';

  try {
    const error = await roadmapStore.addEdge(sourceNodeId, targetNodeId);
    if (error) {
      edgeError.value = error;
      setTimeout(() => {
        edgeError.value = '';
      }, 5000);
    } else {
      // Success - edge will be added via graph reload
      actionMode.value = 'select';
    }
  } catch (err) {
    edgeError.value = err instanceof Error ? err.message : 'Failed to create connection';
    setTimeout(() => {
      edgeError.value = '';
    }, 5000);
  } finally {
    addingEdge.value = false;
  }
}

// Watch action mode to open add dialog
watch(actionMode, (newMode) => {
  if (newMode === 'add') {
    showAddNodeDialog.value = true;
  }
});
</script>

<style scoped>
.roadmap-view-container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.back-link {
  display: inline-block;
  margin-bottom: 1.5rem;
  color: #4caf50;
  text-decoration: none;
  font-weight: 500;
  font-size: 0.95rem;
}

.back-link:hover {
  text-decoration: underline;
}

.loading,
.error {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.error {
  color: #f44336;
}

.roadmap-info h1 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #333;
  font-size: 2rem;
}

.description {
  color: #666;
  margin-bottom: 1.5rem;
  font-size: 1.1rem;
}

.stats {
  display: flex;
  gap: 2rem;
  margin-bottom: 2rem;
  padding: 1rem;
  background-color: #f5f5f5;
  border-radius: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.9rem;
  color: #666;
  font-weight: 500;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
}

.empty-message {
  text-align: center;
  padding: 3rem;
  background-color: #f9f9f9;
  border-radius: 8px;
  color: #666;
}

.main-content {
  display: flex;
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.side-toolbar {
  min-width: 180px;
  background-color: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  height: fit-content;
}

.toolbar-title {
  font-weight: 600;
  color: #333;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.toolbar-button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background-color: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.toolbar-button:hover {
  background-color: #f5f5f5;
  border-color: #4caf50;
}

.toolbar-button.active {
  background-color: #4caf50;
  color: white;
  border-color: #4caf50;
}

.toolbar-button.active:hover {
  background-color: #45a049;
}

.toolbar-icon {
  font-size: 1.2rem;
  width: 24px;
  text-align: center;
}

.toolbar-label {
  flex: 1;
  text-align: left;
}

.toolbar-hint {
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  font-size: 0.85rem;
  color: #856404;
}

.toolbar-error {
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  font-size: 0.85rem;
  color: #721c24;
}

.graph-area {
  flex: 1;
}

.graph-container {
  margin-top: 0;
}

/* Dialog Styles */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.dialog-content {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.dialog-content h2 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: #333;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #555;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #4caf50;
}

.form-group input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.error-message {
  color: #f44336;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}

.cancel-button,
.submit-button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  font-weight: 500;
}

.cancel-button {
  background-color: #f5f5f5;
  color: #333;
}

.cancel-button:hover:not(:disabled) {
  background-color: #e0e0e0;
}

.submit-button {
  background-color: #4caf50;
  color: white;
}

.submit-button:hover:not(:disabled) {
  background-color: #45a049;
}

.cancel-button:disabled,
.submit-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
  color: #666;
}

.delete-button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  font-weight: 500;
  background-color: #f44336;
  color: white;
}

.delete-button:hover:not(:disabled) {
  background-color: #d32f2f;
}

.delete-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
  color: #666;
}

.warning-text {
  color: #f44336;
  font-size: 0.9rem;
  margin: 0.5rem 0;
}
</style>

