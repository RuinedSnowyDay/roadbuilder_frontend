<template>
  <div class="login-container">
    <div class="login-card">
      <h1>Login</h1>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="username">Username</label>
          <input
            id="username"
            v-model="username"
            type="text"
            required
            placeholder="Enter your username"
          />
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            placeholder="Enter your password"
          />
        </div>
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
        <button type="submit" :disabled="loading" class="submit-button">
          {{ loading ? 'Logging in...' : 'Login' }}
        </button>
      </form>
      <p class="register-link">
        Don't have an account?
        <RouterLink to="/register">Register here</RouterLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const username = ref('');
const password = ref('');
const errorMessage = ref('');
const loading = ref(false);

async function handleLogin() {
  errorMessage.value = '';
  loading.value = true;

  try {
    const error = await authStore.login(username.value, password.value);
    if (error) {
      errorMessage.value = error;
    } else {
      router.push('/');
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'An error occurred';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: var(--color-background);
}

.login-card {
  background: var(--gunmetal-bg);
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  width: 100%;
  max-width: 400px;
  border: 1px solid var(--color-border);
}

h1 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  text-align: center;
  color: var(--color-heading);
}

.form-group {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--color-text);
  font-weight: 500;
}

input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;
  background-color: var(--gunmetal-bg-dark);
  color: var(--color-text);
}

input:focus {
  outline: none;
  border-color: var(--color-accent);
}

input::placeholder {
  color: var(--color-text-muted);
}

.error-message {
  color: #ff6b6b;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.submit-button {
  width: 100%;
  padding: 0.75rem;
  background-color: var(--color-accent);
  color: var(--gunmetal-bg-dark);
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 0.5rem;
  font-weight: 600;
  transition: background-color 0.2s;
}

.submit-button:hover:not(:disabled) {
  background-color: var(--color-accent-hover);
}

.submit-button:disabled {
  background-color: var(--gunmetal-secondary);
  cursor: not-allowed;
  opacity: 0.5;
}

.register-link {
  text-align: center;
  margin-top: 1.5rem;
  color: var(--color-text-secondary);
}

.register-link a {
  color: var(--color-accent);
  text-decoration: none;
}

.register-link a:hover {
  text-decoration: underline;
  color: var(--color-accent-hover);
}
</style>

