/**
 * Auth Events Service
 * Simple event emitter for authentication state changes
 */

type AuthEventListener = () => void;

class AuthEventsService {
  private listeners: Set<AuthEventListener> = new Set();

  /**
   * Subscribe to auth failure events
   */
  subscribe(listener: AuthEventListener): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Emit auth failure event
   */
  emitAuthFailure(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        console.error('Error in auth event listener:', error);
      }
    });
  }

  /**
   * Clear all listeners
   */
  clear(): void {
    this.listeners.clear();
  }
}

// Export singleton instance
export const authEvents = new AuthEventsService();
