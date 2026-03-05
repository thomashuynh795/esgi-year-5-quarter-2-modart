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
        <h2 class="page-title">(USE)LESS Control Center</h2>
        <p class="page-subtitle">
          Quick view of platform status, latest authenticity checks and local operations history.
        </p>
      </div>

      <div class="grid gap-4 xl:grid-cols-3">
        <div class="card">
          <p class="text-sm font-semibold text-slate-900">API platform status</p>
          <p class="mt-3 text-sm text-slate-400">
            {{ demoState.lastHealthResult() ? 'A recent status check is available.' : 'No status check yet.' }}
          </p>
        </div>
        <div class="card">
          <p class="text-sm font-semibold text-slate-900">Latest tag authentication</p>
          <p class="mt-3 text-sm text-slate-400">
            {{ demoState.lastVerifyResult() ? 'A garment authenticity result is stored.' : 'No tag authentication yet.' }}
          </p>
        </div>
        <div class="card">
          <p class="text-sm font-semibold text-slate-900">Latest customer scan</p>
          <p class="mt-3 text-sm text-slate-400">
            {{ demoState.lastScanResult() ? 'A recent customer scan result is stored.' : 'No customer scan yet.' }}
          </p>
        </div>
      </div>

      <div class="grid gap-6 xl:grid-cols-3">
        <app-json-viewer
          title="Platform status summary"
          [value]="demoState.lastHealthResult()"
        />
        <app-json-viewer
          title="Tag authentication summary"
          [value]="demoState.lastVerifyResult()"
        />
        <app-json-viewer
          title="Customer scan summary"
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
