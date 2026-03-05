import { Injectable, signal } from '@angular/core';
import { HistoryEntry } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private readonly storageKey = 'demo.requestHistory';
  private readonly maxEntries = 20;
  private readonly historySignal = signal<HistoryEntry[]>(this.load());

  readonly history = this.historySignal.asReadonly();

  add(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): void {
    const nextEntry: HistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };

    this.historySignal.update((items) => {
      const next = [nextEntry, ...items].slice(0, this.maxEntries);
      localStorage.setItem(this.storageKey, JSON.stringify(next));
      return next;
    });
  }

  private load(): HistoryEntry[] {
    const stored = localStorage.getItem(this.storageKey);

    if (!stored) {
      return [];
    }

    try {
      const parsed = JSON.parse(stored) as HistoryEntry[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
