import { mergeConfig } from 'vite';
import { sharedVitestConfig } from '../../vitest.shared';

export default mergeConfig(sharedVitestConfig, {
  // Package-specific overrides can go here
});
