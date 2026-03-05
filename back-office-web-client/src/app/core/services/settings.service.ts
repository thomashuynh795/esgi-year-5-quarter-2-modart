import { Injectable, computed, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

interface SettingsSnapshot {
  apiBaseUrl: string;
  adminApiKey: string;
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly apiBaseUrlKey = 'demo.apiBaseUrl';
  private readonly adminApiKeyKey = 'demo.adminApiKey';
  private readonly settingsSignal = signal<SettingsSnapshot>(this.loadSettings());

  readonly apiBaseUrl = computed(() => this.settingsSignal().apiBaseUrl);
  readonly adminApiKey = computed(() => this.settingsSignal().adminApiKey);

  save(settings: SettingsSnapshot): void {
    const normalized = {
      apiBaseUrl: settings.apiBaseUrl.trim().replace(/\/+$/, ''),
      adminApiKey: settings.adminApiKey.trim(),
    };

    localStorage.setItem(this.apiBaseUrlKey, normalized.apiBaseUrl);
    localStorage.setItem(this.adminApiKeyKey, normalized.adminApiKey);
    this.settingsSignal.set(normalized);
  }

  resetDefaults(): void {
    localStorage.removeItem(this.apiBaseUrlKey);
    localStorage.removeItem(this.adminApiKeyKey);
    this.settingsSignal.set(this.loadSettings());
  }

  getSnapshot(): SettingsSnapshot {
    return this.settingsSignal();
  }

  private loadSettings(): SettingsSnapshot {
    return {
      apiBaseUrl: localStorage.getItem(this.apiBaseUrlKey) ?? environment.API_BASE_URL,
      adminApiKey: localStorage.getItem(this.adminApiKeyKey) ?? environment.ADMIN_API_KEY,
    };
  }
}
