// Mock implementation for Obsidian API during testing
import { vi } from 'vitest';

// Keep vi import for potential future use in mocks
void vi;

export const App = class MockApp {};
export const Plugin = class MockPlugin {};
export const PluginSettingTab = class MockPluginSettingTab {};
export const Setting = class MockSetting {};
export const TFile = class MockTFile {};
export const TFolder = class MockTFolder {};
export const Notice = class MockNotice {};
export const Modal = class MockModal {};
export const FuzzySuggestModal = class MockFuzzySuggestModal {};
export const Component = class MockComponent {};
