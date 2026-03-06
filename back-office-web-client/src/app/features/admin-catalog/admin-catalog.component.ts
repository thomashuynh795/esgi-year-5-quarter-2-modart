import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ApiClient } from '../../core/api/api-client.service';
import { CatalogItemRecord, CatalogTagRecord } from '../../core/models/api.models';
import { NotificationService } from '../../core/services/notification.service';
import { JsonViewerComponent } from '../../shared/components/json-viewer.component';

type CatalogTab = 'garments' | 'tags';

@Component({
  selector: 'app-admin-catalog',
  standalone: true,
  imports: [CommonModule, DatePipe, JsonViewerComponent],
  template: `
    <section class="space-y-6">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 class="page-title">Catalog Explorer</h2>
          <p class="page-subtitle">
            Browse the garments created for (USE)LESS and the NFC tags currently linked to them.
          </p>
        </div>

        <button type="button" class="btn-secondary" (click)="refresh()">Refresh lists</button>
      </div>

      <div class="card">
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-2xl px-4 py-2 text-sm font-semibold transition"
            [class.bg-sky-500]="activeTab() === 'garments'"
            [class.text-white]="activeTab() === 'garments'"
            [class.bg-slate-100]="activeTab() !== 'garments'"
            [class.text-slate-700]="activeTab() !== 'garments'"
            (click)="activeTab.set('garments')"
          >
            Garments
          </button>
          <button
            type="button"
            class="rounded-2xl px-4 py-2 text-sm font-semibold transition"
            [class.bg-sky-500]="activeTab() === 'tags'"
            [class.text-white]="activeTab() === 'tags'"
            [class.bg-slate-100]="activeTab() !== 'tags'"
            [class.text-slate-700]="activeTab() !== 'tags'"
            (click)="activeTab.set('tags')"
          >
            Tags
          </button>
        </div>
      </div>

      @if (activeTab() === 'garments') {
        <div class="card">
          <div class="mb-4 flex items-center justify-between gap-3">
            <div>
              <p class="text-sm font-semibold text-slate-900">Created garments</p>
              <p class="text-xs text-slate-500">Each row represents one garment and its linked NFC tag.</p>
            </div>
            <span class="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
              {{ garments().length }} garment(s)
            </span>
          </div>

          @if (garments().length === 0) {
            <p class="text-sm text-slate-500">No garment created yet.</p>
          } @else {
            <div class="overflow-x-auto">
              <table class="min-w-full text-left text-sm">
                <thead class="text-slate-500">
                  <tr>
                    <th class="px-2 py-2">Garment ref</th>
                    <th class="px-2 py-2">Size</th>
                    <th class="px-2 py-2">Color</th>
                    <th class="px-2 py-2">Tag UID</th>
                    <th class="px-2 py-2">Auth mode</th>
                    <th class="px-2 py-2">Status</th>
                    <th class="px-2 py-2">Created at</th>
                  </tr>
                </thead>
                <tbody>
                  @for (garment of garments(); track garment.item_id) {
                    <tr class="border-t border-slate-100">
                      <td class="px-2 py-2 font-semibold text-slate-900">{{ garment.product_code }}</td>
                      <td class="px-2 py-2 text-slate-600">{{ garment.size || 'N/A' }}</td>
                      <td class="px-2 py-2 text-slate-600">{{ garment.color || 'N/A' }}</td>
                      <td class="px-2 py-2 font-mono text-xs text-sky-700">{{ garment.tag.tag_uid }}</td>
                      <td class="px-2 py-2 text-slate-600">{{ formatMode(garment.tag.mode) }}</td>
                      <td class="px-2 py-2">
                        <span class="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                          {{ garment.tag.status }}
                        </span>
                      </td>
                      <td class="px-2 py-2 text-slate-600">{{ garment.created_at | date: 'short' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      } @else {
        <div class="card">
          <div class="mb-4 flex items-center justify-between gap-3">
            <div>
              <p class="text-sm font-semibold text-slate-900">Registered tags</p>
              <p class="text-xs text-slate-500">All NFC tags and the garment currently associated with each one.</p>
            </div>
            <span class="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
              {{ tags().length }} tag(s)
            </span>
          </div>

          @if (tags().length === 0) {
            <p class="text-sm text-slate-500">No tag registered yet.</p>
          } @else {
            <div class="overflow-x-auto">
              <table class="min-w-full text-left text-sm">
                <thead class="text-slate-500">
                  <tr>
                    <th class="px-2 py-2">Tag UID</th>
                    <th class="px-2 py-2">Mode</th>
                    <th class="px-2 py-2">Status</th>
                    <th class="px-2 py-2">Key version</th>
                    <th class="px-2 py-2">Last counter</th>
                    <th class="px-2 py-2">Linked garment</th>
                    <th class="px-2 py-2">Created at</th>
                  </tr>
                </thead>
                <tbody>
                  @for (tag of tags(); track tag.tag_id) {
                    <tr class="border-t border-slate-100">
                      <td class="px-2 py-2 font-mono text-xs text-sky-700">{{ tag.tag_uid }}</td>
                      <td class="px-2 py-2 text-slate-600">{{ formatMode(tag.mode) }}</td>
                      <td class="px-2 py-2">
                        <span class="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                          {{ tag.status }}
                        </span>
                      </td>
                      <td class="px-2 py-2 text-slate-600">{{ tag.key_version }}</td>
                      <td class="px-2 py-2 text-slate-600">{{ tag.last_counter ?? 'N/A' }}</td>
                      <td class="px-2 py-2 text-slate-900">{{ tag.item?.product_code ?? 'Not linked' }}</td>
                      <td class="px-2 py-2 text-slate-600">{{ tag.created_at | date: 'short' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }

      @if (rawResponse()) {
        <app-json-viewer title="Latest catalog response" [value]="rawResponse()" />
      }
    </section>
  `,
})
export class AdminCatalogComponent {
  private readonly apiClient = inject(ApiClient);
  private readonly notificationService = inject(NotificationService);

  protected readonly activeTab = signal<CatalogTab>('garments');
  protected readonly garments = signal<CatalogItemRecord[]>([]);
  protected readonly tags = signal<CatalogTagRecord[]>([]);
  protected readonly rawResponse = signal<unknown | null>(null);

  constructor() {
    this.refresh();
  }

  protected refresh(): void {
    this.apiClient.listCatalogItems().subscribe((result) => {
      this.rawResponse.set(result);
      this.garments.set(result.body ?? []);
    });

    this.apiClient.listCatalogTags().subscribe((result) => {
      this.tags.set(result.body ?? []);

      if (result.ok) {
        this.notificationService.show({
          level: 'success',
          title: 'Catalog refreshed',
          message: 'Garments and tags were loaded successfully.',
        });
      }
    });
  }

  protected formatMode(mode: string): string {
    return mode === 'dynamic_cmac' ? 'DYNAMIC CMAC' : 'ONE TIME TOKENS';
  }
}
