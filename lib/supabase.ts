import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Simple mutex lock that serializes token refresh calls by name.
// The previous noOpLock allowed concurrent token refreshes to race,
// which could invalidate tokens and cause random sign-outs.
const lockMap = new Map<string, Promise<void>>();

const navigatorLock = async <R>(
  name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>,
): Promise<R> => {
  const previous = lockMap.get(name) ?? Promise.resolve();

  // Chain this call after the previous one for the same lock name
  let releaseLock: () => void;
  const currentLock = new Promise<void>(resolve => {
    releaseLock = resolve;
  });
  lockMap.set(name, currentLock);

  try {
    // Wait for previous lock holder to finish
    await previous;
    return await fn();
  } finally {
    releaseLock!();
  }
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_KEY!,
  {
    auth: {
      storage: Platform.OS === 'web' ? undefined : AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web' ? false : true,
      lock: Platform.OS === 'web' ? undefined : navigatorLock,
    },
  },
);
