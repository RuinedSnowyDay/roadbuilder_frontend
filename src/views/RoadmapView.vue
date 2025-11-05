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
          <div class="main-content">
            <!-- Read-only banner for shared roadmaps -->
            <div v-if="isSharedRoadmap" class="read-only-banner">
              <p>This roadmap is shared with you. You can view it but cannot make changes.</p>
            </div>
            <!-- Toolbar (only shown for non-shared roadmaps) -->
            <div v-if="!isSharedRoadmap" class="side-toolbar">
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
              <div v-if="actionMode === 'add'" class="toolbar-hint">
                Click on the graph to add a new node at that position
              </div>
              <div v-if="actionMode === 'delete'" class="toolbar-hint">
                Click on a node or edge to delete it
              </div>
              <div v-if="actionMode === 'connect'" class="toolbar-hint">
                Click a source node, then click a target node to connect them
              </div>
              <div v-if="actionMode === 'select'" class="toolbar-hint">
                Double-click on a node to view and edit its content
              </div>
              <div v-if="edgeError" class="toolbar-error">
                {{ edgeError }}
              </div>
              <!-- Roadmap Statistics -->
              <div class="roadmap-stats">
                <div class="stats-title">Roadmap Info</div>
                <div class="stat-item">
                  <span class="stat-label">Nodes:</span>
                  <span class="stat-value">{{ nodes.length }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Connections:</span>
                  <span class="stat-value">{{ edges.length }}</span>
                </div>
                <div v-if="!isSharedRoadmap" class="stat-item">
                  <button @click="showShareDialog = true" class="share-button" title="Share this roadmap">
                    Share Roadmap
                  </button>
                </div>
              </div>
            </div>
            <div class="graph-area">
              <div v-if="nodes.length === 0 && edges.length === 0 && actionMode !== 'add'" class="empty-message">
                <p>This roadmap is empty. Click "Add Node" and then click on the graph to add nodes!</p>
              </div>
              <div class="graph-container">
                <RoadmapEditor
                  :nodes="nodes"
                  :edges="edges"
                  :delete-mode="!isSharedRoadmap && actionMode === 'delete'"
                  :connect-mode="!isSharedRoadmap && actionMode === 'connect'"
                  :add-node-mode="!isSharedRoadmap && actionMode === 'add'"
                  @node-double-click="handleNodeDoubleClick"
                  @node-click="handleNodeClick"
                  @edge-click="handleEdgeClick"
                  @edge-created="handleEdgeCreated"
                  @canvas-click="handleCanvasClick"
                />
              </div>
            </div>
            <NodeContentPanel />
          </div>

      <!-- Share Roadmap Dialog -->
      <div
        v-if="showShareDialog"
        class="dialog-overlay"
        @click="handleCancelShare"
      >
        <div class="dialog-content" @click.stop>
          <h2>Share Roadmap</h2>
          <form @submit.prevent="handleShareRoadmap">
            <div class="form-group">
              <label for="share-username">Username *</label>
              <input
                id="share-username"
                v-model="shareUsername"
                type="text"
                required
                placeholder="Enter username to share with"
                :disabled="sharing"
                autofocus
              />
              <p class="form-hint">Enter the username of the user you want to share this roadmap with.</p>
            </div>
            <div v-if="shareError" class="error-message">{{ shareError }}</div>
            <div v-if="shareSuccess" class="success-message">
              Roadmap shared successfully!
            </div>
            <div class="dialog-actions">
              <button
                type="button"
                @click="handleCancelShare"
                :disabled="sharing"
                class="cancel-button"
              >
                Close
              </button>
              <button type="submit" :disabled="sharing" class="submit-button">
                {{ sharing ? 'Sharing...' : 'Share' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Add Node Dialog -->
      <div
        v-if="showAddNodeDialog"
        class="dialog-overlay"
        @click="handleCancelAddNode"
      >
        <div class="dialog-content" @click.stop>
          <h2>Add New Node</h2>
          <form @submit.prevent="handleAddNode">
            <div class="form-group">
              <label for="add-node-title">Node Title *</label>
              <input
                id="add-node-title"
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
                @click="handleCancelAddNode"
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
import { ref, onMounted } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import { useRoadmapStore } from '../stores/roadmap';
import { storeToRefs } from 'pinia';
import RoadmapEditor from '../components/RoadmapEditor.vue';
import NodeContentPanel from '../components/NodeContentPanel.vue';
import type { Node, Edge } from '../services/types';

const route = useRoute();
const roadmapStore = useRoadmapStore();
const { currentRoadmap, nodes, edges, loadingRoadmap, isSharedRoadmap } = storeToRefs(roadmapStore);

const roadmapError = ref<string | null>(null);
const actionMode = ref<'add' | 'delete' | 'connect' | 'select'>('select');
const newNodeTitle = ref('');
const addingNode = ref(false);
const addNodeError = ref('');
const showAddNodeDialog = ref(false);
const pendingNodePosition = ref<{ x: number; y: number } | null>(null);

// Share dialog state
const showShareDialog = ref(false);
const shareUsername = ref('');
const sharing = ref(false);
const shareError = ref('');
const shareSuccess = ref(false);

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

  if (!pendingNodePosition.value) {
    addNodeError.value = 'No position provided';
    return;
  }

  addingNode.value = true;
  addNodeError.value = '';

  try {
    const error = await roadmapStore.addNode(
      newNodeTitle.value.trim(),
      pendingNodePosition.value.x,
      pendingNodePosition.value.y
    );
    if (error) {
      addNodeError.value = error;
    } else {
      // Success - reset form but stay in add mode
      newNodeTitle.value = '';
      showAddNodeDialog.value = false;
      pendingNodePosition.value = null;
    }
  } catch (err) {
    addNodeError.value = err instanceof Error ? err.message : 'Failed to add node';
  } finally {
    addingNode.value = false;
  }
}

function handleCancelAddNode() {
  showAddNodeDialog.value = false;
  pendingNodePosition.value = null;
  newNodeTitle.value = '';
  addNodeError.value = '';
  actionMode.value = 'select';
}

function handleCanvasClick(position: { x: number; y: number }) {
  if (actionMode.value !== 'add') {
    return;
  }

  // Store position and show dialog
  pendingNodePosition.value = position;
  newNodeTitle.value = '';
  addNodeError.value = '';
  showAddNodeDialog.value = true;
}

function handleNodeDoubleClick(nodeId: string) {
  // Load resources and open the node content modal
  // For shared roadmaps, this is read-only (NodeContentPanel will handle that)
  roadmapStore.loadNodeResources(nodeId);
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
      // Success - close dialog but stay in delete mode
      showDeleteConfirm.value = false;
      deletingNodeId.value = null;
      deletingNodeTitle.value = '';
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
      // Success - close dialog but stay in delete mode
      showDeleteEdgeConfirm.value = false;
      deletingEdgeId.value = null;
      deletingEdgeDescription.value = '';
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
      // Stay in connect mode to allow creating more edges
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

async function handleShareRoadmap() {
  if (!shareUsername.value.trim()) {
    shareError.value = 'Username is required';
    return;
  }

  sharing.value = true;
  shareError.value = '';
  shareSuccess.value = false;

  try {
    const error = await roadmapStore.shareRoadmap(shareUsername.value.trim());
    if (error) {
      shareError.value = error;
      shareSuccess.value = false;
    } else {
      // Success
      shareSuccess.value = true;
      shareError.value = '';
      // Clear the form after a short delay
      setTimeout(() => {
        shareUsername.value = '';
        shareSuccess.value = false;
      }, 2000);
    }
  } catch (err) {
    shareError.value = err instanceof Error ? err.message : 'Failed to share roadmap';
    shareSuccess.value = false;
  } finally {
    sharing.value = false;
  }
}

function handleCancelShare() {
  showShareDialog.value = false;
  shareUsername.value = '';
  shareError.value = '';
  shareSuccess.value = false;
}

</script>

<style scoped>
.roadmap-view-container {
  padding: 1rem;
  max-width: 100%;
  margin: 0;
  width: 100%;
  height: calc(100vh - 70px); /* Full viewport height minus header */
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.back-link {
  display: inline-block;
  margin-bottom: 0.75rem;
  color: var(--color-accent);
  text-decoration: none;
  font-weight: 500;
  font-size: 0.9rem;
  flex: 0 0 auto;
  transition: color 0.2s;
}

.back-link:hover {
  text-decoration: underline;
  color: var(--color-accent-hover);
}

.loading,
.error {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-secondary);
}

.error {
  color: #ff6b6b;
}

.roadmap-info {
  width: 100%;
  box-sizing: border-box;
  flex: 0 0 auto;
  margin-bottom: 1rem;
}

.roadmap-info h1 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  color: var(--color-heading);
  font-size: 1.5rem;
}

.description {
  color: var(--color-text-secondary);
  margin-bottom: 0.5rem;
  font-size: 1rem;
}

.roadmap-stats {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--color-border);
}

.stats-title {
  font-weight: 600;
  color: var(--color-heading);
  margin-bottom: 1rem;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.stat-item:last-child {
  margin-bottom: 0;
}

.stat-label {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-heading);
}

.share-button {
  width: 100%;
  padding: 0.75rem;
  background-color: var(--color-accent);
  color: var(--gunmetal-bg-dark);
  border: none;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  font-weight: 600;
  transition: background-color 0.2s;
  margin-top: 0.5rem;
}

.share-button:hover {
  background-color: var(--color-accent-hover);
}

.empty-message {
  text-align: center;
  padding: 3rem;
  background-color: var(--gunmetal-bg);
  border-radius: 8px;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

.main-content {
  display: flex;
  gap: 1rem;
  flex: 1 1 auto;
  min-height: 0;
  align-items: stretch;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.side-toolbar {
  width: 220px;
  flex-shrink: 0;
  background-color: var(--gunmetal-bg);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
  overflow-y: auto;
  max-height: 100%;
}

.toolbar-title {
  font-weight: 600;
  color: var(--color-heading);
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
  background-color: var(--gunmetal-bg-dark);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
  color: var(--color-text);
}

.toolbar-button:hover {
  background-color: rgba(233, 169, 108, 0.1);
  border-color: var(--color-accent);
}

.toolbar-button.active {
  background-color: var(--color-accent);
  color: var(--gunmetal-bg-dark);
  border-color: var(--color-accent);
}

.toolbar-button.active:hover {
  background-color: var(--color-accent-hover);
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
  background-color: rgba(233, 169, 108, 0.15);
  border: 1px solid var(--color-accent);
  border-radius: 4px;
  font-size: 0.85rem;
  color: var(--color-accent);
}

.toolbar-error {
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: rgba(255, 107, 107, 0.15);
  border: 1px solid #ff6b6b;
  border-radius: 4px;
  font-size: 0.85rem;
  color: #ff6b6b;
}

.graph-area {
  flex: 1 1 auto;
  min-width: 400px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
  min-height: 0;
}

.graph-container {
  flex: 1 1 auto;
  width: 100%;
  min-height: 0;
  position: relative;
  display: flex;
  box-sizing: border-box;
}

.read-only-banner {
  background-color: rgba(233, 169, 108, 0.15);
  border: 1px solid var(--color-accent);
  border-radius: 4px;
  padding: 0.75rem;
  margin-bottom: 1rem;
  color: var(--color-accent);
  font-size: 0.9rem;
  text-align: center;
}

/* Dialog Styles */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.dialog-content {
  background: var(--gunmetal-bg);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 2rem;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.dialog-content h2 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: var(--color-heading);
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--color-text);
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;
  background-color: var(--gunmetal-bg-dark);
  color: var(--color-text);
}

.form-group input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.form-group input::placeholder {
  color: var(--color-text-muted);
}

.form-group input:disabled {
  background-color: var(--gunmetal-bg);
  cursor: not-allowed;
  opacity: 0.5;
}

.form-hint {
  margin-top: 0.25rem;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  font-style: italic;
}

.success-message {
  color: var(--color-accent);
  margin-bottom: 1rem;
  font-size: 0.9rem;
  font-weight: 500;
}

.error-message {
  color: #ff6b6b;
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
  transition: all 0.2s;
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

.submit-button {
  background-color: var(--color-accent);
  color: var(--gunmetal-bg-dark);
  font-weight: 600;
}

.submit-button:hover:not(:disabled) {
  background-color: var(--color-accent-hover);
}

.cancel-button:disabled,
.submit-button:disabled {
  background-color: var(--gunmetal-secondary);
  cursor: not-allowed;
  opacity: 0.5;
}

.delete-button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  font-weight: 500;
  background-color: #ff6b6b;
  color: white;
  transition: background-color 0.2s;
}

.delete-button:hover:not(:disabled) {
  background-color: #ff5252;
}

.delete-button:disabled {
  background-color: var(--gunmetal-secondary);
  cursor: not-allowed;
  opacity: 0.5;
}

.warning-text {
  color: #ff6b6b;
  font-size: 0.9rem;
  margin: 0.5rem 0;
}
</style>

