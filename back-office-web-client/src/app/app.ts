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
      links: [{ label: 'Dashboard', path: '/dashboard' }],
    },
    {
      label: 'Public',
      links: [
        { label: 'Health', path: '/public/health' },
        { label: 'Verify (CMAC)', path: '/public/verify' },
        { label: 'Scan (Token)', path: '/public/scan' },
      ],
    },
    {
      label: 'Admin',
      links: [
        { label: 'Enroll Tag', path: '/admin/enroll' },
        { label: 'Next Messages', path: '/admin/next-messages' },
        { label: 'Revoke Tag', path: '/admin/revoke-tag' },
        { label: 'Rotate Key', path: '/admin/rotate-key' },
        { label: 'Reconfigure Tag', path: '/admin/reconfigure-tag' },
        { label: 'Generate Scan Tokens', path: '/admin/generate-scan-tokens' },
        { label: 'Revoke Scan Token', path: '/admin/revoke-scan-token' },
      ],
    },
    {
      label: 'Config',
      links: [{ label: 'Settings', path: '/settings' }],
    },
  ] as const;
  protected readonly loadingLabel = computed(() =>
    this.isLoading() ? 'Request in progress' : 'Idle',
  );

  protected closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  protected dismissNotification(id: string): void {
    this.notificationService.dismiss(id);
  }
}
