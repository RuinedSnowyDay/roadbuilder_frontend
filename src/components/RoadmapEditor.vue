<template>
  <div ref="networkContainer" class="roadmap-editor"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { Network, DataSet } from 'vis-network';
import type { Node, Edge } from '../services/types';

interface Props {
  nodes: Node[];
  edges: Edge[];
  deleteMode?: boolean;
  connectMode?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  deleteMode: false,
  connectMode: false,
});

const emit = defineEmits<{
  nodeDoubleClick: [nodeId: string];
  nodeClick: [nodeId: string];
  edgeCreated: [sourceNodeId: string, targetNodeId: string];
}>();

const networkContainer = ref<HTMLElement | null>(null);
let network: Network | null = null;
let connectSourceNodeId: string | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let nodesDataSet: DataSet<any> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let edgesDataSet: DataSet<any> | null = null;

// Transform API data to vis-network format
function getVisNetworkData() {
  const visNodes = props.nodes.map((node) => ({
    id: node._id,
    label: node.title,
    shape: 'box',
    margin: { top: 10, right: 10, bottom: 10, left: 10 },
  }));

  const visEdges = props.edges.map((edge) => ({
    from: edge.source,
    to: edge.target,
    arrows: 'to',
  }));

  return { nodes: visNodes, edges: visEdges };
}

// Get vis-network format for a single node
function getVisNode(node: Node) {
  return {
    id: node._id,
    label: node.title,
    shape: 'box',
    margin: { top: 10, right: 10, bottom: 10, left: 10 },
  };
}

// Get vis-network format for a single edge
function getVisEdge(edge: Edge) {
  return {
    from: edge.source,
    to: edge.target,
    arrows: 'to',
  };
}

function initializeNetwork() {
  if (!networkContainer.value) {
    return;
  }

  const data = getVisNetworkData();

  // Create DataSets for incremental updates
  nodesDataSet = new DataSet(data.nodes as never[]);
  edgesDataSet = new DataSet(data.edges as never[]);

  const networkData = {
    nodes: nodesDataSet,
    edges: edgesDataSet,
  };

  const options = {
    nodes: {
      shape: 'box',
      borderWidth: 2,
      color: {
        background: '#ffffff',
        border: '#4caf50',
        highlight: {
          background: '#f0f0f0',
          border: '#45a049',
        },
      },
      font: {
        size: 14,
        color: '#333',
      },
      margin: { top: 10, right: 10, bottom: 10, left: 10 },
    },
    edges: {
      color: {
        color: '#999',
        highlight: '#4caf50',
      },
      width: 2,
      smooth: {
        enabled: true,
        type: 'continuous',
        roundness: 0.5,
      },
      arrows: {
        to: {
          enabled: true,
        },
      },
    },
    physics: {
      enabled: true,
      stabilization: {
        enabled: true,
        iterations: 100,
        onlyDynamicEdges: false,
        fit: true,
      },
    },
    interaction: {
      dragNodes: !props.connectMode, // Disable node dragging in connect mode
      dragView: !props.connectMode, // Disable view dragging in connect mode to allow edge creation
      zoomView: true,
    },
    manipulation: {
      enabled: false, // Will be enabled in connect mode via watch
    },
  };

  network = new Network(networkContainer.value, networkData, options);

  // Listen for physics stabilization to prevent position changes after initial layout
  network.once('stabilizationIterationsDone', () => {
    physicsStabilized = true;
    // Disable physics after initial stabilization to prevent position changes
    network?.setOptions({ physics: { enabled: false } });
  });

  // Handle node double-click for editing
  network.on('doubleClick', (params) => {
    // Don't handle double-click in connect mode
    if (!props.connectMode && params.nodes.length > 0) {
      const nodeId = params.nodes[0] as string;
      emit('nodeDoubleClick', nodeId);
    }
  });

  // Handle node click for deletion (when in delete mode)
  network.on('click', (params) => {
    // Only handle clicks if in delete mode and not in connect mode
    if (props.deleteMode && !props.connectMode && params.nodes.length > 0) {
      const nodeId = params.nodes[0] as string;
      emit('nodeClick', nodeId);
    }
  });

}

// Track if physics has been stabilized
let physicsStabilized = false;
let previousNodes: Set<string> = new Set();
let previousEdges: Set<string> = new Set();
let isInitialLoad = true;

// Watch for changes in nodes/edges and update network incrementally
watch(
  () => [props.nodes, props.edges],
  () => {
    if (!network || !nodesDataSet || !edgesDataSet) return;

    // Disable physics to prevent position changes after initial load
    if (physicsStabilized) {
      network.setOptions({ physics: { enabled: false } });
    }

    const currentNodes = new Set(props.nodes.map((n) => n._id));
    const currentEdges = new Set(
      props.edges.map((e) => `${e.source}-${e.target}`)
    );

    if (isInitialLoad) {
      // First load - just track state
      previousNodes = currentNodes;
      previousEdges = currentEdges;
      isInitialLoad = false;
      return;
    }

    // Find nodes to add
    const nodesToAdd = props.nodes
      .filter((n) => !previousNodes.has(n._id))
      .map((n) => getVisNode(n));

    // Find nodes to update (title changes)
    const nodesToUpdate = props.nodes
      .filter((n) => previousNodes.has(n._id))
      .map((n) => getVisNode(n));

    // Find nodes to remove
    const nodesToRemove = Array.from(previousNodes).filter(
      (id) => !currentNodes.has(id)
    );

    // Find edges to add
    const edgesToAdd = props.edges
      .filter((e) => !previousEdges.has(`${e.source}-${e.target}`))
      .map((e) => getVisEdge(e));

    // Find edges to remove by matching source-target pairs
    const edgesToRemove: string[] = [];
    const currentEdgeKeys = new Set(
      props.edges.map((e) => `${e.source}-${e.target}`)
    );

    // Get all edges from DataSet and find ones to remove
    if (edgesDataSet) {
      const allEdges = edgesDataSet.get() as Array<{ id?: string; from: string; to: string }>;
      allEdges.forEach((edge) => {
        const edgeKey = `${edge.from}-${edge.to}`;
        if (!currentEdgeKeys.has(edgeKey) && edge.id) {
          edgesToRemove.push(edge.id);
        }
      });
    }

    // Apply incremental updates to DataSets
    if (nodesToAdd.length > 0) {
      nodesDataSet.add(nodesToAdd);
    }
    if (nodesToUpdate.length > 0) {
      nodesDataSet.update(nodesToUpdate);
    }
    if (nodesToRemove.length > 0) {
      nodesDataSet.remove(nodesToRemove);
    }
    if (edgesToAdd.length > 0) {
      edgesDataSet.add(edgesToAdd);
    }
    if (edgesToRemove.length > 0) {
      edgesDataSet.remove(edgesToRemove);
    }

    // Update previous state
    previousNodes = currentNodes;
    previousEdges = currentEdges;
  },
  { deep: true }
);

// Watch for mode changes
watch(
  () => [props.deleteMode, props.connectMode],
  ([deleteMode, connectMode]) => {
    if (network && networkContainer.value) {
      // Always remove all click handlers first to avoid conflicts
      network.off('click');

      if (deleteMode) {
        networkContainer.value.style.cursor = 'not-allowed';

        network.setOptions({
          manipulation: { enabled: false },
          interaction: {
            dragNodes: true,
            dragView: true,
            selectConnectedEdges: true,
            selectable: true,
          },
        });

        // Register delete click handler
        network.on('click', (params) => {
          if (params.nodes.length > 0) {
            const nodeId = params.nodes[0] as string;
            emit('nodeClick', nodeId);
          }
        });
      } else if (connectMode) {
        networkContainer.value.style.cursor = 'crosshair';

        // Reset connection state
        connectSourceNodeId = null;

        // Set up click-to-connect edge creation
        network.setOptions({
          manipulation: { enabled: false }, // Disable manipulation API
          interaction: {
            dragNodes: false,
            dragView: true, // Re-enable view dragging for normal navigation
            selectConnectedEdges: false,
            hover: true,
            keyboard: false,
            selectable: true, // Enable node selection
          },
        });

        // Use click events for edge creation (click source, then click target)
        network.on('click', (params) => {
          if (params.nodes.length > 0) {
            const nodeId = params.nodes[0] as string;

            if (!connectSourceNodeId) {
              // First click - select source node
              connectSourceNodeId = nodeId;
              console.log('Source node selected:', nodeId);
            } else if (connectSourceNodeId !== nodeId) {
              // Second click on different node - create edge
              console.log('Creating edge from', connectSourceNodeId, 'to', nodeId);
              emit('edgeCreated', connectSourceNodeId, nodeId);
              connectSourceNodeId = null; // Reset for next connection
            } else {
              // Clicked same node again - cancel
              console.log('Cancelled - clicked same node');
              connectSourceNodeId = null;
            }
          } else if (connectSourceNodeId) {
            // Clicked empty space - cancel
            console.log('Cancelled - clicked empty space');
            connectSourceNodeId = null;
          }
        });
      } else {
        // Select mode (normal mode)
        networkContainer.value.style.cursor = 'default';

        // Reset connection state
        connectSourceNodeId = null;

        network.setOptions({
          manipulation: { enabled: false },
          interaction: {
            dragNodes: true,
            dragView: true, // Re-enable view dragging in normal mode
            selectConnectedEdges: true, // Re-enable edge selection
            selectable: true, // Re-enable node selection
          },
        });

        // No click handler needed in select mode (double-click is handled separately)
      }
    }
  },
  { immediate: true }
);

onMounted(() => {
  initializeNetwork();
});

onBeforeUnmount(() => {
  if (network) {
    network.destroy();
    network = null;
  }
});
</script>

<style scoped>
.roadmap-editor {
  width: 100%;
  height: 600px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #fafafa;
}

/* Import vis-network styles */
:deep(.vis-network) {
  outline: none;
}
</style>

