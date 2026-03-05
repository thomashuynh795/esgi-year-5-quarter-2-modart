import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiClient } from '../../core/api/api-client.service';
import { ApiCallResult, VerifyRequest } from '../../core/models/api.models';
import { DemoStateService } from '../../core/services/demo-state.service';
import { NotificationService } from '../../core/services/notification.service';
import { JsonViewerComponent } from '../../shared/components/json-viewer.component';

@Component({
  selector: 'app-public-verify',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, JsonViewerComponent],
  template: `
    <section class="space-y-6">
      <div>
        <h2 class="page-title">Public Verify (CMAC)</h2>
        <p class="page-subtitle">Send POST /verify and optionally replay the exact same payload.</p>
      </div>

      <form class="card grid gap-4 md:grid-cols-3" [formGroup]="form" (ngSubmit)="submit()">
        <div class="md:col-span-3">
          <label class="field-label" for="tag_uid">Tag UID</label>
          <input id="tag_uid" class="field-input" type="text" formControlName="tag_uid" />
        </div>

        <div>
          <label class="field-label" for="counter">Counter</label>
          <input id="counter" class="field-input" type="number" formControlName="counter" />
        </div>

        <div class="md:col-span-2">
          <label class="field-label" for="cmac">CMAC (hex)</label>
          <input id="cmac" class="field-input" type="text" formControlName="cmac" />
        </div>

        <div class="md:col-span-3 flex flex-wrap gap-3">
          <button type="submit" class="btn-primary" [disabled]="form.invalid">Verify</button>
          <button
            type="button"
            class="btn-secondary"
            [disabled]="!lastPayload()"
            (click)="replay()"
          >
            Replay same request
          </button>
        </div>
      </form>

      @if (result()) {
        <div class="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div class="card">
            <p class="text-sm font-semibold text-white">Verify summary</p>
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
                <dt>Verdict</dt>
                <dd>{{ extractVerdict(result()) }}</dd>
              </div>
            </dl>
          </div>

          <app-json-viewer title="Verify response" [value]="result()" />
        </div>
      }
    </section>
  `,
})
export class PublicVerifyComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly apiClient = inject(ApiClient);
  private readonly route = inject(ActivatedRoute);
  private readonly demoState = inject(DemoStateService);
  private readonly notificationService = inject(NotificationService);

  protected readonly form = this.formBuilder.nonNullable.group({
    tag_uid: ['', Validators.required],
    counter: [0, [Validators.required, Validators.min(0)]],
    cmac: ['', Validators.required],
  });
  protected readonly result = signal<ApiCallResult<unknown> | null>(null);
  protected readonly lastPayload = signal<VerifyRequest | null>(null);

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const tagUid = params.get('tag_uid');
      const cmac = params.get('cmac');
      const counter = params.get('counter');

      if (tagUid || cmac || counter) {
        this.form.patchValue({
          tag_uid: tagUid ?? this.form.controls.tag_uid.value,
          cmac: cmac ?? this.form.controls.cmac.value,
          counter: counter ? Number(counter) : this.form.controls.counter.value,
        });
      }
    });
  }

  protected submit(): void {
    const payload = this.form.getRawValue();
    this.lastPayload.set(payload);

    this.apiClient.verify(payload).subscribe((result) => {
      this.result.set(result);
      this.demoState.lastVerifyResult.set(result);

      if (result.ok) {
        this.notificationService.show({
          level: 'success',
          title: 'Verify completed',
          message: `Verdict: ${this.extractVerdict(result)}.`,
        });
      }
    });
  }

  protected replay(): void {
    const payload = this.lastPayload();
    if (!payload) {
      return;
    }

    this.apiClient.verify(payload).subscribe((result) => {
      this.result.set(result);
      this.demoState.lastVerifyResult.set(result);
    });
  }

  protected extractVerdict(result: unknown): string {
    const body = this.asRecord(result)?.['body'];
    const verdict = this.asRecord(body)?.['verdict'];
    return typeof verdict === 'string' ? verdict : 'Unknown';
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  }
}
