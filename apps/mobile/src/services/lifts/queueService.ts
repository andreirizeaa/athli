import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoadingLiftData } from '../../types/Lifts';

const QUEUE_KEY = 'liftProcessingQueue';

export interface QueueItem {
  id: string;
  liftData: Omit<LoadingLiftData, 'id' | 'isComplete' | 'status' | 'pipelineStage'>;
  addedAt: number;
  priority: number; // Lower number = higher priority
  ref?: string; // Reference to the waiting card ID for reliable matching
}

export interface QueueState {
  items: QueueItem[];
  currentProcessingId: string | null;
  lastProcessedAt: number | null;
}

class QueueService {
  private queueState: QueueState = {
    items: [],
    currentProcessingId: null,
    lastProcessedAt: null,
  };

  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private async loadFromStorage() {
    try {
      const stored = await AsyncStorage.getItem(QUEUE_KEY);
      if (stored) {
        this.queueState = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load queue from storage:', error);
    }
  }

  private async saveToStorage() {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queueState));
    } catch (error) {
      console.warn('Failed to save queue to storage:', error);
    }
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener());
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async addToQueue(
    liftData: Omit<LoadingLiftData, 'id' | 'isComplete' | 'status' | 'pipelineStage'> & {
      ref?: string;
    }
  ): Promise<string> {
    const queueId = `queue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const queueItem: QueueItem = {
      id: queueId,
      liftData: liftData,
      addedAt: Date.now(),
      priority: this.queueState.items.length, // FIFO order
      ref: liftData.ref,
    };

    this.queueState.items.push(queueItem);
    await this.saveToStorage();
    this.notifyListeners();

    return queueId;
  }

  async removeFromQueue(queueId: string) {
    this.queueState.items = this.queueState.items.filter((item) => item.id !== queueId);
    await this.saveToStorage();
    this.notifyListeners();
  }

  async getNextInQueue(): Promise<QueueItem | null> {
    // Reset processing flag if the referenced item no longer exists
    if (
      this.queueState.currentProcessingId &&
      !this.queueState.items.find((i) => i.id === this.queueState.currentProcessingId)
    ) {
      this.queueState.currentProcessingId = null;
      await this.saveToStorage();
    }

    if (this.queueState.currentProcessingId) {
      return null; // Something is already processing
    }

    const nextItem = this.queueState.items.sort((a, b) => a.priority - b.priority)[0];

    if (nextItem) {
      this.queueState.currentProcessingId = nextItem.id;
      this.queueState.lastProcessedAt = Date.now();
      await this.saveToStorage();
    }

    return nextItem || null;
  }

  async markProcessingComplete(queueId: string) {
    if (this.queueState.currentProcessingId === queueId) {
      this.queueState.currentProcessingId = null;
      await this.saveToStorage();
      this.notifyListeners();
    }
  }

  async markProcessingError(queueId: string) {
    if (this.queueState.currentProcessingId === queueId) {
      this.queueState.currentProcessingId = null;
      await this.saveToStorage();
      this.notifyListeners();
    }
  }

  getQueueState(): QueueState {
    return { ...this.queueState };
  }

  getWaitingItems(): QueueItem[] {
    return this.queueState.items.filter((item) => item.id !== this.queueState.currentProcessingId);
  }

  getCurrentProcessingId(): string | null {
    return this.queueState.currentProcessingId;
  }

  isQueueEmpty(): boolean {
    return this.queueState.items.length === 0;
  }

  hasWaitingItems(): boolean {
    return this.getWaitingItems().length > 0;
  }

  async clearQueue() {
    this.queueState = {
      items: [],
      currentProcessingId: null,
      lastProcessedAt: null,
    };
    await this.saveToStorage();
    this.notifyListeners();
  }
}

export const queueService = new QueueService();
