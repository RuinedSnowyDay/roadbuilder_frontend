import { defineStore } from 'pinia';
import { ref } from 'vue';
import { callConceptAction } from '../services/api';
import type { User, Session } from '../services/types';

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
      // First, try to login
      const loginResponse = await callConceptAction<User>(
        'UserAuthentication',
        'login',
        { username, password }
      );

      if (loginResponse.error) {
        return loginResponse.error;
      }

      if (!loginResponse.data?.user) {
        return 'Login failed: No user returned';
      }

      const userId = loginResponse.data.user;

      // Create a session
      const sessionResponse = await callConceptAction<Session>(
        'Sessioning',
        'create',
        { user: userId }
      );

      if (sessionResponse.error) {
        return sessionResponse.error;
      }

      if (!sessionResponse.data?.session) {
        return 'Session creation failed';
      }

      const sessionId = sessionResponse.data.session;

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
      const response = await callConceptAction<User>(
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

