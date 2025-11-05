<template>
  <div class="welcome-container">
    <div class="header">
      <h1>My Roadmaps</h1>
      <button @click="showCreateDialog = true" class="create-button">
        + Create New Roadmap
      </button>
    </div>

    <div v-if="loading" class="loading">Loading roadmaps...</div>
    <div v-else-if="error" class="error">Error: {{ error }}</div>
    <div v-else-if="roadmaps.length === 0 && sharedRoadmaps.length === 0" class="empty-state">
      <p>You don't have any roadmaps yet.</p>
      <p>Click "Create New Roadmap" to get started!</p>
    </div>
    <div v-else>
      <!-- My Roadmaps Section -->
      <div v-if="roadmaps.length > 0">
        <h2 class="section-title">My Roadmaps</h2>
        <div class="roadmaps-grid">
          <div
            v-for="roadmap in roadmaps"
            :key="roadmap._id"
            class="roadmap-card"
            @click="navigateToRoadmap(roadmap._id)"
          >
            <h3 class="roadmap-title">{{ roadmap.title }}</h3>
            <p class="roadmap-description">{{ roadmap.description || 'No description' }}</p>
          </div>
        </div>
      </div>

      <!-- Shared Roadmaps Section -->
      <div v-if="loadingShared" class="loading">Loading shared roadmaps...</div>
      <div v-else-if="sharedRoadmaps.length > 0">
        <h2 class="section-title">Shared with Me</h2>
        <div class="roadmaps-grid">
          <div
            v-for="roadmap in sharedRoadmaps"
            :key="roadmap._id"
            class="roadmap-card shared-roadmap"
            @click="navigateToRoadmap(roadmap._id)"
          >
            <h3 class="roadmap-title">{{ roadmap.title }}</h3>
            <p class="roadmap-description">{{ roadmap.description || 'No description' }}</p>
            <span class="shared-badge">Shared</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Roadmap Dialog -->
    <div v-if="showCreateDialog" class="dialog-overlay" @click="showCreateDialog = false">
      <div class="dialog-content" @click.stop>
        <h2>Create New Roadmap</h2>
        <form @submit.prevent="handleCreateRoadmap">
          <div class="form-group">
            <label for="roadmap-title">Title *</label>
            <input
              id="roadmap-title"
              v-model="newRoadmapTitle"
              type="text"
              required
              placeholder="Enter roadmap title"
              :disabled="creating"
            />
          </div>
          <div class="form-group">
            <label for="roadmap-description">Description</label>
            <textarea
              id="roadmap-description"
              v-model="newRoadmapDescription"
              placeholder="Enter roadmap description (optional)"
              rows="3"
              :disabled="creating"
            ></textarea>
          </div>
          <div v-if="createError" class="error-message">{{ createError }}</div>
          <div class="dialog-actions">
            <button
              type="button"
              @click="showCreateDialog = false"
              :disabled="creating"
              class="cancel-button"
            >
              Cancel
            </button>
            <button type="submit" :disabled="creating" class="submit-button">
              {{ creating ? 'Creating...' : 'Create' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useRoadmapStore } from '../stores/roadmap';
import { storeToRefs } from 'pinia';

const router = useRouter();
const roadmapStore = useRoadmapStore();
const { roadmaps, sharedRoadmaps, loading, loadingShared, error } = storeToRefs(roadmapStore);

const showCreateDialog = ref(false);
const newRoadmapTitle = ref('');
const newRoadmapDescription = ref('');
const creating = ref(false);
const createError = ref('');

onMounted(() => {
  roadmapStore.loadRoadmaps();
  roadmapStore.loadSharedRoadmaps();
});

async function handleCreateRoadmap() {
  if (!newRoadmapTitle.value.trim()) {
    createError.value = 'Title is required';
    return;
  }

  creating.value = true;
  createError.value = '';

  try {
    const error = await roadmapStore.createRoadmap(
      newRoadmapTitle.value.trim(),
      newRoadmapDescription.value.trim()
    );

    if (error) {
      createError.value = error;
    } else {
      // Success - close dialog and navigate to the new roadmap
      showCreateDialog.value = false;
      const newRoadmap = roadmapStore.roadmaps[roadmapStore.roadmaps.length - 1];
      if (newRoadmap) {
        navigateToRoadmap(newRoadmap._id);
      }
      // Reset form
      newRoadmapTitle.value = '';
      newRoadmapDescription.value = '';
    }
  } catch (err) {
    createError.value = err instanceof Error ? err.message : 'Failed to create roadmap';
  } finally {
    creating.value = false;
  }
}

function navigateToRoadmap(roadmapId: string) {
  router.push(`/roadmap/${roadmapId}`);
}
</script>

<style scoped>
.welcome-container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

h1 {
  margin: 0;
  color: #333;
  font-size: 2rem;
}

.section-title {
  margin: 2rem 0 1rem 0;
  color: #333;
  font-size: 1.5rem;
  font-weight: 600;
}

.create-button {
  padding: 0.75rem 1.5rem;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  font-weight: 500;
}

.create-button:hover {
  background-color: #45a049;
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

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.empty-state p {
  margin: 0.5rem 0;
}

.roadmaps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.roadmap-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.2s;
}

.roadmap-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.roadmap-title {
  margin: 0 0 0.5rem 0;
  color: #333;
  font-size: 1.25rem;
  font-weight: 600;
}

.shared-roadmap {
  position: relative;
}

.shared-badge {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background-color: #2196f3;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.roadmap-description {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
  line-height: 1.5;
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

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;
  font-family: inherit;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #4caf50;
}

.form-group textarea {
  resize: vertical;
}

.form-group input:disabled,
.form-group textarea:disabled {
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

