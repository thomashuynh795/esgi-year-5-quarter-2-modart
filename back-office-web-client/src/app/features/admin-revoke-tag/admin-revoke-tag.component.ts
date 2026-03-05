import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiClient } from '../../core/api/api-client.service';
import { DemoStateService } from '../../core/services/demo-state.service';
import { NotificationService } from '../../core/services/notification.service';
import { JsonViewerComponent } from '../../shared/components/json-viewer.component';

@Component({
  selector: 'app-admin-revoke-tag',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, JsonViewerComponent],
  template: `
    <section class="space-y-6">
      <div>
        <h2 class="page-title">Disable a Garment Tag</h2>
        <p class="page-subtitle">Block a linked garment tag so it can no longer authenticate successfully.</p>
      </div>

      <form class="card space-y-4" [formGroup]="form" (ngSubmit)="submit()">
        <div>
          <label class="field-label" for="tag_id">Linked tag ID</label>
          <input id="tag_id" class="field-input" type="text" formControlName="tag_id" />
        </div>

        <button type="submit" class="btn-primary" [disabled]="form.invalid">Disable tag</button>
      </form>

      @if (result()) {
        <app-json-viewer title="Tag disable response" [value]="result()" />
      }
    </section>
  `,
})
export class AdminRevokeTagComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly apiClient = inject(ApiClient);
  private readonly demoState = inject(DemoStateService);
  private readonly notificationService = inject(NotificationService);

  protected readonly form = this.formBuilder.nonNullable.group({
    tag_id: [this.demoState.currentTagId(), Validators.required],
  });
  protected readonly result = signal<unknown | null>(null);

  protected submit(): void {
    this.apiClient.revokeTag(this.form.controls.tag_id.value).subscribe((result) => {
      this.result.set(result);

      if (result.ok) {
        this.notificationService.show({
          level: 'success',
          title: 'Tag disabled',
          message: 'The linked garment tag is now blocked.',
        });
      }
    });
  }
}
