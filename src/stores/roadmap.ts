import { defineStore } from 'pinia';
import { ref } from 'vue';
import { callConceptAction, callConceptQuery } from '../services/api';
import type {
  AssignedObject,
  Node,
  Edge,
  GraphResponse,
  CreateAssignedObjectResponse,
} from '../services/types';
import { useAuthStore } from './auth';

export const useRoadmapStore = defineStore('roadmap', () => {
  const roadmaps = ref<AssignedObject[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Current roadmap being viewed
  const currentRoadmap = ref<AssignedObject | null>(null);
  const currentGraphId = ref<string | null>(null);
  const nodes = ref<Node[]>([]);
  const edges = ref<Edge[]>([]);
  const loadingRoadmap = ref(false);

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

  /**
   * Creates a new roadmap
   * @param title - Title of the roadmap
   * @param description - Description of the roadmap
   * @returns The created AssignedObject ID, or null on error
   */
  async function createRoadmap(
    title: string,
    description: string = ''
  ): Promise<string | null> {
    const authStore = useAuthStore();

    if (!authStore.currentUser) {
      return 'User not authenticated';
    }

    try {
      // Step 1: Create empty graph via EnrichedDAG
      const graphResponse = await callConceptAction<GraphResponse>(
        'EnrichedDAG',
        'createEmptyGraph',
        {
          owner: authStore.currentUser,
          graphTitle: title,
        }
      );

      if (graphResponse.error) {
        return graphResponse.error;
      }

      if (!graphResponse.data?.newGraph) {
        return 'Failed to create graph';
      }

      const graphId = graphResponse.data.newGraph;

      // Step 2: Create AssignedObject linking user to the graph
      const assignedObjectResponse =
        await callConceptAction<CreateAssignedObjectResponse>(
          'ObjectManager',
          'createAssignedObject',
          {
            owner: authStore.currentUser,
            object: graphId,
            title: title,
            description: description,
          }
        );

      if (assignedObjectResponse.error) {
        return assignedObjectResponse.error;
      }

      if (!assignedObjectResponse.data?.assignedObject) {
        return 'Failed to create assigned object';
      }

      // Reload roadmaps list
      await loadRoadmaps();

      return null; // Success
    } catch (err) {
      return err instanceof Error ? err.message : 'Failed to create roadmap';
    }
  }

  /**
   * Loads a roadmap by its AssignedObject ID
   * @param assignedObjectId - The ID of the AssignedObject
   */
  async function loadRoadmap(assignedObjectId: string): Promise<string | null> {
    loadingRoadmap.value = true;
    error.value = null;

    try {
      // Find the AssignedObject in the list
      const assignedObject = roadmaps.value.find((r) => r._id === assignedObjectId);

      if (!assignedObject) {
        // If not in list, we might need to fetch it
        // For now, return error
        return 'Roadmap not found';
      }

      currentRoadmap.value = assignedObject;
      currentGraphId.value = assignedObject.object; // The graph ID

      // Load nodes
      const nodesResponse = await callConceptQuery<Node>('EnrichedDAG', '_getGraphNodes', {
        graph: assignedObject.object,
      });

      if (nodesResponse.error) {
        return nodesResponse.error;
      }

      nodes.value = nodesResponse.data || [];

      // Load edges
      const edgesResponse = await callConceptQuery<Edge>('EnrichedDAG', '_getGraphEdges', {
        graph: assignedObject.object,
      });

      if (edgesResponse.error) {
        return edgesResponse.error;
      }

      edges.value = edgesResponse.data || [];

      return null; // Success
    } catch (err) {
      return err instanceof Error ? err.message : 'Failed to load roadmap';
    } finally {
      loadingRoadmap.value = false;
    }
  }

  return {
    roadmaps,
    loading,
    error,
    currentRoadmap,
    currentGraphId,
    nodes,
    edges,
    loadingRoadmap,
    loadRoadmaps,
    createRoadmap,
    loadRoadmap,
  };
});

