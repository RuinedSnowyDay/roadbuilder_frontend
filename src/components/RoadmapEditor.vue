<template>
  <div ref="networkContainer" class="roadmap-editor"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { Network } from 'vis-network';
import type { Node, Edge } from '../services/types';

interface Props {
  nodes: Node[];
  edges: Edge[];
  deleteMode?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  deleteMode: false,
});

const emit = defineEmits<{
  nodeDoubleClick: [nodeId: string];
  nodeClick: [nodeId: string];
}>();

const networkContainer = ref<HTMLElement | null>(null);
let network: Network | null = null;

// Transform API data to vis-network format
function getVisNetworkData() {
  const visNodes = props.nodes.map((node) => ({
    id: node._id,
    label: node.title,
    shape: 'box',
    margin: 10,
  }));

  const visEdges = props.edges.map((edge) => ({
    from: edge.source,
    to: edge.target,
    arrows: 'to',
  }));

  return { nodes: visNodes, edges: visEdges };
}

function initializeNetwork() {
  if (!networkContainer.value) {
    return;
  }

  const data = getVisNetworkData();
  const options = {
    nodes: {
      shape: 'box',
      borderWidth: 2,
      borderColor: '#4caf50',
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
      margin: 10,
    },
    edges: {
      color: {
        color: '#999',
        highlight: '#4caf50',
      },
      width: 2,
      smooth: {
        type: 'continuous',
      },
    },
    physics: {
      enabled: true,
      stabilization: {
        enabled: true,
        iterations: 100,
      },
    },
    interaction: {
      dragNodes: true,
      dragView: true,
      zoomView: true,
    },
  };

  network = new Network(networkContainer.value, data, options);

  // Handle node double-click for editing
  network.on('doubleClick', (params) => {
    if (params.nodes.length > 0) {
      const nodeId = params.nodes[0] as string;
      emit('nodeDoubleClick', nodeId);
    }
  });

  // Handle node click for deletion (when in delete mode)
  network.on('click', (params) => {
    if (props.deleteMode && params.nodes.length > 0) {
      const nodeId = params.nodes[0] as string;
      emit('nodeClick', nodeId);
    }
  });
}

// Watch for changes in nodes/edges and update network
watch(
  () => [props.nodes, props.edges],
  () => {
    if (network) {
      const data = getVisNetworkData();
      network.setData(data);
    }
  },
  { deep: true }
);

// Watch for delete mode changes
watch(
  () => props.deleteMode,
  (deleteMode) => {
    if (networkContainer.value) {
      if (deleteMode) {
        networkContainer.value.style.cursor = 'not-allowed';
      } else {
        networkContainer.value.style.cursor = 'default';
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

