<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router';
import { useAuthStore } from './stores/auth';
import { computed } from 'vue';

const router = useRouter();
const authStore = useAuthStore();

const isAuthenticated = computed(() => authStore.isAuthenticated());

async function handleLogout() {
  await authStore.logout();
  router.push('/login');
}
</script>

<template>
  <div class="app">
    <header v-if="isAuthenticated">
      <nav>
        <RouterLink to="/" class="nav-link">Home</RouterLink>
        <button @click="handleLogout" class="logout-button">Logout</button>
      </nav>
    </header>
    <main>
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

header {
  background-color: var(--gunmetal-bg);
  border-bottom: 1px solid var(--color-border);
  padding: 1rem 2rem;
}

nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-link {
  color: var(--color-text);
  text-decoration: none;
  font-weight: 500;
  font-size: 1.1rem;
  transition: color 0.2s;
}

.nav-link:hover {
  color: var(--color-accent);
}

.logout-button {
  padding: 0.5rem 1rem;
  background-color: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-destructive);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.logout-button:hover {
  background-color: rgba(212, 165, 165, 0.15);
  border-color: var(--color-destructive-hover);
  color: var(--color-destructive-hover);
}

main {
  flex: 1;
}
</style>
