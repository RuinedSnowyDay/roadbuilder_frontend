<template>
  <div ref="networkContainer" class="roadmap-editor"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import { useRoadmapStore } from '../stores/roadmap';
import { storeToRefs } from 'pinia';
import type { Node, Edge } from '../services/types';

interface Props {
  nodes: Node[];
  edges: Edge[];
  deleteMode?: boolean;
  connectMode?: boolean;
  addNodeMode?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  deleteMode: false,
  connectMode: false,
  addNodeMode: false,
});

const emit = defineEmits<{
  nodeDoubleClick: [nodeId: string];
  nodeClick: [nodeId: string];
  edgeClick: [edgeId: string];
  edgeCreated: [sourceNodeId: string, targetNodeId: string];
  canvasClick: [position: { x: number; y: number }];
}>();

const roadmapStore = useRoadmapStore();
const { resourceChecks, allNodeResources } = storeToRefs(roadmapStore);

const networkContainer = ref<HTMLElement | null>(null);
let network: Network | null = null;
let connectSourceNodeId: string | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let nodesDataSet: DataSet<any> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let edgesDataSet: DataSet<any> | null = null;

// Transform API data to vis-network format
function getVisNetworkData() {
  const visNodes = props.nodes.map((node) => getVisNode(node));

  const visEdges = props.edges.map((edge) => ({
    id: edge._id,
    from: edge.source,
    to: edge.target,
    arrows: 'to',
  }));

  return { nodes: visNodes, edges: visEdges };
}

// Calculate progress percentage for a node
// Progress = (checked resources / total resources) * 100
function calculateNodeProgress(nodeId: string): number {
  // Find the node to get its enrichment (ResourceList ID)
  const node = props.nodes.find((n) => n._id === nodeId);
  if (!node) {
    return 0;
  }

  // Get all resources for this node's ResourceList from the cache
  const resources = allNodeResources.value.get(node.enrichment) || [];

  if (resources.length === 0) {
    return 0; // No resources means 0% progress
  }

  // Count checked resources
  let checkedCount = 0;
  for (const resource of resources) {
    const check = resourceChecks.value.get(resource.resource);
    if (check?.checked) {
      checkedCount++;
    }
  }

  // Calculate percentage
  return Math.round((checkedCount / resources.length) * 100);
}

// Get vis-network format for a single node
function getVisNode(node: Node & { x?: number; y?: number }) {
  const progress = calculateNodeProgress(node._id);
  const visNode: {
    id: string;
    label: string;
    shape: string;
    margin: { top: number; right: number; bottom: number; left: number };
    progress: number;
    x?: number;
    y?: number;
    fixed?: { x: boolean; y: boolean };
  } = {
    id: node._id,
    label: node.title,
    shape: 'box',
    margin: { top: 12, right: 10, bottom: 20, left: 10 },
    progress: progress, // Add progress percentage to node data
  };

  // If position is provided, set it and fix the node position
  if (node.x !== undefined && node.y !== undefined) {
    visNode.x = node.x;
    visNode.y = node.y;
    visNode.fixed = { x: true, y: true }; // Fix position so physics doesn't move it
  }

  return visNode;
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

  // Handle node double-click for opening content modal (only in select mode)
  network.on('doubleClick', (params) => {
    // Only handle double-click in select mode (not in delete or connect mode)
    if (!props.connectMode && !props.deleteMode && params.nodes.length > 0) {
      const nodeId = params.nodes[0] as string;
      emit('nodeDoubleClick', nodeId);
    }
  });

  // Note: Initial click handler is set up in the watch for deleteMode/connectMode
  // This ensures proper mode handling after network creation

}

// Track if physics has been stabilized
let physicsStabilized = false;
let previousNodes: Set<string> = new Set();
let previousEdges: Set<string> = new Set();
let isInitialLoad = true;

// Watch for resource checks and allNodeResources changes to update progress bars
watch(
  () => [resourceChecks.value, allNodeResources.value],
  () => {
    // When checks or resources change, update node progress and redraw
    if (nodesDataSet && network) {
      const nodes = nodesDataSet.get() as Array<{ id: string; progress?: number; label?: string }>;
      nodes.forEach((node) => {
        const progress = calculateNodeProgress(node.id);
        if (node.progress !== progress) {
          nodesDataSet!.update({ ...node, progress });
        }
      });
      nextTick(() => {
        network?.redraw();
      });
    }
  },
  { deep: true }
);

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
      .map((n) => {
        const visNode = getVisNode(n as Node & { x?: number; y?: number });
        // Newly added nodes with coordinates should be fixed initially
        // We'll unfix them after a short delay to allow positioning
        return visNode;
      });

    // Find nodes to update (title changes, but don't fix position again)
    const nodesToUpdate = props.nodes
      .filter((n) => previousNodes.has(n._id))
      .map((n) => {
        const visNode = getVisNode(n);
        // Remove fixed property for existing nodes - they should be movable
        delete visNode.fixed;
        return visNode;
      });

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

      // Unfix newly added nodes after a short delay so they can be moved
      // This allows the node to be positioned initially, then become movable
      nextTick(() => {
        if (network && nodesToAdd.length > 0) {
          // Unfix all newly added nodes after they're positioned
          const updates = nodesToAdd.map((node) => ({
            id: node.id,
            fixed: false, // Unfix so node can be moved
          }));
          nodesDataSet!.update(updates);

          // Clean up x and y properties from node objects in the store
          // This prevents them from being fixed again on subsequent updates
          nodesToAdd.forEach((visNode) => {
            const node = props.nodes.find((n) => n._id === visNode.id);
            if (node && 'x' in node && 'y' in node) {
              delete (node as Node & { x?: number; y?: number }).x;
              delete (node as Node & { x?: number; y?: number }).y;
            }
          });
        }
      });
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
  () => [props.deleteMode, props.connectMode, props.addNodeMode],
  ([deleteMode, connectMode, addNodeMode]) => {
    if (network && networkContainer.value) {
      // Always remove all click handlers first to avoid conflicts
      network.off('click');

      if (addNodeMode) {
        networkContainer.value.style.cursor = 'crosshair';

        network.setOptions({
          manipulation: { enabled: false },
          interaction: {
            dragNodes: false,
            dragView: false, // Disable view dragging to prevent interference with clicks
            selectConnectedEdges: false,
            selectable: false, // Disable node selection
          },
        });

        // Handle clicks on canvas (empty space) to add node at that position
        network.on('click', (params) => {
          // Only handle clicks on empty canvas (not on nodes or edges)
          if (params.nodes.length === 0 && params.edges.length === 0) {
            const canvas = networkContainer.value;
            if (!canvas || !network) {
              return;
            }

            // Get click coordinates from params.pointer if available, otherwise use event
            let domX: number;
            let domY: number;

            if (params.pointer && params.pointer.DOM) {
              // Use pointer coordinates from vis-network
              domX = params.pointer.DOM.x;
              domY = params.pointer.DOM.y;
            } else if (params.event) {
              // Fallback to event coordinates
              const event = params.event as MouseEvent;
              const rect = canvas.getBoundingClientRect();
              domX = event.clientX - rect.left;
              domY = event.clientY - rect.top;
            } else {
              return; // No coordinates available
            }

            // Convert DOM coordinates to canvas/network coordinates
            // vis-network's coordinate system: use getPositions to understand the coordinate space
            // For now, we'll use the canvas coordinates directly and let vis-network handle it
            // The position will be set when we add the node to the DataSet
            emit('canvasClick', { x: domX, y: domY });
          }
        });
      } else if (deleteMode) {
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

        // No click handler needed - double-click is handled separately in initializeNetwork
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

    // Also set up a direct click handler on the container as a fallback
    // This will work even when vis-network doesn't fire click events (e.g., empty graphs)
    if (networkContainer.value) {
      const containerClickHandler = (event: MouseEvent) => {
        if (props.addNodeMode && network) {
          // Check if this is a click on empty space
          const rect = networkContainer.value!.getBoundingClientRect();
          const domX = event.clientX - rect.left;
          const domY = event.clientY - rect.top;

          // Check if click is on any node using getNodeAt
          try {
            const nodeAt = network.getNodeAt({ x: domX, y: domY });
            if (nodeAt) {
              // Clicked on a node, ignore
              return;
            }
          } catch {
            // If getNodeAt fails (e.g., empty graph), continue
          }

          // Empty space - emit canvas click
          emit('canvasClick', { x: domX, y: domY });
        }
      };

      networkContainer.value.addEventListener('click', containerClickHandler);

      // Store handler for cleanup
      (networkContainer.value as HTMLElement & { __clickHandler?: (event: MouseEvent) => void }).__clickHandler = containerClickHandler;
    }
  });
});

onBeforeUnmount(() => {
  if (network) {
    network.destroy();
    network = null;
  }
  // Clean up direct event listener
  if (networkContainer.value && (networkContainer.value as HTMLElement & { __clickHandler?: (event: MouseEvent) => void }).__clickHandler) {
    networkContainer.value.removeEventListener('click', (networkContainer.value as HTMLElement & { __clickHandler?: (event: MouseEvent) => void }).__clickHandler!);
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

