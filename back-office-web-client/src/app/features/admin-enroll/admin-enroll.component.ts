import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiClient } from '../../core/api/api-client.service';
import { EnrollRequest, TagMode } from '../../core/models/api.models';
import { DemoStateService } from '../../core/services/demo-state.service';
import { NotificationService } from '../../core/services/notification.service';
import { JsonViewerComponent } from '../../shared/components/json-viewer.component';

@Component({
  selector: 'app-admin-enroll',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, JsonViewerComponent],
  template: `
    <section class="space-y-6">
      <div>
        <h2 class="page-title">Create a Garment and Link a Tag</h2>
        <p class="page-subtitle">
          Create a new (USE)LESS garment record and attach a physical NFC tag to it.
        </p>
      </div>

      <form class="card grid gap-4 md:grid-cols-2" [formGroup]="form">
        <div>
          <label class="field-label" for="tag_uid">Physical NFC tag UID</label>
          <input id="tag_uid" class="field-input" type="text" formControlName="tag_uid" />
        </div>
        <div>
          <label class="field-label" for="product_code">Garment reference</label>
          <input id="product_code" class="field-input" type="text" formControlName="product_code" />
        </div>
        <div>
          <label class="field-label" for="size">Garment size</label>
          <input id="size" class="field-input" type="text" formControlName="size" />
        </div>
        <div>
          <label class="field-label" for="color">Garment color</label>
          <input id="color" class="field-input" type="text" formControlName="color" />
        </div>
        <div class="md:col-span-2">
          <label class="field-label" for="mode">Authentication mode</label>
          <select id="mode" class="field-input" formControlName="mode">
            <option *ngFor="let option of modeOptions" [value]="option.value">{{ option.label }}</option>
          </select>
        </div>

        <div class="md:col-span-2 flex flex-wrap gap-3">
          <button type="button" class="btn-primary" [disabled]="form.invalid" (click)="submit('enroll')">
            Create garment
          </button>
          <button type="button" class="btn-secondary" [disabled]="form.invalid" (click)="submit('provision')">
            Create via alias route
          </button>
        </div>
      </form>

      @if (result()) {
        <app-json-viewer title="Garment creation response" [value]="result()" />
      }
    </section>
  `,
})
export class AdminEnrollComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly apiClient = inject(ApiClient);
  private readonly demoState = inject(DemoStateService);
  private readonly notificationService = inject(NotificationService);

  protected readonly modeOptions: ReadonlyArray<{ value: TagMode; label: string }> = [
    { value: 'dynamic_cmac', label: 'DYNAMIC CMAC' },
    { value: 'one_time_tokens', label: 'ONE TIME TOKENS' },
  ];
  protected readonly form = this.formBuilder.nonNullable.group({
    tag_uid: ['', Validators.required],
    product_code: ['', Validators.required],
    size: ['', Validators.required],
    color: ['', Validators.required],
    mode: ['dynamic_cmac' as TagMode, Validators.required],
  });
  protected readonly result = signal<unknown | null>(null);

  protected submit(target: 'enroll' | 'provision'): void {
    const payload = this.form.getRawValue() as EnrollRequest;
    const request$ = target === 'enroll' ? this.apiClient.enroll(payload) : this.apiClient.provision(payload);

    request$.subscribe((result) => {
      this.result.set(result);

      const tagId = this.readStringField(result, 'tag_id');
      if (tagId) {
        this.demoState.setCurrentTagId(tagId);
      }

      if (result.ok) {
        this.notificationService.show({
          level: 'success',
          title: target === 'enroll' ? 'Garment created' : 'Garment created via alias',
          message: tagId ? `Current linked tag saved as ${tagId}.` : 'Request succeeded.',
        });
      }
    });
  }

  private readStringField(result: unknown, fieldName: string): string {
    const body = this.asRecord(this.asRecord(result)?.['body']);
    const value = body?.[fieldName];
    return typeof value === 'string' ? value : '';
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  }
}
