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
      <div v-if="nodes.length === 0 && edges.length === 0" class="empty-message">
        <p>This roadmap is empty. Add nodes to see them visualized!</p>
      </div>
      <div v-else class="graph-container">
        <RoadmapEditor :nodes="nodes" :edges="edges" />
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

onMounted(async () => {
  const roadmapId = route.params.id as string;
  if (roadmapId) {
    const error = await roadmapStore.loadRoadmap(roadmapId);
    if (error) {
      roadmapError.value = error;
    }
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

.graph-container {
  margin-top: 2rem;
}
</style>

