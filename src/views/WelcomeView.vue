<template>
  <div class="welcome-container">
    <div class="header">
      <h1>My Roadmaps</h1>
      <button @click="handleCreateRoadmap" class="create-button">
        + Create New Roadmap
      </button>
    </div>

    <div v-if="loading" class="loading">Loading roadmaps...</div>
    <div v-else-if="error" class="error">Error: {{ error }}</div>
    <div v-else-if="roadmaps.length === 0" class="empty-state">
      <p>You don't have any roadmaps yet.</p>
      <p>Click "Create New Roadmap" to get started!</p>
    </div>
    <div v-else class="roadmaps-grid">
      <div
        v-for="roadmap in roadmaps"
        :key="roadmap._id"
        class="roadmap-card"
      >
        <h2 class="roadmap-title">{{ roadmap.title }}</h2>
        <p class="roadmap-description">{{ roadmap.description || 'No description' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoadmapStore } from '../stores/roadmap';
import { storeToRefs } from 'pinia';

const roadmapStore = useRoadmapStore();
const { roadmaps, loading, error } = storeToRefs(roadmapStore);

onMounted(() => {
  roadmapStore.loadRoadmaps();
});

function handleCreateRoadmap() {
  alert('Create roadmap functionality will be added in Phase 3!');
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

.roadmap-description {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
  line-height: 1.5;
}
</style>

