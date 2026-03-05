import { CommonModule, DatePipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { HistoryEntry } from '../../core/models/api.models';

@Component({
  selector: 'app-request-history',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <div class="card">
      <div class="mb-4 flex items-center justify-between gap-3">
        <div>
          <p class="text-sm font-semibold text-white">{{ title }}</p>
          <p class="text-xs text-slate-400">Latest 20 requests kept in local storage.</p>
        </div>
      </div>

      @if (entries.length === 0) {
        <p class="text-sm text-slate-400">No request yet.</p>
      } @else {
        <div class="overflow-x-auto">
          <table class="min-w-full text-left text-sm">
            <thead class="text-slate-400">
              <tr>
                <th class="px-2 py-2">Time</th>
                <th class="px-2 py-2">Method</th>
                <th class="px-2 py-2">Path</th>
                <th class="px-2 py-2">Status</th>
                <th class="px-2 py-2">Latency</th>
              </tr>
            </thead>
            <tbody>
              @for (entry of entries; track entry.id) {
                <tr class="border-t border-white/5">
                  <td class="px-2 py-2 text-slate-300">{{ entry.timestamp | date: 'short' }}</td>
                  <td class="px-2 py-2 text-slate-200">{{ entry.method }}</td>
                  <td class="px-2 py-2 font-mono text-xs text-cyan-200">{{ entry.path }}</td>
                  <td class="px-2 py-2">
                    <span
                      class="rounded-full px-2 py-1 text-xs"
                      [class.bg-emerald-400/15]="entry.status >= 200 && entry.status < 300"
                      [class.text-emerald-200]="entry.status >= 200 && entry.status < 300"
                      [class.bg-rose-400/15]="entry.status < 200 || entry.status >= 300"
                      [class.text-rose-200]="entry.status < 200 || entry.status >= 300"
                    >
                      {{ entry.status }}
                    </span>
                  </td>
                  <td class="px-2 py-2 text-slate-300">{{ entry.latencyMs }} ms</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class RequestHistoryComponent {
  @Input({ required: true }) entries: HistoryEntry[] = [];
  @Input() title = 'Request History';
}
