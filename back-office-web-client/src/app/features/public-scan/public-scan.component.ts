import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiClient } from '../../core/api/api-client.service';
import { ApiCallResult } from '../../core/models/api.models';
import { DemoStateService } from '../../core/services/demo-state.service';
import { NotificationService } from '../../core/services/notification.service';
import { JsonViewerComponent } from '../../shared/components/json-viewer.component';

@Component({
  selector: 'app-public-scan',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, JsonViewerComponent],
  template: `
    <section class="space-y-6">
      <div>
        <h2 class="page-title">Public Scan Token</h2>
        <p class="page-subtitle">Use GET /v1/scan?pid=...&t=... from a form-friendly UI.</p>
      </div>

      <form class="card grid gap-4 md:grid-cols-2" [formGroup]="form" (ngSubmit)="submit()">
        <div>
          <label class="field-label" for="pid">Product code (pid)</label>
          <input id="pid" class="field-input" type="text" formControlName="pid" />
        </div>

        <div>
          <label class="field-label" for="token">Token (t)</label>
          <input id="token" class="field-input" type="text" formControlName="t" />
        </div>

        <div class="md:col-span-2">
          <button type="submit" class="btn-primary" [disabled]="form.invalid">Scan</button>
        </div>
      </form>

      @if (result()) {
        <div class="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div class="card">
            <p class="text-sm font-semibold text-white">Scan summary</p>
            <dl class="mt-4 grid gap-3 text-sm text-slate-300">
              <div class="flex items-center justify-between gap-3">
                <dt>Status</dt>
                <dd>{{ result()?.status }}</dd>
              </div>
              <div class="flex items-center justify-between gap-3">
                <dt>Latency</dt>
                <dd>{{ result()?.latencyMs }} ms</dd>
              </div>
              <div class="flex items-center justify-between gap-3">
                <dt>Result</dt>
                <dd>{{ extractResult(result()) }}</dd>
              </div>
            </dl>
          </div>

          <app-json-viewer title="Scan response" [value]="result()" />
        </div>
      }
    </section>
  `,
})
export class PublicScanComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly apiClient = inject(ApiClient);
  private readonly route = inject(ActivatedRoute);
  private readonly demoState = inject(DemoStateService);
  private readonly notificationService = inject(NotificationService);

  protected readonly form = this.formBuilder.nonNullable.group({
    pid: ['', Validators.required],
    t: ['', Validators.required],
  });
  protected readonly result = signal<ApiCallResult<unknown> | null>(null);

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const pid = params.get('pid');
      const token = params.get('t');

      if (pid || token) {
        this.form.patchValue({
          pid: pid ?? this.form.controls.pid.value,
          t: token ?? this.form.controls.t.value,
        });
      }
    });
  }

  protected submit(): void {
    const payload = this.form.getRawValue();
    this.apiClient.scan(payload.pid, payload.t).subscribe((result) => {
      this.result.set(result);
      this.demoState.lastScanResult.set(result);

      if (result.ok) {
        this.notificationService.show({
          level: 'success',
          title: 'Scan completed',
          message: `Result: ${this.extractResult(result)}.`,
        });
      }
    });
  }

  protected extractResult(result: unknown): string {
    const body = this.asRecord(result)?.['body'];
    const scanResult = this.asRecord(body)?.['result'];
    return typeof scanResult === 'string' ? scanResult : 'Unknown';
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  }
}
