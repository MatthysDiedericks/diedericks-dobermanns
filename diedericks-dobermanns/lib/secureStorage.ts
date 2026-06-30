import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Storage adapter for the Supabase auth client.
 *
 * On native we persist the session in `expo-secure-store` (encrypted keychain /
 * keystore) as required by the security spec — never AsyncStorage. SecureStore
 * caps each value at ~2KB, and Supabase sessions can exceed that, so values are
 * transparently chunked across multiple keys.
 *
 * On web (no SecureStore) we fall back to localStorage, which is the standard
 * Supabase web behaviour.
 */
const CHUNK_SIZE = 1800; // stay safely under SecureStore's 2048-byte limit

function isWeb(): boolean {
  return Platform.OS === 'web';
}

async function webGet(key: string): Promise<string | null> {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(key);
}

async function webSet(key: string, value: string): Promise<void> {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(key, value);
}

async function webRemove(key: string): Promise<void> {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(key);
}

export const SecureStorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    if (isWeb()) return webGet(key);

    const countRaw = await SecureStore.getItemAsync(`${key}__count`);
    if (countRaw == null) {
      // Fall back to a single non-chunked value (older sessions / small values).
      return SecureStore.getItemAsync(key);
    }

    const count = parseInt(countRaw, 10);
    let result = '';
    for (let i = 0; i < count; i += 1) {
      const part = await SecureStore.getItemAsync(`${key}__${i}`);
      if (part == null) return null; // corrupt chunk set
      result += part;
    }
    return result;
  },

  async setItem(key: string, value: string): Promise<void> {
    if (isWeb()) return webSet(key, value);

    // Clear any previous representation before writing the new one.
    await this.removeItem(key);

    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }

    const chunks = Math.ceil(value.length / CHUNK_SIZE);
    await SecureStore.setItemAsync(`${key}__count`, String(chunks));
    for (let i = 0; i < chunks; i += 1) {
      const slice = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      await SecureStore.setItemAsync(`${key}__${i}`, slice);
    }
  },

  async removeItem(key: string): Promise<void> {
    if (isWeb()) return webRemove(key);

    const countRaw = await SecureStore.getItemAsync(`${key}__count`);
    if (countRaw != null) {
      const count = parseInt(countRaw, 10);
      for (let i = 0; i < count; i += 1) {
        await SecureStore.deleteItemAsync(`${key}__${i}`);
      }
      await SecureStore.deleteItemAsync(`${key}__count`);
    }
    await SecureStore.deleteItemAsync(key);
  },
};
