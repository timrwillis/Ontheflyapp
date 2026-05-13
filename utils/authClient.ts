import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';

export const authClient = createAuthClient({
  baseURL: 'https://zqdg2aguqavazwnbcyv4744dv5nv2nxg.app.specular.dev',
  plugins: [
    expoClient({
      scheme: 'on-the-fly',
      storagePrefix: 'onthefly',
      storage: SecureStore,
    }),
  ],
});
