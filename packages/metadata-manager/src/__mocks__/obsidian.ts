// Mock implementation for Obsidian API during testing
import { vi } from 'vitest';

export const App = class MockApp {};
export const Plugin = class MockPlugin {};
export const PluginSettingTab = class MockPluginSettingTab {};
export const Setting = class MockSetting {};
export const TFile = class MockTFile {};
export const Notice = class MockNotice {};
export const TAbstractFile = class MockTAbstractFile {};

export const moment = vi.fn((dateString?: string, format?: string, strict?: boolean) => ({
  format: vi.fn().mockReturnValue('2024-01-01 12:00:00'),
  isValid: vi.fn().mockReturnValue(dateString !== 'invalid-date')
}));