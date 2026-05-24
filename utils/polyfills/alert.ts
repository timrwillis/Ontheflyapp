import { Alert } from 'react-native';

// Add global alert() on iOS/Android — it doesn't exist by default in React Native.
// On web, alert.web.ts is used instead (Metro picks .web.ts automatically).
(global as any).alert = (message?: string) => {
  Alert.alert('', String(message ?? ''));
};
