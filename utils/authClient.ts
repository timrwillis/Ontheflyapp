import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';

export const authClient = createAuthClient({
  baseURL: 'https://u8y8kzvzgndjkymacqmf8v9manbx8fwa.app.specular.dev',
  plugins: [
    expoClient({
      scheme: 'onthefly',
      storagePrefix: 'onthefly',
      storage: SecureStore,
    }),
  ],
});
