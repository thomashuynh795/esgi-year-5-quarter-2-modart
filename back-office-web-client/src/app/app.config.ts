import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { adminKeyInterceptor } from './core/interceptors/admin-key.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';
import { apiErrorInterceptor } from './core/interceptors/api-error.interceptor';
import { devLogInterceptor } from './core/interceptors/dev-log.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([
        loadingInterceptor,
        adminKeyInterceptor,
        apiErrorInterceptor,
        devLogInterceptor,
      ]),
    ),
  ],
};
