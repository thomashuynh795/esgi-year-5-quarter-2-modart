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
        <h2 class="page-title">Admin Generate Scan Tokens</h2>
        <p class="page-subtitle">Call POST /v1/products/:product_code/scan-tokens.</p>
      </div>

      <form class="card grid gap-4 md:grid-cols-3" [formGroup]="form" (ngSubmit)="submit()">
        <div class="md:col-span-3">
          <label class="field-label" for="product_code">Product code</label>
          <input id="product_code" class="field-input" type="text" formControlName="product_code" />
        </div>
        <div>
          <label class="field-label" for="count">Count</label>
          <input id="count" class="field-input" type="number" formControlName="count" />
        </div>
        <div>
          <label class="field-label" for="ttl_seconds">TTL seconds</label>
          <input id="ttl_seconds" class="field-input" type="number" formControlName="ttl_seconds" />
        </div>
        <div class="flex items-end">
          <button type="submit" class="btn-primary w-full" [disabled]="form.invalid">Generate</button>
        </div>
      </form>

      @if (tokens().length > 0) {
        <div class="card">
          <p class="text-sm font-semibold text-white">Generated scan tokens</p>
          <div class="mt-4 overflow-x-auto">
            <table class="min-w-full text-left text-sm">
              <thead class="text-slate-400">
                <tr>
                  <th class="px-2 py-2">Token ID</th>
                  <th class="px-2 py-2">Token</th>
                  <th class="px-2 py-2">URL</th>
                  <th class="px-2 py-2">Expires At</th>
                  <th class="px-2 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                @for (token of tokens(); track token.token_id) {
                  <tr class="border-t border-white/5">
                    <td class="px-2 py-2 font-mono text-xs text-cyan-200">{{ token.token_id }}</td>
                    <td class="px-2 py-2 font-mono text-xs text-slate-200">{{ token.token }}</td>
                    <td class="px-2 py-2 font-mono text-xs text-slate-400">{{ token.url }}</td>
                    <td class="px-2 py-2 text-slate-300">{{ token.expires_at }}</td>
                    <td class="px-2 py-2">
                      <button type="button" class="btn-secondary" (click)="useInScan(token)">
                        Use in Scan
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
        <app-json-viewer title="Generate scan tokens response" [value]="result()" />
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
            title: 'Scan tokens generated',
            message: `${tokens.length} token(s) created.`,
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
