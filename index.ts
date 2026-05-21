// Initialize Newly console log capture before anything else
import './utils/errorLogger';

// Capture native fetch BEFORE the expo/fetch polyfill replaces globalThis.fetch
import './utils/polyfills/nativeFetch';

// Polyfills
import './utils/polyfills/alert';
import './utils/polyfills/fetch';

import 'expo-router/entry';
