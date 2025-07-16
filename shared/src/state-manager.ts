import { EventEmitter } from 'events';

export interface StateChange<T> {
  previousValue: T;
  currentValue: T;
  timestamp: Date;
}

export class StateManager<T extends Record<string, any>> extends EventEmitter {
  private state: T;
  private history: StateChange<T>[] = [];
  private maxHistorySize = 50;
  private subscribers: Map<keyof T, Set<(value: any) => void>> = new Map();

  constructor(initialState: T) {
    super();
    this.state = { ...initialState };
  }

  get<K extends keyof T>(key: K): T[K] {
    return this.state[key];
  }

  set<K extends keyof T>(key: K, value: T[K]): void {
    const previousValue = this.state[key];

    if (previousValue === value) {
      return; // No change
    }

    this.state[key] = value;

    // Record history
    this.recordHistory({ ...this.state }, previousValue);

    // Emit events
    this.emit('change', key, value, previousValue);
    this.emit(`change:${String(key)}`, value, previousValue);

    // Notify subscribers
    const subscribers = this.subscribers.get(key);
    if (subscribers) {
      subscribers.forEach((callback) => callback(value));
    }
  }

  update(updates: Partial<T>): void {
    const previousState = { ...this.state };
    let hasChanges = false;

    Object.entries(updates).forEach(([key, value]) => {
      if (this.state[key as keyof T] !== value) {
        hasChanges = true;
        this.state[key as keyof T] = value;

        // Emit individual property changes
        this.emit(`change:${key}`, value, previousState[key as keyof T]);

        // Notify subscribers
        const subscribers = this.subscribers.get(key as keyof T);
        if (subscribers) {
          subscribers.forEach((callback) => callback(value));
        }
      }
    });

    if (hasChanges) {
      this.recordHistory(previousState, this.state);
      this.emit('update', this.state, previousState);
    }
  }

  getState(): T {
    return { ...this.state };
  }

  setState(newState: T): void {
    const previousState = { ...this.state };
    this.state = { ...newState };

    this.recordHistory(previousState, this.state);
    this.emit('setState', this.state, previousState);
  }

  subscribe<K extends keyof T>(key: K, callback: (value: T[K]) => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }

    const keySubscribers = this.subscribers.get(key);
    if (keySubscribers) {
      keySubscribers.add(callback);
    }

    // Return unsubscribe function
    return () => {
      const subscribers = this.subscribers.get(key);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.subscribers.delete(key);
        }
      }
    };
  }

  private recordHistory(previousState: any, currentState: any): void {
    this.history.push({
      previousValue: previousState,
      currentValue: currentState,
      timestamp: new Date(),
    });

    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  getHistory(): StateChange<T>[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }

  reset(initialState: T): void {
    const previousState = { ...this.state };
    this.state = { ...initialState };
    this.history = [];
    this.emit('reset', this.state, previousState);
  }
}

// Persisted state manager that saves to localStorage
export class PersistedStateManager<T extends Record<string, any>> extends StateManager<T> {
  private storageKey: string;
  private saveDebounceTimer: NodeJS.Timeout | null = null;
  private saveDelay = 500; // ms

  constructor(storageKey: string, initialState: T) {
    // Load from storage or use initial state
    const savedState = PersistedStateManager.loadFromStorage<T>(storageKey);
    super(savedState || initialState);

    this.storageKey = storageKey;

    // Save on changes
    this.on('update', () => this.scheduleSave());
    this.on('setState', () => this.scheduleSave());
  }

  private scheduleSave(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }

    this.saveDebounceTimer = setTimeout(() => {
      this.saveToStorage();
    }, this.saveDelay);
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.getState()));
    } catch (e) {
      console.error('Failed to save state to localStorage:', e);
    }
  }

  private static loadFromStorage<T>(storageKey: string): T | null {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Failed to load state from localStorage:', e);
      return null;
    }
  }

  clear(): void {
    localStorage.removeItem(this.storageKey);
    this.clearHistory();
  }
}

// Computed values helper
export class ComputedValue<T extends Record<string, any>, D> {
  private computation: (state: T) => D;
  private stateManager: StateManager<T>;
  private cache: D | undefined;
  private dependencies: (keyof T)[];
  private isValid = false;

  constructor(
    stateManager: StateManager<T>,
    computation: (state: T) => D,
    dependencies: (keyof T)[]
  ) {
    this.stateManager = stateManager;
    this.computation = computation;
    this.dependencies = dependencies;

    // Subscribe to dependency changes
    dependencies.forEach((dep) => {
      stateManager.on(`change:${String(dep)}`, () => {
        this.isValid = false;
      });
    });
  }

  get value(): D {
    if (!this.isValid) {
      this.cache = this.computation(this.stateManager.getState());
      this.isValid = true;
    }
    return this.cache as D;
  }

  invalidate(): void {
    this.isValid = false;
  }
}
