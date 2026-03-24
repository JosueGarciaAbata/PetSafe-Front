import { ApplicationConfig, ErrorHandler, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { GlobalErrorHandler } from '@app/core/errors/global-error.handler';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandler,
    },
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes)
  ]
};
