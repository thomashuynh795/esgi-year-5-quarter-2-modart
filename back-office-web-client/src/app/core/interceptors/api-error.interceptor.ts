import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

export const apiErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const notificationService = inject(NotificationService);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        const body =
          typeof error.error === 'string' ? error.error : JSON.stringify(error.error ?? {});

        notificationService.show({
          level: 'error',
          title: `HTTP ${error.status || 0}`,
          message: `${request.method} ${request.url} failed. ${body}`.trim(),
        });
      }

      return throwError(() => error);
    }),
  );
};
