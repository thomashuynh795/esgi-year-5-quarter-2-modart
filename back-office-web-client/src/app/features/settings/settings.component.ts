import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SettingsService } from '../../core/services/settings.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="space-y-6">
      <div>
        <h2 class="page-title">Workspace Settings</h2>
        <p class="page-subtitle">
          Update the API endpoint and the demo admin key used by the (USE)LESS operations console.
        </p>
      </div>

      <div class="rounded-3xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm text-amber-100">
        Demo warning: the admin key is intentionally stored in the browser and visible in local storage.
      </div>

      <form class="card space-y-4" [formGroup]="form" (ngSubmit)="save()">
        <div>
          <label class="field-label" for="api_base_url">API endpoint</label>
          <input id="api_base_url" class="field-input" type="url" formControlName="apiBaseUrl" />
        </div>

        <div>
          <label class="field-label" for="admin_api_key">Demo admin key</label>
          <input id="admin_api_key" class="field-input" type="text" formControlName="adminApiKey" />
        </div>

        <div class="flex flex-wrap gap-3">
          <button type="submit" class="btn-primary" [disabled]="form.invalid">Save</button>
          <button type="button" class="btn-secondary" (click)="reset()">Reset defaults</button>
        </div>
      </form>
    </section>
  `,
})
export class SettingsComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly settingsService = inject(SettingsService);
  private readonly notificationService = inject(NotificationService);

  protected readonly form = this.formBuilder.nonNullable.group({
    apiBaseUrl: [this.settingsService.apiBaseUrl(), [Validators.required]],
    adminApiKey: [this.settingsService.adminApiKey()],
  });

  protected save(): void {
    this.settingsService.save(this.form.getRawValue());
    this.notificationService.show({
      level: 'success',
      title: 'Workspace settings saved',
      message: 'New requests will use the updated values.',
    });
  }

  protected reset(): void {
    this.settingsService.resetDefaults();
    this.form.reset(this.settingsService.getSnapshot());
    this.notificationService.show({
      level: 'info',
      title: 'Default settings restored',
      message: 'Workspace settings were reset to environment defaults.',
    });
  }
}
