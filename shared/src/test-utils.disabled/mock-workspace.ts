import {
  Workspace,
  WorkspaceLeaf,
  View,
  MarkdownView,
  Editor,
  EditorPosition,
  EditorRange,
  EditorSelection,
  EditorTransaction,
} from 'obsidian';
import { vi } from 'vitest';

export interface MockWorkspace extends Partial<Workspace> {
  getActiveViewOfType: ReturnType<typeof vi.fn>;
  getLeaf: ReturnType<typeof vi.fn>;
  getLeavesOfType: ReturnType<typeof vi.fn>;
  openLinkText: ReturnType<typeof vi.fn>;
  activeLeaf: WorkspaceLeaf | null;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  offref: ReturnType<typeof vi.fn>;
  trigger: ReturnType<typeof vi.fn>;
  tryTrigger: ReturnType<typeof vi.fn>;
}

export interface MockEditor extends Partial<Editor> {
  getValue: ReturnType<typeof vi.fn>;
  setValue: ReturnType<typeof vi.fn>;
  getLine: ReturnType<typeof vi.fn>;
  setLine: ReturnType<typeof vi.fn>;
  getCursor: ReturnType<typeof vi.fn>;
  setCursor: ReturnType<typeof vi.fn>;
  getSelection: ReturnType<typeof vi.fn>;
  setSelection: ReturnType<typeof vi.fn>;
  replaceRange: ReturnType<typeof vi.fn>;
  replaceSelection: ReturnType<typeof vi.fn>;
  transaction: ReturnType<typeof vi.fn>;
  undo: ReturnType<typeof vi.fn>;
  redo: ReturnType<typeof vi.fn>;
  exec: ReturnType<typeof vi.fn>;
  blur: ReturnType<typeof vi.fn>;
  focus: ReturnType<typeof vi.fn>;
  hasFocus: ReturnType<typeof vi.fn>;
  posToOffset: ReturnType<typeof vi.fn>;
  offsetToPos: ReturnType<typeof vi.fn>;
}

export function createMockWorkspace(overrides?: Partial<MockWorkspace>): MockWorkspace {
  const mockLeaf = createMockWorkspaceLeaf();

  const mockWorkspace: MockWorkspace = {
    activeLeaf: mockLeaf,
    getActiveViewOfType: vi.fn((type) => {
      if (type === MarkdownView && mockLeaf) {
        return mockLeaf.view;
      }
      return null;
    }),
    getLeaf: vi.fn((newLeaf) => {
      if (newLeaf) {
        return createMockWorkspaceLeaf();
      }
      return mockLeaf;
    }),
    getLeavesOfType: vi.fn((viewType) => {
      if (viewType === 'markdown') {
        return mockLeaf ? [mockLeaf] : [];
      }
      return [];
    }),
    openLinkText: vi.fn(async (linkText, sourcePath, newLeaf, openViewState) => {
      // Simulate opening a link
    }),
    on: vi.fn(),
    off: vi.fn(),
    offref: vi.fn(),
    trigger: vi.fn(),
    tryTrigger: vi.fn(),
    ...overrides,
  };

  return mockWorkspace;
}

export function createMockWorkspaceLeaf(overrides?: Partial<WorkspaceLeaf>): WorkspaceLeaf {
  const mockView = createMockMarkdownView();

  return {
    view: mockView,
    openFile: vi.fn(async (file, openViewState) => {
      // Simulate opening a file
    }),
    detach: vi.fn(),
    getViewState: vi.fn().mockReturnValue({ type: 'markdown', state: {} }),
    setViewState: vi.fn(async (viewState, eState) => {
      // Simulate setting view state
    }),
    getEphemeralState: vi.fn().mockReturnValue({}),
    setEphemeralState: vi.fn(),
    togglePinned: vi.fn(),
    setPinned: vi.fn(),
    setGroupMember: vi.fn(),
    ...overrides,
  } as unknown as WorkspaceLeaf;
}

export function createMockMarkdownView(overrides?: Partial<MarkdownView>): MarkdownView {
  const mockEditor = createMockEditor();
  const mockFile = {
    path: 'test.md',
    basename: 'test',
    extension: 'md',
  };

  return {
    editor: mockEditor,
    file: mockFile,
    getViewType: vi.fn().mockReturnValue('markdown'),
    getState: vi.fn().mockReturnValue({ file: 'test.md', mode: 'source' }),
    setState: vi.fn(async (state, result) => {
      // Simulate setting state
    }),
    getEphemeralState: vi.fn().mockReturnValue({}),
    setEphemeralState: vi.fn(),
    ...overrides,
  } as unknown as MarkdownView;
}

export function createMockEditor(initialContent = ''): MockEditor {
  let content = initialContent;
  let cursor: EditorPosition = { line: 0, ch: 0 };
  let selection: EditorSelection = {
    anchor: { line: 0, ch: 0 },
    head: { line: 0, ch: 0 },
  };

  const lines = content.split('\n');

  const mockEditor: MockEditor = {
    getValue: vi.fn(() => content),
    setValue: vi.fn((value) => {
      content = value;
      lines.splice(0, lines.length, ...value.split('\n'));
    }),
    getLine: vi.fn((line) => lines[line] || ''),
    setLine: vi.fn((line, text) => {
      if (line >= 0 && line < lines.length) {
        lines[line] = text;
        content = lines.join('\n');
      }
    }),
    getCursor: vi.fn((which) => cursor),
    setCursor: vi.fn((pos, ch) => {
      if (typeof pos === 'number' && typeof ch === 'number') {
        cursor = { line: pos, ch };
      } else if (typeof pos === 'object') {
        cursor = pos;
      }
    }),
    getSelection: vi.fn(() => {
      const { anchor, head } = selection;
      const start = posToOffset(content, anchor);
      const end = posToOffset(content, head);
      return content.substring(Math.min(start, end), Math.max(start, end));
    }),
    setSelection: vi.fn((anchor, head) => {
      selection = { anchor, head: head || anchor };
    }),
    replaceRange: vi.fn((replacement, from, to) => {
      const startOffset = posToOffset(content, from);
      const endOffset = to ? posToOffset(content, to) : startOffset;
      content = content.substring(0, startOffset) + replacement + content.substring(endOffset);
      lines.splice(0, lines.length, ...content.split('\n'));
    }),
    replaceSelection: vi.fn((replacement) => {
      const { anchor, head } = selection;
      const start = posToOffset(content, anchor);
      const end = posToOffset(content, head);
      const minOffset = Math.min(start, end);
      const maxOffset = Math.max(start, end);
      content = content.substring(0, minOffset) + replacement + content.substring(maxOffset);
      lines.splice(0, lines.length, ...content.split('\n'));
      const newPos = offsetToPos(content, minOffset + replacement.length);
      cursor = newPos;
      selection = { anchor: newPos, head: newPos };
    }),
    transaction: vi.fn((tx) => {
      // Simplified transaction handling
      if (tx.changes) {
        tx.changes.forEach((change: any) => {
          mockEditor.replaceRange(change.text, change.from, change.to);
        });
      }
    }),
    undo: vi.fn(),
    redo: vi.fn(),
    exec: vi.fn(),
    blur: vi.fn(),
    focus: vi.fn(),
    hasFocus: vi.fn().mockReturnValue(true),
    posToOffset: vi.fn((pos) => posToOffset(content, pos)),
    offsetToPos: vi.fn((offset) => offsetToPos(content, offset)),
  };

  return mockEditor;
}

// Helper functions for position/offset conversion
function posToOffset(content: string, pos: EditorPosition): number {
  const lines = content.split('\n');
  let offset = 0;
  for (let i = 0; i < pos.line && i < lines.length; i++) {
    offset += lines[i].length + 1; // +1 for newline
  }
  return offset + pos.ch;
}

function offsetToPos(content: string, offset: number): EditorPosition {
  const lines = content.split('\n');
  let currentOffset = 0;
  for (let line = 0; line < lines.length; line++) {
    const lineLength = lines[line].length;
    if (currentOffset + lineLength >= offset) {
      return { line, ch: offset - currentOffset };
    }
    currentOffset += lineLength + 1; // +1 for newline
  }
  return { line: lines.length - 1, ch: lines[lines.length - 1].length };
}
