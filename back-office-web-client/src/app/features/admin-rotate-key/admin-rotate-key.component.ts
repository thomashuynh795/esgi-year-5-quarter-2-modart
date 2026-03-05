import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiClient } from '../../core/api/api-client.service';
import { DemoStateService } from '../../core/services/demo-state.service';
import { NotificationService } from '../../core/services/notification.service';
import { JsonViewerComponent } from '../../shared/components/json-viewer.component';

@Component({
  selector: 'app-admin-rotate-key',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, JsonViewerComponent],
  template: `
    <section class="space-y-6">
      <div>
        <h2 class="page-title">Admin Rotate Key</h2>
        <p class="page-subtitle">Call POST /admin/tags/:tag_id/rotate-key.</p>
      </div>

      <form class="card space-y-4" [formGroup]="form" (ngSubmit)="submit()">
        <div>
          <label class="field-label" for="tag_id">Tag ID</label>
          <input id="tag_id" class="field-input" type="text" formControlName="tag_id" />
        </div>

        <button type="submit" class="btn-primary" [disabled]="form.invalid">Rotate</button>
      </form>

      @if (result()) {
        <div class="card flex flex-wrap items-center justify-between gap-4">
          <div>
            <p class="text-sm font-semibold text-white">Rotation completed</p>
            <p class="mt-1 text-sm text-slate-300">
              New key version: {{ readNewKeyVersion(result()) }}
            </p>
          </div>
          <button type="button" class="btn-secondary" (click)="goToNextMessages()">
            Generate Next Messages
          </button>
        </div>

        <app-json-viewer title="Rotate key response" [value]="result()" />
      }
    </section>
  `,
})
export class AdminRotateKeyComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly apiClient = inject(ApiClient);
  private readonly demoState = inject(DemoStateService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly form = this.formBuilder.nonNullable.group({
    tag_id: [this.demoState.currentTagId(), Validators.required],
  });
  protected readonly result = signal<unknown | null>(null);

  protected submit(): void {
    this.apiClient.rotateKey(this.form.controls.tag_id.value).subscribe((result) => {
      this.result.set(result);

      if (result.ok) {
        this.notificationService.show({
          level: 'success',
          title: 'Key rotated',
          message: `New version: ${this.readNewKeyVersion(result)}.`,
        });
      }
    });
  }

  protected goToNextMessages(): void {
    void this.router.navigate(['/admin/next-messages'], {
      queryParams: { tag_id: this.form.controls.tag_id.value },
    });
  }

  protected readNewKeyVersion(result: unknown): string {
    const body = this.asRecord(this.asRecord(result)?.['body']);
    const value = body?.['new_key_version'];
    return typeof value === 'number' ? String(value) : 'Unknown';
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  }
}
