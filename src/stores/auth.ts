import { defineStore } from 'pinia';
import { ref } from 'vue';
import { callConceptAction, callConceptQuery } from '../services/api';

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref<string | null>(null);
  const currentSession = ref<string | null>(null);

  // Load session from localStorage on init
  const savedSession = localStorage.getItem('session');
  const savedUser = localStorage.getItem('user');
  if (savedSession && savedUser) {
    currentSession.value = savedSession;
    currentUser.value = savedUser;
  }

  async function login(username: string, password: string): Promise<string | null> {
    try {
      // Login now returns session directly (session is created automatically via syncs)
      const loginResponse = await callConceptAction<{ session: string }>(
        'UserAuthentication',
        'login',
        { username, password }
      );

      if (loginResponse.error) {
        return loginResponse.error;
      }

      if (!loginResponse.data?.session) {
        return 'Login failed: No session returned';
      }

      const sessionId = loginResponse.data.session;

      // Get the user from the session
      const userResponse = await callConceptQuery<{ user: string }>(
        'Sessioning',
        '_getUser',
        { session: sessionId }
      );

      if (userResponse.error || !userResponse.data || userResponse.data.length === 0) {
        return 'Failed to get user from session';
      }

      const userId = userResponse.data[0]?.user;
      if (!userId) {
        return 'Failed to get user from session';
      }

      // Store session and user
      currentUser.value = userId;
      currentSession.value = sessionId;
      localStorage.setItem('user', userId);
      localStorage.setItem('session', sessionId);

      return null; // Success
    } catch (error) {
      return error instanceof Error ? error.message : 'Unknown error occurred';
    }
  }

  async function register(username: string, password: string): Promise<string | null> {
    try {
      const response = await callConceptAction<{ user: string }>(
        'UserAuthentication',
        'register',
        { username, password }
      );

      if (response.error) {
        return response.error;
      }

      if (!response.data?.user) {
        return 'Registration failed: No user returned';
      }

      // After registration, automatically log in
      return await login(username, password);
    } catch (error) {
      return error instanceof Error ? error.message : 'Unknown error occurred';
    }
  }

  async function logout(): Promise<void> {
    if (currentSession.value) {
      try {
        // Logout now goes through Requesting concept
        await callConceptAction('Sessioning', 'delete', {
          session: currentSession.value,
        });
      } catch (error) {
        console.error('Error deleting session:', error);
      }
    }

    currentUser.value = null;
    currentSession.value = null;
    localStorage.removeItem('user');
    localStorage.removeItem('session');

    // Clear resource checks cache when user logs out
    const { useRoadmapStore } = await import('./roadmap');
    const roadmapStore = useRoadmapStore();
    roadmapStore.clearResourceChecks();
  }

  function isAuthenticated(): boolean {
    return currentUser.value !== null && currentSession.value !== null;
  }

  return {
    currentUser,
    currentSession,
    login,
    register,
    logout,
    isAuthenticated,
  }
})

