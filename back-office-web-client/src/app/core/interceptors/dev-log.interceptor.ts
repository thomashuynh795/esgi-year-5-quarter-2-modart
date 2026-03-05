import { HttpInterceptorFn } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export const devLogInterceptor: HttpInterceptorFn = (request, next) => {
  if (environment.production) {
    return next(request);
  }

  const startedAt = performance.now();
  console.debug('[API request]', request.method, request.url, request.body ?? null);

  return next(request).pipe(
    tap({
      next: (event) => {
        if ('status' in event) {
          console.debug('[API response]', request.method, request.url, {
            status: event.status,
            latencyMs: Math.round(performance.now() - startedAt),
          });
        }
      },
      error: (error) => {
        console.error('[API error]', request.method, request.url, error);
      },
    }),
  );
};
