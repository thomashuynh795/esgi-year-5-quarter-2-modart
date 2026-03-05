import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiClient } from '../../core/api/api-client.service';
import { DemoStateService } from '../../core/services/demo-state.service';
import { NotificationService } from '../../core/services/notification.service';
import { JsonViewerComponent } from '../../shared/components/json-viewer.component';

interface GeneratedMessage {
  counter: number;
  cmac: string;
}

@Component({
  selector: 'app-admin-next-messages',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, JsonViewerComponent],
  template: `
    <section class="space-y-6">
      <div>
        <h2 class="page-title">Prepare Tag Proofs</h2>
        <p class="page-subtitle">
          Generate the next authenticity proofs for a linked garment tag and test them immediately.
        </p>
      </div>

      <form class="card grid gap-4 md:grid-cols-3" [formGroup]="form" (ngSubmit)="submit()">
        <div class="md:col-span-3">
          <label class="field-label" for="tag_id">Linked tag ID</label>
          <input id="tag_id" class="field-input" type="text" formControlName="tag_id" />
        </div>
        <div>
          <label class="field-label" for="count">Number of proofs</label>
          <input id="count" class="field-input" type="number" formControlName="count" />
        </div>
        <div>
          <label class="field-label" for="starting_counter">Start from counter (optional)</label>
          <input
            id="starting_counter"
            class="field-input"
            type="number"
            [formControl]="startingCounterControl"
          />
        </div>
        <div class="flex items-end">
          <button type="submit" class="btn-primary w-full" [disabled]="form.invalid">Generate proofs</button>
        </div>
      </form>

      @if (messages().length > 0) {
        <div class="card">
          <p class="text-sm font-semibold text-slate-900">Generated proofs</p>
          <div class="mt-4 overflow-x-auto">
            <table class="min-w-full text-left text-sm">
              <thead class="text-slate-400">
                <tr>
                  <th class="px-2 py-2">Counter</th>
                  <th class="px-2 py-2">Proof</th>
                  <th class="px-2 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                @for (message of messages(); track message.counter + ':' + message.cmac) {
                  <tr class="border-t border-white/5">
                    <td class="px-2 py-2 text-slate-800">{{ message.counter }}</td>
                    <td class="px-2 py-2 font-mono text-xs text-sky-700">{{ message.cmac }}</td>
                    <td class="px-2 py-2">
                      <button type="button" class="btn-secondary" (click)="useInVerify(message)">
                        Use in Authenticate
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
        <app-json-viewer title="Generated proofs response" [value]="result()" />
      }
    </section>
  `,
})
export class AdminNextMessagesComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly apiClient = inject(ApiClient);
  private readonly demoState = inject(DemoStateService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly startingCounterControl = new FormControl<number | null>(null);
  protected readonly form = this.formBuilder.nonNullable.group({
    tag_id: [this.demoState.currentTagId(), Validators.required],
    count: [3, [Validators.required, Validators.min(1)]],
  });
  protected readonly result = signal<unknown | null>(null);
  protected readonly messages = signal<GeneratedMessage[]>([]);
  protected readonly tagUid = signal('');

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const tagId = params.get('tag_id');
      if (tagId) {
        this.form.patchValue({ tag_id: tagId });
      }
    });
  }

  protected submit(): void {
    const payload = {
      count: this.form.controls.count.value,
      ...(this.startingCounterControl.value !== null
        ? { starting_counter: this.startingCounterControl.value }
        : {}),
    };

    this.apiClient.nextMessages(this.form.controls.tag_id.value, payload).subscribe((result) => {
      this.result.set(result);
      this.messages.set(this.readMessages(result));
      this.tagUid.set(this.readTagUid(result));

      if (result.ok) {
        this.notificationService.show({
          level: 'success',
          title: 'Proofs generated',
          message: `${this.readMessages(result).length} proof(s) ready for authentication.`,
        });
      }
    });
  }

  protected useInVerify(message: GeneratedMessage): void {
    void this.router.navigate(['/public/verify'], {
      queryParams: {
        tag_uid: this.tagUid(),
        counter: message.counter,
        cmac: message.cmac,
      },
    });
  }

  private readMessages(result: unknown): GeneratedMessage[] {
    const body = this.asRecord(this.asRecord(result)?.['body']);
    const messages = body?.['messages'];

    if (!Array.isArray(messages)) {
      return [];
    }

    return messages.flatMap((message) => {
      const record = this.asRecord(message);
      const counter = record?.['counter'];
      const cmac = record?.['cmac'];

      if (typeof counter === 'number' && typeof cmac === 'string') {
        return [{ counter, cmac }];
      }

      return [];
    });
  }

  private readTagUid(result: unknown): string {
    const body = this.asRecord(this.asRecord(result)?.['body']);
    const tagUid = body?.['tag_uid'];
    return typeof tagUid === 'string' ? tagUid : '';
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  }
}
