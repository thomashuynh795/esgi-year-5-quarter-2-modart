import { CommonModule } from '@angular/common';
import { Component, Input, signal } from '@angular/core';

@Component({
  selector: 'app-json-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card">
      <div class="mb-3 flex items-center justify-between gap-3">
        <div>
          <p class="text-sm font-semibold text-slate-900">{{ title }}</p>
          @if (subtitle) {
            <p class="text-xs text-slate-400">{{ subtitle }}</p>
          }
        </div>
        <button type="button" class="btn-secondary" (click)="copy()">
          {{ copied() ? 'Copied' : 'Copy JSON' }}
        </button>
      </div>

      <pre class="max-h-96 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-cyan-100">{{ serialized }}</pre>
    </div>
  `,
})
export class JsonViewerComponent {
  @Input({ required: true }) title = 'JSON';
  @Input() subtitle = '';
  @Input() value: unknown = null;

  protected readonly copied = signal(false);

  get serialized(): string {
    if (typeof this.value === 'string') {
      return this.value;
    }

    return JSON.stringify(this.value, null, 2) ?? 'null';
  }

  protected async copy(): Promise<void> {
    await navigator.clipboard.writeText(this.serialized);
    this.copied.set(true);
    window.setTimeout(() => this.copied.set(false), 1500);
  }
}
