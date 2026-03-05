import { Injectable, signal } from '@angular/core';
import { AppNotification } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly notificationsSignal = signal<AppNotification[]>([]);

  readonly notifications = this.notificationsSignal.asReadonly();

  show(
    notification: Omit<AppNotification, 'id'>,
    durationMs = notification.level === 'error' ? 7000 : 4000,
  ): void {
    const id = crypto.randomUUID();
    this.notificationsSignal.update((items) => [...items, { ...notification, id }]);

    window.setTimeout(() => this.dismiss(id), durationMs);
  }

  dismiss(id: string): void {
    this.notificationsSignal.update((items) => items.filter((item) => item.id !== id));
  }
}
