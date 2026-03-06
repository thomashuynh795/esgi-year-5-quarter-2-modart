import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { getTutorialStep, tutorialSteps } from './tutorial-content';

@Component({
  selector: 'app-tutorial-step',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (step(); as currentStep) {
      <section class="space-y-6">
        <div class="card">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p class="text-xs uppercase tracking-[0.3em] text-sky-600">Tutoriel</p>
              <h2 class="mt-3 page-title">{{ currentStep.title }}</h2>
              <p class="page-subtitle">{{ currentStep.why }}</p>
            </div>

            <div class="flex gap-3">
              <a class="btn-secondary" routerLink="/tutorial">Vue d'ensemble</a>
              <a class="btn-secondary" routerLink="/tutorial/faq">FAQ / Glossaire</a>
            </div>
          </div>
        </div>

        <div class="card">
          <p class="text-sm font-medium text-slate-900">Progression</p>
          <div class="mt-4 flex flex-wrap gap-2">
            @for (entry of steps; track entry.id) {
              <a
                class="border px-3 py-2 text-xs transition"
                [class.border-sky-500]="entry.id === currentStep.id"
                [class.bg-sky-500]="entry.id === currentStep.id"
                [class.text-white]="entry.id === currentStep.id"
                [class.border-slate-200]="entry.id !== currentStep.id"
                [class.text-slate-600]="entry.id !== currentStep.id"
                [routerLink]="['/tutorial/step', entry.id]"
              >
                {{ entry.id }}
              </a>
            }
          </div>
        </div>

        <div class="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div class="card">
            <p class="text-sm font-medium text-slate-900">Action dans la console</p>
            <div class="mt-4 grid gap-3">
              @for (action of currentStep.actions; track action.label + action.path) {
                <a class="border border-slate-200 px-4 py-4 text-sm text-slate-700 transition hover:bg-slate-50" [routerLink]="action.path">
                  {{ action.label }}
                </a>
              }
            </div>
          </div>

          <div class="space-y-6">
            <div class="card">
              <p class="text-sm font-medium text-slate-900">Resultat attendu</p>
              <p class="mt-4 text-sm leading-6 text-slate-700">{{ currentStep.expected }}</p>
            </div>

            @if (currentStep.note) {
              <details class="card">
                <summary class="cursor-pointer text-sm font-medium text-slate-900">A dire a l'oral</summary>
                <p class="mt-4 text-sm leading-6 text-slate-700">{{ currentStep.note }}</p>
              </details>
            }

            @if (currentStep.id === 5) {
              <div class="card">
                <p class="text-sm font-medium text-slate-900">Exemple simple de payload</p>
                <div class="mt-4 border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
                  <pre>{{ samplePayload }}</pre>
                </div>
                <div class="mt-4 grid gap-3 text-sm text-slate-700">
                  <p><strong>tag_uid</strong> : identifie le tag physique.</p>
                  <p><strong>counter</strong> : change a chaque lecture pour eviter la reutilisation.</p>
                  <p><strong>cmac</strong> : preuve cryptographique verifiee par l'API.</p>
                </div>
              </div>
            }

            @if (currentStep.id === 8) {
              <div class="card">
                <p class="text-sm font-medium text-slate-900">Pourquoi il y a plusieurs cles ?</p>
                <div class="mt-4 grid gap-3 text-sm text-slate-700">
                  <p><strong>Cle secrete du tag</strong> : sert a produire ou verifier la preuve cryptographique.</p>
                  <p><strong>Rotation</strong> : permet de renouveler cette cle si besoin et de limiter l'impact d'une fuite.</p>
                  <p><strong>Cle admin</strong> : protege les actions sensibles de la console pendant la demo.</p>
                </div>
              </div>
            }
          </div>
        </div>

        <div class="flex flex-wrap justify-between gap-3">
          @if (previousStepId()) {
            <a class="btn-secondary" [routerLink]="['/tutorial/step', previousStepId()]">Etape precedente</a>
          } @else {
            <span></span>
          }

          @if (nextStepId()) {
            <a class="btn-primary" [routerLink]="['/tutorial/step', nextStepId()]">Etape suivante</a>
          } @else {
            <a class="btn-primary" routerLink="/tutorial/faq">Terminer avec la FAQ</a>
          }
        </div>
      </section>
    } @else {
      <section class="card space-y-4">
        <h2 class="page-title">Etape introuvable</h2>
        <p class="text-sm text-slate-600">Cette etape du tutoriel n'existe pas.</p>
        <a class="btn-secondary" routerLink="/tutorial">Retour au tutoriel</a>
      </section>
    }
  `,
})
export class TutorialStepComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly steps = tutorialSteps;
  protected readonly samplePayload = '{ "tag_uid": "04AABBCCDD", "counter": 3, "cmac": "6FBC0BA3..." }';
  private readonly stepId = toSignal(
    this.route.paramMap.pipe(map((params) => Number(params.get('id') ?? 0))),
    { initialValue: 1 },
  );

  protected readonly step = computed(() => getTutorialStep(this.stepId()));
  protected readonly previousStepId = computed(() => {
    const id = this.stepId();
    return id > 1 ? id - 1 : null;
  });
  protected readonly nextStepId = computed(() => {
    const id = this.stepId();
    return id < tutorialSteps.length ? id + 1 : null;
  });
}
