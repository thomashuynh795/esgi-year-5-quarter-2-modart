import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiClient } from '../../core/api/api-client.service';
import { DemoStateService } from '../../core/services/demo-state.service';
import { NotificationService } from '../../core/services/notification.service';
import { JsonViewerComponent } from '../../shared/components/json-viewer.component';

@Component({
  selector: 'app-admin-revoke-scan-token',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, JsonViewerComponent],
  template: `
    <section class="space-y-6">
      <div>
        <h2 class="page-title">Disable a Customer Link</h2>
        <p class="page-subtitle">Deactivate a previously issued customer authenticity link.</p>
      </div>

      <form class="card space-y-4" [formGroup]="form" (ngSubmit)="submit()">
        <div>
          <label class="field-label" for="token_id">Customer link ID</label>
          <input id="token_id" class="field-input" type="text" formControlName="token_id" />
        </div>

        <button type="submit" class="btn-primary" [disabled]="form.invalid">Disable link</button>
      </form>

      @if (result()) {
        <app-json-viewer title="Customer link disable response" [value]="result()" />
      }
    </section>
  `,
})
export class AdminRevokeScanTokenComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly apiClient = inject(ApiClient);
  private readonly demoState = inject(DemoStateService);
  private readonly notificationService = inject(NotificationService);

  protected readonly form = this.formBuilder.nonNullable.group({
    token_id: [this.demoState.currentScanTokenId(), Validators.required],
  });
  protected readonly result = signal<unknown | null>(null);

  protected submit(): void {
    this.apiClient.revokeScanToken(this.form.controls.token_id.value).subscribe((result) => {
      this.result.set(result);

      if (result.ok) {
        this.notificationService.show({
          level: 'success',
          title: 'Customer link disabled',
          message: 'The selected customer link is now inactive.',
        });
      }
    });
  }
}
