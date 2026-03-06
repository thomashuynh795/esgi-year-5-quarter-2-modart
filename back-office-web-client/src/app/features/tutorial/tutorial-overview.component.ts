import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { tutorialOverviewBlocks, tutorialSteps } from './tutorial-content';

@Component({
  selector: 'app-tutorial-overview',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="space-y-6">
      <div class="card">
        <p class="text-xs uppercase tracking-[0.3em] text-sky-600">Guide de demo</p>
        <h2 class="mt-3 page-title">Authentifier un vetement (USE)LESS grace au NFC</h2>
        <p class="page-subtitle">
          Cette partie explique pourquoi la solution existe, comment elle fonctionne, et dans quel ordre faire la demonstration.
        </p>
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        @for (block of overviewBlocks; track block.title) {
          <article class="card">
            <p class="text-xs uppercase tracking-[0.25em] text-slate-500">{{ block.title }}</p>
            <p class="mt-4 text-sm leading-6 text-slate-700">{{ block.body }}</p>
          </article>
        }
      </div>

      <div class="card">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-sm font-medium text-slate-900">Parcours guide en 8 etapes</p>
            <p class="mt-1 text-sm text-slate-600">Presentation prete pour une demo de 5 a 7 minutes.</p>
          </div>
          <div class="flex flex-wrap gap-3">
            <a class="btn-primary" [routerLink]="['/tutorial/step', 1]">Commencer la demo</a>
            <a class="btn-secondary" routerLink="/tutorial/faq">Ouvrir la FAQ</a>
          </div>
        </div>

        <div class="mt-6 grid gap-3">
          @for (step of steps; track step.id) {
            <a
              class="border border-slate-200 px-4 py-4 text-left transition hover:bg-slate-50"
              [routerLink]="['/tutorial/step', step.id]"
            >
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-sm font-medium text-slate-900">{{ step.title }}</p>
                  <p class="mt-2 text-sm text-slate-600">{{ step.why }}</p>
                </div>
                <span class="text-xs text-slate-400">0{{ step.id }}</span>
              </div>
            </a>
          }
        </div>
      </div>
    </section>
  `,
})
export class TutorialOverviewComponent {
  protected readonly overviewBlocks = tutorialOverviewBlocks;
  protected readonly steps = tutorialSteps;
}
