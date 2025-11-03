import { defineStore } from 'pinia';
import { ref } from 'vue';
import { callConceptQuery } from '../services/api';
import type { AssignedObject } from '../services/types';
import { useAuthStore } from './auth';

export const useRoadmapStore = defineStore('roadmap', () => {
  const roadmaps = ref<AssignedObject[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  /**
   * Loads all roadmaps for the current user
   */
  async function loadRoadmaps(): Promise<void> {
    const authStore = useAuthStore();

    if (!authStore.currentUser) {
      error.value = 'User not authenticated';
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await callConceptQuery<AssignedObject>(
        'ObjectManager',
        '_getUserAssignedObjects',
        { owner: authStore.currentUser }
      );

      if (response.error) {
        error.value = response.error;
        roadmaps.value = [];
      } else {
        roadmaps.value = response.data || [];
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load roadmaps';
      roadmaps.value = [];
    } finally {
      loading.value = false;
    }
  }

  return {
    roadmaps,
    loading,
    error,
    loadRoadmaps,
  };
});

