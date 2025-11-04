<template>
  <div ref="networkContainer" class="roadmap-editor"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
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
  edgeClick: [edgeId: string];
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
  const visNodes = props.nodes.map((node) => {
    const progress = calculateNodeProgress(node._id);
    return {
      id: node._id,
      label: node.title,
      shape: 'box',
      margin: { top: 12, right: 10, bottom: 20, left: 10 }, // Increased top and bottom margins to accommodate text and progress bar
      progress: progress, // Add progress percentage to node data
    };
  });

  const visEdges = props.edges.map((edge) => ({
    id: edge._id,
    from: edge.source,
    to: edge.target,
    arrows: 'to',
  }));

  return { nodes: visNodes, edges: visEdges };
}

// Calculate progress percentage for a node
// For now, returns 0% as placeholder (will be updated when resource data is available)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function calculateNodeProgress(_nodeId: string): number {
  // TODO: Calculate actual progress from checked resources / total resources
  // For Phase 8, return 0% as placeholder
  return 0;
}

// Get vis-network format for a single node
function getVisNode(node: Node) {
  const progress = calculateNodeProgress(node._id);
  return {
    id: node._id,
    label: node.title,
    shape: 'box',
    margin: { top: 10, right: 10, bottom: 10, left: 10 },
    progress: progress, // Add progress percentage to node data
  };
}

// Get vis-network format for a single edge
function getVisEdge(edge: Edge) {
  return {
    id: edge._id,
    from: edge.source,
    to: edge.target,
    arrows: 'to',
  };
}

// Helper function to draw rounded rectangle
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Draw progress bars on nodes
function drawProgressBars(ctx: CanvasRenderingContext2D) {
  if (!network || !nodesDataSet) return;

  // Get all nodes from the network
  const nodePositions = network.getPositions();
  const nodes = nodesDataSet.get() as Array<{ id: string; progress?: number; label?: string }>;

  nodes.forEach((node) => {
    const position = nodePositions[node.id];
    if (!position) return;

    const progress = node.progress !== undefined ? node.progress : 0;

    // Get actual node bounding box from vis-network
    if (!network) return;
    const nodeBoundingBox = network.getBoundingBox(node.id);
    if (!nodeBoundingBox) return;

    // Calculate actual node dimensions from bounding box
    const nodeWidth = nodeBoundingBox.right - nodeBoundingBox.left;

    // Progress bar styling
    const progressBarHeight = 4;
    const progressBarWidthRatio = 0.6; // Progress bar is 60% of node width (shorter)
    const progressBarBottomPadding = 14; // Padding from bottom edge (higher from bottom)

    // Calculate progress bar width (centered, shorter than node)
    const progressBarWidth = nodeWidth * progressBarWidthRatio;
    const progressBarHorizontalPadding = (nodeWidth - progressBarWidth) / 2; // Center the bar

    // Calculate progress bar position (inside node, above the bottom with padding)
    const progressBarX = nodeBoundingBox.left + progressBarHorizontalPadding;
    const progressBarY = nodeBoundingBox.bottom - progressBarHeight - progressBarBottomPadding;

    // Ensure progress bar stays within node bounds
    if (progressBarWidth <= 0 || progressBarY < nodeBoundingBox.top) return;

    // Save canvas state
    ctx.save();

    // Draw progress bar background (rounded rectangle)
    ctx.fillStyle = '#e0e0e0';
    drawRoundedRect(ctx, progressBarX, progressBarY, progressBarWidth, progressBarHeight, 2);
    ctx.fill();

    // Draw progress bar fill (rounded rectangle)
    if (progress > 0) {
      const progressWidth = (progressBarWidth * progress) / 100;
      ctx.fillStyle = '#4caf50';
      drawRoundedRect(ctx, progressBarX, progressBarY, progressWidth, progressBarHeight, 2);
      ctx.fill();
    }

    // Restore canvas state
    ctx.restore();
  });
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
      margin: { top: 12, right: 10, bottom: 20, left: 10 }, // Increased top and bottom margins to accommodate text and progress bar
      // Add custom drawing function for progress bar
      shapeProperties: {
        useBorderWithImage: false,
      },
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

  // Set initial state tracking immediately after network creation
  // This prevents the watch from treating the first prop change as "initial load"
  previousNodes = new Set(props.nodes.map((n) => n._id));
  previousEdges = new Set(
    props.edges.map((e) => `${e.source}-${e.target}`)
  );
  isInitialLoad = false;

  // Register custom node rendering with progress bar using afterDrawing event
  if (network) {
    network.on('afterDrawing', (ctx: CanvasRenderingContext2D) => {
      // This callback is called after drawing, we'll add progress bars on top
      drawProgressBars(ctx);
    });
  }

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

  // Handle node and edge clicks for deletion (when in delete mode)
  network.on('click', (params) => {
    // Only handle clicks if in delete mode and not in connect mode
    if (props.deleteMode && !props.connectMode) {
      if (params.nodes.length > 0) {
        // Node clicked
        const nodeId = params.nodes[0] as string;
        emit('nodeClick', nodeId);
      } else if (params.edges.length > 0) {
        // Edge clicked
        const edgeId = params.edges[0] as string;
        emit('edgeClick', edgeId);
      }
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
    if (!network || !nodesDataSet || !edgesDataSet) {
      return;
    }

    // Disable physics to prevent position changes after initial load
    if (physicsStabilized) {
      network.setOptions({ physics: { enabled: false } });
    }

    const currentNodes = new Set(props.nodes.map((n) => n._id));
    const currentEdges = new Set(
      props.edges.map((e) => `${e.source}-${e.target}`)
    );

    if (isInitialLoad) {
      // First load - just track state and ensure network is ready
      previousNodes = currentNodes;
      previousEdges = currentEdges;
      isInitialLoad = false;
      // Don't return early - allow the network to process initial data
      // The initial data is already in the DataSets from initializeNetwork
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
      // Use nextTick to ensure DataSet updates are processed, then force redraw
      nextTick(() => {
        if (network) {
          network.redraw();
        }
      });
    }
    if (edgesToRemove.length > 0) {
      edgesDataSet.remove(edgesToRemove);
      // Use nextTick to ensure DataSet updates are processed, then force redraw
      nextTick(() => {
        if (network) {
          network.redraw();
        }
      });
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

        // Register delete click handler for both nodes and edges
        network.on('click', (params) => {
          if (params.nodes.length > 0) {
            const nodeId = params.nodes[0] as string;
            emit('nodeClick', nodeId);
          } else if (params.edges.length > 0) {
            const edgeId = params.edges[0] as string;
            emit('edgeClick', edgeId);
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
            } else if (connectSourceNodeId !== nodeId) {
              // Second click on different node - create edge
              emit('edgeCreated', connectSourceNodeId, nodeId);
              connectSourceNodeId = null; // Reset for next connection
            } else {
              // Clicked same node again - cancel
              connectSourceNodeId = null;
            }
          } else if (connectSourceNodeId) {
            // Clicked empty space - cancel
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
  // After network is initialized, mark initial load as complete
  // This ensures the watch can properly track changes
  nextTick(() => {
    // The watch will fire on initial props, but we need to ensure isInitialLoad is handled correctly
    // The watch itself will set isInitialLoad to false on first run
  });
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

