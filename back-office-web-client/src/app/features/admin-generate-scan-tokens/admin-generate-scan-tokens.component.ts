import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiClient } from '../../core/api/api-client.service';
import { DemoStateService } from '../../core/services/demo-state.service';
import { NotificationService } from '../../core/services/notification.service';
import { JsonViewerComponent } from '../../shared/components/json-viewer.component';

interface GeneratedScanToken {
  token_id: string;
  token: string;
  url: string;
  expires_at: string;
}

@Component({
  selector: 'app-admin-generate-scan-tokens',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, JsonViewerComponent],
  template: `
    <section class="space-y-6">
      <div>
        <h2 class="page-title">Create Customer Authenticity Links</h2>
        <p class="page-subtitle">Generate time-limited links that customers can use to confirm a garment is authentic.</p>
      </div>

      <form class="card grid gap-4 md:grid-cols-3" [formGroup]="form" (ngSubmit)="submit()">
        <div class="md:col-span-3">
          <label class="field-label" for="product_code">Garment reference</label>
          <input id="product_code" class="field-input" type="text" formControlName="product_code" />
        </div>
        <div>
          <label class="field-label" for="count">Number of links</label>
          <input id="count" class="field-input" type="number" formControlName="count" />
        </div>
        <div>
          <label class="field-label" for="ttl_seconds">Link validity (seconds)</label>
          <input id="ttl_seconds" class="field-input" type="number" formControlName="ttl_seconds" />
        </div>
        <div class="flex items-end">
          <button type="submit" class="btn-primary w-full" [disabled]="form.invalid">Create links</button>
        </div>
      </form>

      @if (tokens().length > 0) {
        <div class="card">
          <p class="text-sm font-semibold text-slate-900">Generated customer links</p>
          <div class="mt-4 overflow-x-auto">
            <table class="min-w-full text-left text-sm">
              <thead class="text-slate-400">
                <tr>
                  <th class="px-2 py-2">Link ID</th>
                  <th class="px-2 py-2">Token</th>
                  <th class="px-2 py-2">Customer URL</th>
                  <th class="px-2 py-2">Expires at</th>
                  <th class="px-2 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                @for (token of tokens(); track token.token_id) {
                  <tr class="border-t border-white/5">
                    <td class="px-2 py-2 font-mono text-xs text-sky-700">{{ token.token_id }}</td>
                    <td class="px-2 py-2 font-mono text-xs text-slate-800">{{ token.token }}</td>
                    <td class="px-2 py-2 font-mono text-xs text-slate-400">{{ token.url }}</td>
                    <td class="px-2 py-2 text-slate-600">{{ token.expires_at }}</td>
                    <td class="px-2 py-2">
                      <button type="button" class="btn-secondary" (click)="useInScan(token)">
                        Open in customer scan
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      @if (result()) {
        <app-json-viewer title="Customer link creation response" [value]="result()" />
      }
    </section>
  `,
})
export class AdminGenerateScanTokensComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly apiClient = inject(ApiClient);
  private readonly demoState = inject(DemoStateService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly form = this.formBuilder.nonNullable.group({
    product_code: [this.demoState.currentProductCode(), Validators.required],
    count: [3, [Validators.required, Validators.min(1)]],
    ttl_seconds: [3600, [Validators.required, Validators.min(1)]],
  });
  protected readonly result = signal<unknown | null>(null);
  protected readonly tokens = signal<GeneratedScanToken[]>([]);

  protected submit(): void {
    const rawValue = this.form.getRawValue();
    this.apiClient
      .generateScanTokens(rawValue.product_code, {
        count: rawValue.count,
        ttl_seconds: rawValue.ttl_seconds,
      })
      .subscribe((result) => {
        this.result.set(result);
        const tokens = this.readTokens(result);
        this.tokens.set(tokens);

        if (tokens.length > 0) {
          this.demoState.setCurrentToken(tokens[0].token_id, rawValue.product_code);
        }

        if (result.ok) {
          this.notificationService.show({
            level: 'success',
            title: 'Customer links created',
            message: `${tokens.length} link(s) created.`,
          });
        }
      });
  }

  protected useInScan(token: GeneratedScanToken): void {
    this.demoState.setCurrentToken(token.token_id, this.form.controls.product_code.value);
    void this.router.navigate(['/public/scan'], {
      queryParams: {
        pid: this.form.controls.product_code.value,
        t: token.token,
      },
    });
  }

  private readTokens(result: unknown): GeneratedScanToken[] {
    const body = this.asRecord(this.asRecord(result)?.['body']);
    const tokens = body?.['tokens'];

    if (!Array.isArray(tokens)) {
      return [];
    }

    return tokens.flatMap((token) => {
      const record = this.asRecord(token);
      const tokenId = record?.['token_id'];
      const rawToken = record?.['token'];
      const url = record?.['url'];
      const expiresAt = record?.['expires_at'];

      if (
        typeof tokenId === 'string' &&
        typeof rawToken === 'string' &&
        typeof url === 'string' &&
        typeof expiresAt === 'string'
      ) {
        return [{ token_id: tokenId, token: rawToken, url, expires_at: expiresAt }];
      }

      return [];
    });
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  }
}
