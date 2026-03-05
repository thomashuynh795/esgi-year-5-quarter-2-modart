import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SettingsService } from '../services/settings.service';
import { isAdminApiPath } from '../api/api-paths';

export const adminKeyInterceptor: HttpInterceptorFn = (request, next) => {
  const settingsService = inject(SettingsService);
  const adminApiKey = settingsService.adminApiKey();

  if (!adminApiKey || !isAdminApiPath(request.url)) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: {
        'X-Admin-Key': adminApiKey,
      },
    }),
  );
};
