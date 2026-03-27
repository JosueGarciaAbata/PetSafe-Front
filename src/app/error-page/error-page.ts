import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { LogoComponent } from '@app/logo/logo';

@Component({
  selector: 'app-error-page',
  standalone: true,
  imports: [MatButtonModule, MatCardModule, RouterLink, LogoComponent],
  template: `
    <section class="error-shell">
      <mat-card appearance="outlined" class="error-card">
        <app-logo [className]="'mb-4'"></app-logo>
        <h1>Algo salio mal</h1>
        <p>
          Ocurrio un problema inesperado. Ya registramos el error y puedes volver al inicio sin perder el flujo
          principal.
        </p>

        <div class="error-actions">
          <a mat-flat-button routerLink="/">Volver al inicio</a>
        </div>
      </mat-card>
    </section>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
      background:
        radial-gradient(circle at top left, color-mix(in srgb, var(--ps-brand) 18%, transparent), transparent 36%),
        radial-gradient(circle at bottom right, color-mix(in srgb, var(--ps-primary) 16%, transparent), transparent 32%),
        var(--ps-background);
      color: var(--ps-text-primary);
    }

    .error-shell {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
    }

    .error-card {
      width: min(560px, 100%);
      padding: 28px;
      border-color: var(--ps-border);
      background: var(--ps-card);
      box-shadow: 0 20px 60px rgba(31, 41, 55, 0.08);
      text-align: left;
    }

    .error-badge {
      display: inline-block;
      margin-bottom: 16px;
      padding: 6px 12px;
      border-radius: 999px;
      background: var(--ps-active-soft);
      color: var(--ps-brand);
      font-size: 0.82rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    h1 {
      margin: 0 0 12px;
      font-size: clamp(2rem, 4vw, 3rem);
      line-height: 1.05;
    }

    p {
      margin: 0;
      color: var(--ps-text-secondary);
      font-size: 1rem;
      line-height: 1.6;
    }

    .error-actions {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }

    a[mat-flat-button] {
      --mdc-filled-button-container-color: var(--ps-primary);
      --mdc-filled-button-label-text-color: #ffffff;
    }
  `,
})
export class ErrorPageComponent { }
