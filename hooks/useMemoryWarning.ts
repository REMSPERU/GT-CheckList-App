import { useEffect } from 'react';
import { Platform, DeviceEventEmitter } from 'react-native';
import type { EmitterSubscription } from 'react-native';
import * as Sentry from '@sentry/react-native';

/**
 * Listens for OS-level low-memory warnings and logs them as Sentry breadcrumbs.
 *
 * - **iOS**: Uses `didReceiveMemoryWarning` via DeviceEventEmitter.
 * - **Android**: React Native surfaces `onTrimMemory` as `memoryWarning`
 *   via `ComponentCallbacks2` since RN 0.63+.
 *
 * Call this hook once in a root-level component (e.g., `_layout.tsx`).
 */
export function useMemoryWarning(): void {
  useEffect(() => {
    let subscription: EmitterSubscription | null = null;

    try {
      // DeviceEventEmitter is the JS-level emitter that RN uses internally
      // to broadcast 'memoryWarning'. No native module argument needed,
      // so it avoids the NativeEventEmitter addListener/removeListeners warnings.
      subscription = DeviceEventEmitter.addListener('memoryWarning', () => {
        Sentry.addBreadcrumb({
          category: 'device',
          message: `Low memory warning (${Platform.OS})`,
          level: 'warning',
          data: {
            platform: Platform.OS,
            timestamp: new Date().toISOString(),
          },
        });

        if (__DEV__) {
          console.warn('[MEMORY] OS low-memory warning received');
        }
      });
    } catch {
      if (__DEV__) {
        console.warn('[MEMORY] Could not subscribe to memoryWarning events');
      }
    }

    return () => {
      subscription?.remove();
    };
  }, []);
}
