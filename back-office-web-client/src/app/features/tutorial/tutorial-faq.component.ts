import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { tutorialGlossary, tutorialSteps } from './tutorial-content';

@Component({
  selector: 'app-tutorial-faq',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="space-y-6">
      <div class="card">
        <p class="text-xs uppercase tracking-[0.3em] text-sky-600">FAQ / Glossaire</p>
        <h2 class="mt-3 page-title">Les mots a connaitre pour la demo</h2>
        <p class="page-subtitle">
          Version courte, pensee pour un public non technique.
        </p>
      </div>

      <div class="grid gap-3">
        @for (entry of glossary; track entry.title) {
          <article class="card">
            <p class="text-sm font-medium text-slate-900">{{ entry.title }}</p>
            <p class="mt-3 text-sm leading-6 text-slate-700">{{ entry.body }}</p>
          </article>
        }
      </div>

      <div class="flex flex-wrap gap-3">
        <a class="btn-secondary" routerLink="/tutorial">Retour au pitch</a>
        <a class="btn-primary" [routerLink]="['/tutorial/step', steps.length]">Retour a la derniere etape</a>
      </div>
    </section>
  `,
})
export class TutorialFaqComponent {
  protected readonly glossary = tutorialGlossary;
  protected readonly steps = tutorialSteps;
}
