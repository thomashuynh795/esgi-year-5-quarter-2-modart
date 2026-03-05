import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ApiClient } from '../../core/api/api-client.service';
import { ApiCallResult } from '../../core/models/api.models';
import { DemoStateService } from '../../core/services/demo-state.service';
import { NotificationService } from '../../core/services/notification.service';
import { JsonViewerComponent } from '../../shared/components/json-viewer.component';

@Component({
  selector: 'app-public-health',
  standalone: true,
  imports: [CommonModule, JsonViewerComponent],
  template: `
    <section class="space-y-6">
      <div>
        <h2 class="page-title">API Status</h2>
        <p class="page-subtitle">Check whether the authenticity platform is reachable and measure response time.</p>
      </div>

      <div class="card flex flex-wrap items-center gap-4">
        <button type="button" class="btn-primary" (click)="ping()">Check platform</button>
        @if (result()) {
          <div class="text-sm text-slate-600">
            <p>Status: {{ result()?.status }}</p>
            <p>Latency: {{ result()?.latencyMs }} ms</p>
          </div>
        }
      </div>

      @if (result()) {
        <app-json-viewer title="Platform status response" [value]="result()" />
      }
    </section>
  `,
})
export class PublicHealthComponent {
  private readonly apiClient = inject(ApiClient);
  private readonly demoState = inject(DemoStateService);
  private readonly notificationService = inject(NotificationService);

  protected readonly result = signal<ApiCallResult<string> | null>(null);

  protected ping(): void {
    this.apiClient.health().subscribe((result) => {
      this.result.set(result);
      this.demoState.lastHealthResult.set(result);

      if (result.ok) {
        this.notificationService.show({
          level: 'success',
          title: 'Platform reachable',
          message: `API responded in ${result.latencyMs} ms.`,
        });
      }
    });
  }
}
