import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NotificationService } from './core/services/notification.service';
import { LoadingService } from './core/services/loading.service';
import { SettingsService } from './core/services/settings.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly notificationService = inject(NotificationService);
  private readonly loadingService = inject(LoadingService);
  private readonly settingsService = inject(SettingsService);

  protected readonly sidebarOpen = signal(false);
  protected readonly notifications = this.notificationService.notifications;
  protected readonly isLoading = this.loadingService.isLoading;
  protected readonly apiBaseUrl = this.settingsService.apiBaseUrl;
  protected readonly navSections = [
    {
      label: 'Overview',
      links: [{ label: 'Control Center', path: '/dashboard' }],
    },
    {
      label: 'Customer Flows',
      links: [
        { label: 'API Status', path: '/public/health' },
        { label: 'Authenticate a Tag', path: '/public/verify' },
        { label: 'Customer Scan Link', path: '/public/scan' },
      ],
    },
    {
      label: '(USE)LESS Ops',
      links: [
        { label: 'Create Garment + Tag', path: '/admin/enroll' },
        { label: 'Prepare Tag Proofs', path: '/admin/next-messages' },
        { label: 'Disable Garment Tag', path: '/admin/revoke-tag' },
        { label: 'Renew Tag Secret', path: '/admin/rotate-key' },
        { label: 'Change Auth Mode', path: '/admin/reconfigure-tag' },
        { label: 'Create Customer Links', path: '/admin/generate-scan-tokens' },
        { label: 'Disable Customer Link', path: '/admin/revoke-scan-token' },
      ],
    },
    {
      label: 'Workspace',
      links: [{ label: 'Settings', path: '/settings' }],
    },
  ] as const;
  protected readonly loadingLabel = computed(() =>
    this.isLoading() ? 'Request in progress' : 'Ready',
  );

  protected closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  protected dismissNotification(id: string): void {
    this.notificationService.dismiss(id);
  }
}
