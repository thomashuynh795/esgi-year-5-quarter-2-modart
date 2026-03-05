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
        <h2 class="page-title">Admin Enroll Tag</h2>
        <p class="page-subtitle">
          Test both POST /admin/tags/enroll and the /provision alias with the same payload.
        </p>
      </div>

      <form class="card grid gap-4 md:grid-cols-2" [formGroup]="form">
        <div>
          <label class="field-label" for="tag_uid">Tag UID</label>
          <input id="tag_uid" class="field-input" type="text" formControlName="tag_uid" />
        </div>
        <div>
          <label class="field-label" for="product_code">Product code</label>
          <input id="product_code" class="field-input" type="text" formControlName="product_code" />
        </div>
        <div>
          <label class="field-label" for="size">Size</label>
          <input id="size" class="field-input" type="text" formControlName="size" />
        </div>
        <div>
          <label class="field-label" for="color">Color</label>
          <input id="color" class="field-input" type="text" formControlName="color" />
        </div>
        <div class="md:col-span-2">
          <label class="field-label" for="mode">Mode</label>
          <select id="mode" class="field-input" formControlName="mode">
            <option *ngFor="let option of modes" [value]="option">{{ option }}</option>
          </select>
        </div>

        <div class="md:col-span-2 flex flex-wrap gap-3">
          <button type="button" class="btn-primary" [disabled]="form.invalid" (click)="submit('enroll')">
            Enroll
          </button>
          <button type="button" class="btn-secondary" [disabled]="form.invalid" (click)="submit('provision')">
            Provision alias
          </button>
        </div>
      </form>

      @if (result()) {
        <app-json-viewer title="Enroll response" [value]="result()" />
      }
    </section>
  `,
})
export class AdminEnrollComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly apiClient = inject(ApiClient);
  private readonly demoState = inject(DemoStateService);
  private readonly notificationService = inject(NotificationService);

  protected readonly modes: TagMode[] = ['dynamic_cmac', 'one_time_tokens'];
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
          title: target === 'enroll' ? 'Tag enrolled' : 'Tag provisioned',
          message: tagId ? `Current tag updated to ${tagId}.` : 'Request succeeded.',
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
