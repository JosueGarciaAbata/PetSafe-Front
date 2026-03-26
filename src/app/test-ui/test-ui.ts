import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink } from '@angular/router';
import { AuthService } from '@app/core/auth/auth.service';

@Component({
  selector: 'app-test-ui',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatToolbarModule,
    RouterLink,
  ],
  template: `
    <section class="demo-shell">
      <mat-toolbar class="demo-toolbar">
        <div class="toolbar-copy">
          <span class="eyebrow">PetSafe UI</span>
          <h1>Angular Material con tu paleta</h1>
          <p>Este ejemplo usa componentes Material, pero los colores vienen de tu tema.</p>
        </div>
        <button mat-flat-button class="brand-cta">Nueva alerta</button>
      </mat-toolbar>

      <div class="demo-grid">
        <mat-card appearance="outlined" class="hero-card">
          <mat-card-header>
            <mat-card-title>Panel principal</mat-card-title>
            <mat-card-subtitle>Superficies, texto y acentos con tu identidad visual</mat-card-subtitle>
          </mat-card-header>

          <mat-card-content>
            <div class="status-row">
              <mat-chip-set>
                <mat-chip class="chip-brand">Marca</mat-chip>
                <mat-chip class="chip-primary">Accion principal</mat-chip>
                <mat-chip class="chip-success">Sistema estable</mat-chip>
              </mat-chip-set>
            </div>

            <div class="hero-metrics">
              <div class="metric-block">
                <span class="metric-label">Fondo</span>
                <strong>#EFF3F5</strong>
              </div>
              <div class="metric-block">
                <span class="metric-label">Tarjeta</span>
                <strong>#F8FAFC</strong>
              </div>
              <div class="metric-block">
                <span class="metric-label">Borde</span>
                <strong>#E4E8EE</strong>
              </div>
            </div>
          </mat-card-content>

          <mat-card-actions>
            <button mat-flat-button>Guardar</button>
            <button mat-stroked-button>Ver detalle</button>
          </mat-card-actions>
        </mat-card>

        <mat-card appearance="outlined" class="form-card">
          <mat-card-header>
            <mat-card-title>Formulario Material</mat-card-title>
            <mat-card-subtitle>Inputs y acciones con los tokens del tema</mat-card-subtitle>
          </mat-card-header>

          <mat-card-content class="form-content">
            <mat-form-field appearance="outline">
              <mat-label>Nombre de mascota</mat-label>
              <input matInput value="Luna" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Observacion</mat-label>
              <textarea matInput rows="3">Paciente estable, seguimiento en 24 horas.</textarea>
            </mat-form-field>

            <mat-divider></mat-divider>

            <div class="soft-panel">
              <span class="soft-title">Estado actual</span>
              <p>Este bloque usa tu color activo suave para mostrar una zona de contexto.</p>
            </div>
          </mat-card-content>

          <mat-card-actions>
            <button mat-flat-button>Actualizar</button>
            <button mat-button>Cancelar</button>
          </mat-card-actions>
        </mat-card>
      </div>

      <div class="test-strip">
        <div>
          <strong>Prueba rapida</strong>
          <p>Este boton lanza un error no manejado para validar <code>GlobalErrorHandler</code>.</p>
        </div>
        <button mat-stroked-button type="button" (click)="throwTestError()">
          Provocar error
        </button>
      </div>

      <div class="test-strip auth-strip">
        <div>
          <strong>Prueba de roles</strong>
          <p>{{ authMessage }}</p>
        </div>
        <div class="auth-actions">
          <button mat-flat-button class="brand-cta" type="button" (click)="setAdminToken()">
            Cargar ADMIN
          </button>
          <button mat-stroked-button type="button" (click)="setViewerToken()">Cargar USER</button>
          <button mat-button type="button" (click)="clearToken()">Limpiar token</button>
        </div>
      </div>

      <div class="test-strip auth-strip">
        <div>
          <strong>Rutas protegidas</strong>
          <p>Abre cada seccion para validar que solo ADMIN puede entrar.</p>
        </div>
        <div class="auth-links-actions">
          <a mat-flat-button class="brand-cta" routerLink="/dashboard">Dashboard</a>
          <a mat-stroked-button routerLink="/pets">Pets</a>
          <a mat-stroked-button routerLink="/owners">Owners</a>
        </div>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
      background: var(--ps-background);
      color: var(--ps-text-primary);
    }

    .demo-shell {
      padding: 32px;
      display: grid;
      gap: 24px;
    }

    .demo-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      padding: 24px;
      height: auto;
      border: 1px solid var(--ps-border);
      border-radius: 24px;
      background:
        linear-gradient(135deg, color-mix(in srgb, var(--ps-brand) 10%, white), var(--ps-card));
      color: var(--ps-text-primary);
      box-shadow: none;
    }

    .toolbar-copy h1 {
      margin: 6px 0 8px;
      font-size: 1.8rem;
      line-height: 1.1;
    }

    .toolbar-copy p {
      margin: 0;
      max-width: 52ch;
      color: var(--ps-text-secondary);
    }

    .eyebrow {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 999px;
      background: var(--ps-badge-blue-bg);
      color: var(--ps-badge-blue-text);
      font-size: 0.82rem;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .brand-cta.mdc-button {
      --mdc-filled-button-container-color: var(--ps-primary);
      --mdc-filled-button-label-text-color: #fff;
    }

    .demo-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 24px;
    }

    .hero-card,
    .form-card {
      border-color: var(--ps-border);
      background: var(--ps-card);
      box-shadow: none;
    }

    .status-row {
      margin-bottom: 20px;
    }

    .hero-metrics {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }

    .metric-block {
      padding: 16px;
      border: 1px solid var(--ps-border);
      border-radius: 18px;
      background: #fff;
    }

    .metric-label {
      display: block;
      margin-bottom: 6px;
      color: var(--ps-text-secondary);
      font-size: 0.85rem;
    }

    .chip-brand,
    .chip-primary,
    .chip-success {
      border-radius: 999px;
    }

    .chip-brand {
      background: var(--ps-active-soft);
      color: var(--ps-brand);
    }

    .chip-primary {
      background: var(--ps-badge-blue-bg);
      color: var(--ps-badge-blue-text);
    }

    .chip-success {
      background: var(--ps-success-bg);
      color: var(--ps-success-text);
    }

    .form-content {
      display: grid;
      gap: 16px;
    }

    .soft-panel {
      padding: 16px;
      border-radius: 18px;
      background: var(--ps-active-soft);
      color: var(--ps-text-primary);
    }

    .soft-title {
      display: block;
      margin-bottom: 6px;
      color: var(--ps-brand);
      font-weight: 600;
    }

    .test-strip {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 18px 20px;
      border: 1px dashed var(--ps-border);
      border-radius: 18px;
      background: var(--ps-card);
    }

    .test-strip p {
      margin: 6px 0 0;
      color: var(--ps-text-secondary);
    }

    .auth-strip p {
      max-width: 58ch;
    }

    .auth-actions,
    .auth-links-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      justify-content: flex-end;
    }

    mat-form-field {
      width: 100%;
    }

    .mat-mdc-outlined-card {
      --mdc-outlined-card-outline-color: var(--ps-border);
      --mdc-outlined-card-container-color: var(--ps-card);
    }

    .mat-mdc-card-title,
    .mat-mdc-card-subtitle {
      color: var(--ps-text-primary);
    }

    .mat-mdc-card-subtitle,
    .mat-mdc-form-field-hint,
    .mat-mdc-form-field .mdc-floating-label {
      color: var(--ps-text-secondary);
    }

    .mat-mdc-outlined-button:not(:disabled) {
      color: var(--ps-brand);
      border-color: var(--ps-border);
    }

    .mat-mdc-unelevated-button:not(:disabled) {
      --mdc-filled-button-container-color: var(--ps-primary);
      --mdc-filled-button-label-text-color: #fff;
    }

    .mat-mdc-form-field {
      --mdc-outlined-text-field-outline-color: var(--ps-border);
      --mdc-outlined-text-field-hover-outline-color: var(--ps-brand);
      --mdc-outlined-text-field-focus-outline-color: var(--ps-primary);
      --mdc-outlined-text-field-caret-color: var(--ps-primary);
      --mdc-outlined-text-field-focus-label-text-color: var(--ps-primary);
      --mdc-outlined-text-field-input-text-color: var(--ps-text-primary);
      --mat-sys-on-surface-variant: var(--ps-text-secondary);
    }

    @media (max-width: 720px) {
      .demo-shell {
        padding: 20px;
      }

      .demo-toolbar {
        flex-direction: column;
      }

      .hero-metrics {
        grid-template-columns: 1fr;
      }

      .test-strip {
        flex-direction: column;
        align-items: stretch;
      }
    }
  `,
})
export class TestUiComponent {
  private readonly authService = inject(AuthService);
  protected authMessage = 'Carga un token de prueba y luego abre una ruta protegida.';

  throwTestError(): void {
    throw new Error('Intentional test error from TestUiComponent');
  }

  protected setAdminToken(): void {
    this.authService.saveToken(this.buildMockToken(['ADMIN']));
    this.authMessage = 'Token ADMIN cargado. Ahora puedes entrar a /dashboard, /pets y /owners.';
  }

  protected setViewerToken(): void {
    this.authService.saveToken(this.buildMockToken(['USER']));
    this.authMessage = 'Token USER cargado. El acceso a rutas protegidas debe redirigir a /unauthorized.';
  }

  protected clearToken(): void {
    this.authService.clearToken();
    this.authMessage = 'Token eliminado. Las rutas protegidas deben redirigir a /login.';
  }

  private buildMockToken(roles: string[]): string {
    const header = this.base64UrlEncode(JSON.stringify({ alg: 'none', typ: 'JWT' }));
    const payload = this.base64UrlEncode(
      JSON.stringify({
        sub: 'test-user',
        roles,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
      }),
    );

    return `${header}.${payload}.test-signature`;
  }

  private base64UrlEncode(value: string): string {
    return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }
}
