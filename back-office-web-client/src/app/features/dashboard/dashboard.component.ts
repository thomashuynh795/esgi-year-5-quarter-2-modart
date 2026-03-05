import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { DemoStateService } from '../../core/services/demo-state.service';
import { HistoryService } from '../../core/services/history.service';
import { JsonViewerComponent } from '../../shared/components/json-viewer.component';
import { RequestHistoryComponent } from '../../shared/components/request-history.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, JsonViewerComponent, RequestHistoryComponent],
  template: `
    <section class="space-y-6">
      <div>
        <h2 class="page-title">Dashboard</h2>
        <p class="page-subtitle">
          Quick view of the latest public checks plus the local request history.
        </p>
      </div>

      <div class="grid gap-4 xl:grid-cols-3">
        <div class="card">
          <p class="text-sm font-semibold text-white">Last health check</p>
          <p class="mt-3 text-sm text-slate-400">
            {{ demoState.lastHealthResult() ? 'A ping result is available.' : 'No health request yet.' }}
          </p>
        </div>
        <div class="card">
          <p class="text-sm font-semibold text-white">Last verify result</p>
          <p class="mt-3 text-sm text-slate-400">
            {{ demoState.lastVerifyResult() ? 'Latest /verify response stored.' : 'No verify request yet.' }}
          </p>
        </div>
        <div class="card">
          <p class="text-sm font-semibold text-white">Last scan result</p>
          <p class="mt-3 text-sm text-slate-400">
            {{ demoState.lastScanResult() ? 'Latest /v1/scan response stored.' : 'No scan request yet.' }}
          </p>
        </div>
      </div>

      <div class="grid gap-6 xl:grid-cols-3">
        <app-json-viewer
          title="Health summary"
          [value]="demoState.lastHealthResult()"
        />
        <app-json-viewer
          title="Verify summary"
          [value]="demoState.lastVerifyResult()"
        />
        <app-json-viewer
          title="Scan summary"
          [value]="demoState.lastScanResult()"
        />
      </div>

      <app-request-history [entries]="historyService.history()" />
    </section>
  `,
})
export class DashboardComponent {
  protected readonly demoState = inject(DemoStateService);
  protected readonly historyService = inject(HistoryService);
}
