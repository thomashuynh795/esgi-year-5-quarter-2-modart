import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiClient } from '../../core/api/api-client.service';
import { TagMode } from '../../core/models/api.models';
import { DemoStateService } from '../../core/services/demo-state.service';
import { NotificationService } from '../../core/services/notification.service';
import { JsonViewerComponent } from '../../shared/components/json-viewer.component';

@Component({
  selector: 'app-admin-reconfigure',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, JsonViewerComponent],
  template: `
    <section class="space-y-6">
      <div>
        <h2 class="page-title">Admin Reconfigure Tag</h2>
        <p class="page-subtitle">Call POST /admin/tags/:tag_id/reconfigure with the chosen mode payload.</p>
      </div>

      <form class="card grid gap-4 md:grid-cols-2" [formGroup]="form" (ngSubmit)="submit()">
        <div class="md:col-span-2">
          <label class="field-label" for="tag_id">Tag ID</label>
          <input id="tag_id" class="field-input" type="text" formControlName="tag_id" />
        </div>
        <div class="md:col-span-2">
          <label class="field-label" for="mode">Mode</label>
          <select id="mode" class="field-input" formControlName="mode">
            <option *ngFor="let option of modes" [value]="option">{{ option }}</option>
          </select>
        </div>

        @if (form.controls.mode.value === 'dynamic_cmac') {
          <label class="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
            <input type="checkbox" formControlName="reset_counter" />
            Reset counter
          </label>
          <label class="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
            <input type="checkbox" formControlName="rotate_key" />
            Rotate key
          </label>
        } @else {
          <label class="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-200 md:col-span-2">
            <input type="checkbox" formControlName="revoke_existing_batch" />
            Revoke existing batch
          </label>

          <div>
            <label class="field-label" for="token_count">Token count</label>
            <input id="token_count" class="field-input" type="number" formControlName="token_count" />
          </div>

          <div>
            <label class="field-label" for="ttl_seconds">TTL seconds</label>
            <input id="ttl_seconds" class="field-input" type="number" formControlName="ttl_seconds" />
          </div>
        }

        <div class="md:col-span-2">
          <button type="submit" class="btn-primary" [disabled]="form.invalid">Reconfigure</button>
        </div>
      </form>

      @if (result()) {
        <app-json-viewer title="Reconfigure response" [value]="result()" />
      }
    </section>
  `,
})
export class AdminReconfigureComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly apiClient = inject(ApiClient);
  private readonly demoState = inject(DemoStateService);
  private readonly notificationService = inject(NotificationService);

  protected readonly modes: TagMode[] = ['dynamic_cmac', 'one_time_tokens'];
  protected readonly form = this.formBuilder.nonNullable.group({
    tag_id: [this.demoState.currentTagId(), Validators.required],
    mode: ['dynamic_cmac' as TagMode, Validators.required],
    reset_counter: [false],
    rotate_key: [false],
    revoke_existing_batch: [true],
    token_count: [5, [Validators.required, Validators.min(1)]],
    ttl_seconds: [3600, [Validators.required, Validators.min(1)]],
  });
  protected readonly result = signal<unknown | null>(null);

  protected submit(): void {
    const rawValue = this.form.getRawValue();
    const payload =
      rawValue.mode === 'dynamic_cmac'
        ? {
            reset_counter: rawValue.reset_counter,
            rotate_key: rawValue.rotate_key,
          }
        : {
            revoke_existing_batch: rawValue.revoke_existing_batch,
            token_count: rawValue.token_count,
            ttl_seconds: rawValue.ttl_seconds,
          };

    this.apiClient.reconfigureTag(rawValue.tag_id, payload).subscribe((result) => {
      this.result.set(result);

      if (result.ok) {
        this.notificationService.show({
          level: 'success',
          title: 'Tag reconfigured',
          message: `Mode: ${rawValue.mode}.`,
        });
      }
    });
  }
}
