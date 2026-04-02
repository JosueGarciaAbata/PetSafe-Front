import {
  ApplicationConfig,
  ErrorHandler,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { GlobalErrorHandler } from '@app/core/errors/global-error.handler';
import { authInterceptor } from '@app/core/auth/auth.interceptor';
import { routes } from './app.routes';
import { APP_INITIALIZER } from '@angular/core';
import { MetadataApiService } from '@app/core/metadata/metadata-api.service';
import { MetadataStore } from '@app/core/metadata/metadata-store.service';
import { firstValueFrom } from 'rxjs';

export function initializeAppMetadata(api: MetadataApiService, store: MetadataStore) {
  return () =>
    firstValueFrom(api.getEnums())
      .then((enums) => {
        store.setEnums(enums);
        return true;
      })
      .catch((err) => {
        console.warn('System enums could not be pre-loaded, using defaults:', err);
        return true; // Resolve anyway to allow app to start
      });
}



export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandler,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAppMetadata,
      deps: [MetadataApiService, MetadataStore],
      multi: true,
    },
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(routes),
  ],
};
