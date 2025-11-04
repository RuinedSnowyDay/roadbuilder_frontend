import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';
import { callConceptAction, callConceptQuery } from '../services/api';
import type {
  AssignedObject,
  Node,
  Edge,
  GraphResponse,
  CreateAssignedObjectResponse,
  CreateResourceListResponse,
  AddNodeResponse,
  AddEdgeResponse,
  IndexedResource,
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

  // Selected node and its resources
  const selectedNode = ref<Node | null>(null);
  const nodeResources = ref<IndexedResource[]>([]);
  const loadingResources = ref(false);

  // Resource content cache (resourceId -> content)
  const resourceContentCache = ref<Map<string, string>>(new Map());

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

  /**
   * Adds a new node to the current roadmap
   * @param nodeTitle - Title of the node
   * @returns Error message or null on success
   */
  async function addNode(nodeTitle: string): Promise<string | null> {
    if (!currentGraphId.value) {
      return 'No roadmap loaded';
    }

    const authStore = useAuthStore();
    if (!authStore.currentUser) {
      return 'User not authenticated';
    }

    try {
      // Step 1: Create a ResourceList for the node's enrichment
      // This will be used later to store resources for the node
      const resourceListTitle = `Resources for ${nodeTitle}`;
      const resourceListResponse = await callConceptAction<CreateResourceListResponse>(
        'ResourceList',
        'createResourceList',
        {
          owner: authStore.currentUser,
          listTitle: resourceListTitle,
        }
      );

      if (resourceListResponse.error) {
        return resourceListResponse.error;
      }

      if (!resourceListResponse.data?.newResourceList) {
        return 'Failed to create resource list';
      }

      const enrichmentId = resourceListResponse.data.newResourceList;

      // Step 2: Add the node to the graph
      const addNodeResponse = await callConceptAction<AddNodeResponse>(
        'EnrichedDAG',
        'addNode',
        {
          graph: currentGraphId.value,
          nodeTitle: nodeTitle,
          enrichment: enrichmentId,
        }
      );

      if (addNodeResponse.error) {
        return addNodeResponse.error;
      }

      if (!addNodeResponse.data?.newNode) {
        return 'Failed to create node';
      }

      // Optimistically update the graph - add the new node to local state
      if (currentGraphId.value) {
        const newNode: Node = {
          _id: addNodeResponse.data.newNode,
          parent: currentGraphId.value,
          title: nodeTitle.trim(),
          enrichment: enrichmentId,
        };
        nodes.value.push(newNode);
      }

      return null; // Success
    } catch (err) {
      return err instanceof Error ? err.message : 'Failed to add node';
    }
  }

  /**
   * Updates the title of a node
   * @param nodeId - ID of the node to update
   * @param newTitle - New title for the node
   * @returns Error message or null on success
   */
  async function updateNodeTitle(nodeId: string, newTitle: string): Promise<string | null> {
    if (!currentGraphId.value) {
      return 'No roadmap loaded';
    }

    const node = nodes.value.find((n) => n._id === nodeId);
    if (!node) {
      return 'Node not found';
    }

    // Check for duplicate titles
    const duplicate = nodes.value.find(
      (n) => n._id !== nodeId && n.title === newTitle.trim()
    );
    if (duplicate) {
      return 'A node with this title already exists';
    }

    try {
      const response = await callConceptAction('EnrichedDAG', 'changeNodeTitle', {
        graph: currentGraphId.value,
        node: nodeId,
        newNodeTitle: newTitle.trim(),
      });

      if (response.error) {
        return response.error;
      }

      // Optimistically update the graph - update node title in local state
      const node = nodes.value.find((n) => n._id === nodeId);
      if (node) {
        node.title = newTitle.trim();
      }

      return null; // Success
    } catch (err) {
      return err instanceof Error ? err.message : 'Failed to update node title';
    }
  }

  /**
   * Deletes a node from the roadmap
   * @param nodeId - ID of the node to delete
   * @returns Error message or null on success
   */
  async function deleteNode(nodeId: string): Promise<string | null> {
    try {
      const response = await callConceptAction('EnrichedDAG', 'removeNode', {
        node: nodeId,
      });

      if (response.error) {
        return response.error;
      }

      // Optimistically update the graph - remove node and connected edges from local state
      nodes.value = nodes.value.filter((n) => n._id !== nodeId);
      edges.value = edges.value.filter(
        (e) => e.source !== nodeId && e.target !== nodeId
      );

      return null; // Success
    } catch (err) {
      return err instanceof Error ? err.message : 'Failed to delete node';
    }
  }

  /**
   * Adds a new edge between two nodes
   * @param sourceNodeId - ID of the source node
   * @param targetNodeId - ID of the target node
   * @returns Error message or null on success
   */
  async function addEdge(sourceNodeId: string, targetNodeId: string): Promise<string | null> {
    if (!currentGraphId.value) {
      return 'No roadmap loaded';
    }

    const authStore = useAuthStore();
    if (!authStore.currentUser) {
      return 'User not authenticated';
    }

    // Check if edge already exists
    const existingEdge = edges.value.find(
      (e) => e.source === sourceNodeId && e.target === targetNodeId
    );
    if (existingEdge) {
      return 'Edge already exists between these nodes';
    }

    try {
      // Find the source node to get its enrichment ID
      const sourceNode = nodes.value.find((n) => n._id === sourceNodeId);
      if (!sourceNode) {
        return 'Source node not found';
      }

      // Use the source node's enrichment ID for the edge
      const enrichmentId = sourceNode.enrichment;

      // Add the edge to the graph
      const addEdgeResponse = await callConceptAction<AddEdgeResponse>(
        'EnrichedDAG',
        'addEdge',
        {
          graph: currentGraphId.value,
          sourceNode: sourceNodeId,
          targetNode: targetNodeId,
          enrichment: enrichmentId,
        }
      );

      if (addEdgeResponse.error) {
        return addEdgeResponse.error;
      }

      if (!addEdgeResponse.data?.newEdge) {
        return 'Failed to create edge';
      }

      // Optimistically update the graph - add the new edge to local state
      const newEdge: Edge = {
        _id: addEdgeResponse.data.newEdge,
        source: sourceNodeId,
        target: targetNodeId,
        enrichment: enrichmentId,
      };
      edges.value.push(newEdge);

      return null; // Success
    } catch (err) {
      return err instanceof Error ? err.message : 'Failed to add edge';
    }
  }

  /**
   * Deletes an edge from the roadmap
   * @param edgeId - ID of the edge to delete
   * @returns Error message or null on success
   */
  async function deleteEdge(edgeId: string): Promise<string | null> {
    try {
      const response = await callConceptAction('EnrichedDAG', 'removeEdge', {
        edge: edgeId,
      });

      if (response.error) {
        return response.error;
      }

      // Optimistically update the graph - remove edge from local state
      edges.value = edges.value.filter((e) => e._id !== edgeId);

      return null; // Success
    } catch (err) {
      return err instanceof Error ? err.message : 'Failed to delete edge';
    }
  }

  /**
   * Loads resources for a selected node
   * @param nodeId - ID of the node to load resources for
   * @returns Error message or null on success
   */
  async function loadNodeResources(nodeId: string): Promise<string | null> {
    const node = nodes.value.find((n) => n._id === nodeId);
    if (!node) {
      return 'Node not found';
    }

    selectedNode.value = node;
    loadingResources.value = true;
    error.value = null;

    try {
      // The node's enrichment field contains the ResourceList ID
      const resourceListId = node.enrichment;

      // Get all resources in the list
      const response = await callConceptQuery<IndexedResource>(
        'ResourceList',
        '_getListResources',
        {
          resourceList: resourceListId,
        }
      );

      if (response.error) {
        error.value = response.error;
        nodeResources.value = [];
        return response.error;
      }

      nodeResources.value = response.data || [];
      return null; // Success
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load resources';
      nodeResources.value = [];
      return err instanceof Error ? err.message : 'Failed to load resources';
    } finally {
      loadingResources.value = false;
    }
  }

  /**
   * Clears the selected node and its resources
   */
  function clearSelectedNode(): void {
    selectedNode.value = null;
    nodeResources.value = [];
  }

  /**
   * Adds a resource to the selected node
   * @param resourceTitle - Title for the new resource
   * @returns Error message or null on success
   */
  async function addResource(resourceTitle: string): Promise<string | null> {
    if (!selectedNode.value) {
      return 'No node selected';
    }

    const resourceListId = selectedNode.value.enrichment;

    try {
      // Resources are Objects, not Checks
      // We need to create a unique Object ID for each resource
      // Since ObjectManager.create() might not be exposed in the API,
      // we'll generate a unique ID that the backend can accept
      // The backend should handle creating the object if needed
      const resourceId = `resource-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const response = await callConceptAction<{ newIndexedResource: string }>(
        'ResourceList',
        'appendResource',
        {
          resourceList: resourceListId,
          resource: resourceId,
          resourceTitle: resourceTitle.trim(),
        }
      );

      if (response.error) {
        return response.error;
      }

      // Reload resources to get the updated list
      await loadNodeResources(selectedNode.value._id);

      return null; // Success
    } catch (err) {
      return err instanceof Error ? err.message : 'Failed to add resource';
    }
  }

  /**
   * Removes a resource from the selected node by index
   * @param index - Index of the resource to remove
   * @returns Error message or null on success
   */
  async function removeResource(index: number): Promise<string | null> {
    if (!selectedNode.value) {
      return 'No node selected';
    }

    const resourceListId = selectedNode.value.enrichment;

    try {
      const response = await callConceptAction<Record<string, never>>(
        'ResourceList',
        'deleteResource',
        {
          resourceList: resourceListId,
          index: index,
        }
      );

      if (response.error) {
        return response.error;
      }

      // Reload resources to get the updated list
      await loadNodeResources(selectedNode.value._id);

      return null; // Success
    } catch (err) {
      return err instanceof Error ? err.message : 'Failed to remove resource';
    }
  }

  /**
   * Reorders resources by moving a resource from one index to another
   * @param fromIndex - Original index of the resource
   * @param toIndex - Target index for the resource
   * @returns Error message or null on success
   */
  async function reorderResource(fromIndex: number, toIndex: number): Promise<string | null> {
    if (!selectedNode.value) {
      return 'No node selected';
    }

    // Don't do anything if indices are the same
    if (fromIndex === toIndex) {
      return null;
    }

    const resourceListId = selectedNode.value.enrichment;

    // Optimistically update the local state first for seamless UI
    const resources = [...nodeResources.value];
    const [movedResource] = resources.splice(fromIndex, 1);

    if (!movedResource) {
      return 'Resource not found';
    }

    resources.splice(toIndex, 0, movedResource);

    // Update indices to match new positions
    const updatedResources = resources.map((resource, index) => ({
      ...resource,
      index: index,
    }));

    nodeResources.value = updatedResources;

    try {
      const response = await callConceptAction<Record<string, never>>(
        'ResourceList',
        'moveResource',
        {
          resourceList: resourceListId,
          oldIndex: fromIndex,
          newIndex: toIndex,
        }
      );

      if (response.error) {
        // Revert optimistic update on error
        await loadNodeResources(selectedNode.value._id);
        return response.error;
      }

      // Success - state already updated optimistically
      return null;
    } catch (err) {
      // Revert optimistic update on error
      await loadNodeResources(selectedNode.value._id);
      return err instanceof Error ? err.message : 'Failed to reorder resource';
    }
  }

  /**
   * Loads the content for a resource
   * @param resourceId - ID of the resource object
   * @returns Content string or null if not found/error
   */
  async function loadResourceContent(resourceId: string): Promise<string | null> {
    // Check cache first
    if (resourceContentCache.value.has(resourceId)) {
      return resourceContentCache.value.get(resourceId) || null;
    }

    const authStore = useAuthStore();
    const userId = authStore.currentUser;

    if (!userId) {
      return null;
    }

    try {
      // Find file associated with this resource (using resource ID as filename)
      const filename = `resource-${resourceId}.md`;

      // Get all files for the user
      const filesResponse = await callConceptQuery<{ file: string; filename: string }>(
        'FileUploading',
        '_getFilesByOwner',
        {
          owner: userId,
        }
      );

      if (filesResponse.error) {
        return null;
      }

      // Find file with matching filename
      const resourceFile = filesResponse.data?.find((f) => f.filename === filename);

      if (!resourceFile) {
        // No content file exists yet
        resourceContentCache.value.set(resourceId, '');
        return '';
      }

      // Get download URL for the file
      const downloadURLResponse = await callConceptQuery<{ downloadURL: string }>(
        'FileUploading',
        '_getDownloadURL',
        {
          file: resourceFile.file,
        }
      );

      if (downloadURLResponse.error || !downloadURLResponse.data || downloadURLResponse.data.length === 0) {
        return null;
      }

      const downloadURLData = downloadURLResponse.data[0];
      if (!downloadURLData || !downloadURLData.downloadURL) {
        return null;
      }

      const downloadURL = downloadURLData.downloadURL;

      // Fetch the content using axios
      const contentResponse = await axios.get(downloadURL, {
        responseType: 'text',
      });

      const content = contentResponse.data;
      resourceContentCache.value.set(resourceId, content);
      return content;
    } catch {
      return null;
    }
  }

  /**
   * Updates the content of a resource
   * @param resourceId - ID of the resource object
   * @param content - Markdown/HTML content to save
   * @returns Error message or null on success
   */
  async function updateResourceContent(resourceId: string, content: string): Promise<string | null> {
    const authStore = useAuthStore();
    const userId = authStore.currentUser;

    if (!userId) {
      return 'User not authenticated';
    }

    try {
      const filename = `resource-${resourceId}.md`;

      // Check if file already exists
      const filesResponse = await callConceptQuery<{ file: string; filename: string }>(
        'FileUploading',
        '_getFilesByOwner',
        {
          owner: userId,
        }
      );

      let fileId: string | null = null;

      if (!filesResponse.error && filesResponse.data) {
        const existingFile = filesResponse.data.find((f) => f.filename === filename);
        if (existingFile) {
          fileId = existingFile.file;
          // Delete existing file
          await callConceptAction<Record<string, never>>('FileUploading', 'delete', {
            file: fileId,
          });
        }
      }

      // Request upload URL for new file
      const uploadResponse = await callConceptAction<{ file: string; uploadURL: string }>(
        'FileUploading',
        'requestUploadURL',
        {
          owner: userId,
          filename: filename,
        }
      );

      if (uploadResponse.error) {
        return uploadResponse.error;
      }

      if (!uploadResponse.data?.file || !uploadResponse.data?.uploadURL) {
        return 'Failed to get upload URL';
      }

      fileId = uploadResponse.data.file;
      const uploadURL = uploadResponse.data.uploadURL;

      // Deno's contentType('.md') returns 'text/markdown; charset=UTF-8'
      const contentType = 'text/markdown; charset=UTF-8';

      // Upload content to the presigned URL using axios
      try {
        await axios.put(uploadURL, content, {
          headers: {
            'Content-Type': contentType,
          },
        });
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          const status = error.response.status;
          const statusText = error.response.statusText || 'Unknown error';
          const errorMessage = `Failed to upload content: ${status} ${statusText}`;

          if (status === 403) {
            return `${errorMessage}. Content-type mismatch. Expected: ${contentType}`;
          }

          return errorMessage;
        }

        return `Failed to upload content: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }

      // Confirm upload
      const confirmResponse = await callConceptAction<{ file: string }>(
        'FileUploading',
        'confirmUpload',
        {
          file: fileId,
        }
      );

      if (confirmResponse.error) {
        return confirmResponse.error;
      }

      // Update cache
      resourceContentCache.value.set(resourceId, content);

      return null; // Success
    } catch (err) {
      return err instanceof Error ? err.message : 'Failed to save resource content';
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
    addNode,
    updateNodeTitle,
    deleteNode,
    addEdge,
    deleteEdge,
    selectedNode,
    nodeResources,
    loadingResources,
    loadNodeResources,
    clearSelectedNode,
    addResource,
    removeResource,
    reorderResource,
    loadResourceContent,
    updateResourceContent,
  };
});

