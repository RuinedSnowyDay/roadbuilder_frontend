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
      <div class="toolbar">
        <button @click="showAddNodeDialog = true" class="add-node-button">
          + Add Node
        </button>
      </div>
      <div v-if="nodes.length === 0 && edges.length === 0" class="empty-message">
        <p>This roadmap is empty. Add nodes to see them visualized!</p>
      </div>
      <div v-else class="graph-container">
        <RoadmapEditor :nodes="nodes" :edges="edges" />
      </div>

      <!-- Add Node Dialog -->
      <div v-if="showAddNodeDialog" class="dialog-overlay" @click="showAddNodeDialog = false">
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
                @click="showAddNodeDialog = false"
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import { useRoadmapStore } from '../stores/roadmap';
import { storeToRefs } from 'pinia';
import RoadmapEditor from '../components/RoadmapEditor.vue';

const route = useRoute();
const roadmapStore = useRoadmapStore();
const { currentRoadmap, nodes, edges, loadingRoadmap } = storeToRefs(roadmapStore);

const roadmapError = ref<string | null>(null);
const showAddNodeDialog = ref(false);
const newNodeTitle = ref('');
const addingNode = ref(false);
const addNodeError = ref('');

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
    }
  } catch (err) {
    addNodeError.value = err instanceof Error ? err.message : 'Failed to add node';
  } finally {
    addingNode.value = false;
  }
}
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

.toolbar {
  margin-bottom: 1.5rem;
}

.add-node-button {
  padding: 0.75rem 1.5rem;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  font-weight: 500;
}

.add-node-button:hover {
  background-color: #45a049;
}

.graph-container {
  margin-top: 2rem;
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
</style>

