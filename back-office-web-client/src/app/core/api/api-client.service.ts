import { HttpClient, HttpErrorResponse, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import {
  ApiCallResult,
  EnrollRequest,
  GenerateScanTokensRequest,
  NextMessagesRequest,
  ReconfigureTagRequest,
  VerifyRequest,
} from '../models/api.models';
import { SettingsService } from '../services/settings.service';
import { HistoryService } from '../services/history.service';
import { apiPaths } from './api-paths';

@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly settingsService = inject(SettingsService);
  private readonly historyService = inject(HistoryService);

  health(): Observable<ApiCallResult<string>> {
    return this.requestText('GET', apiPaths.health);
  }

  verify(payload: VerifyRequest): Observable<ApiCallResult<unknown>> {
    return this.requestJson('POST', apiPaths.verify, payload);
  }

  scan(pid: string, token: string): Observable<ApiCallResult<unknown>> {
    return this.requestJson('GET', apiPaths.scan, undefined, {
      pid,
      t: token,
    });
  }

  enroll(payload: EnrollRequest): Observable<ApiCallResult<unknown>> {
    return this.requestJson('POST', apiPaths.enroll, payload);
  }

  provision(payload: EnrollRequest): Observable<ApiCallResult<unknown>> {
    return this.requestJson('POST', apiPaths.provision, payload);
  }

  nextMessages(tagId: string, payload: NextMessagesRequest): Observable<ApiCallResult<unknown>> {
    return this.requestJson('POST', apiPaths.nextMessages(tagId), payload);
  }

  revokeTag(tagId: string): Observable<ApiCallResult<string>> {
    return this.requestText('POST', apiPaths.revokeTag(tagId));
  }

  rotateKey(tagId: string): Observable<ApiCallResult<unknown>> {
    return this.requestJson('POST', apiPaths.rotateKey(tagId));
  }

  reconfigureTag(tagId: string, payload: ReconfigureTagRequest): Observable<ApiCallResult<unknown>> {
    return this.requestJson('POST', apiPaths.reconfigureTag(tagId), payload);
  }

  generateScanTokens(
    productCode: string,
    payload: GenerateScanTokensRequest,
  ): Observable<ApiCallResult<unknown>> {
    return this.requestJson('POST', apiPaths.generateScanTokens(productCode), payload);
  }

  revokeScanToken(tokenId: string): Observable<ApiCallResult<string>> {
    return this.requestText('POST', apiPaths.revokeScanToken(tokenId));
  }

  private requestJson<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string>,
  ) {
    const startedAt = performance.now();

    return this.http
      .request<T>(method, this.buildUrl(path), {
        body,
        params: this.buildParams(query),
        observe: 'response',
      })
      .pipe(
        map((response) => this.mapResponse(path, method, response, startedAt)),
        catchError((error: unknown) => of(this.mapError<T>(path, method, error, startedAt))),
      );
  }

  private requestText(method: string, path: string, body?: unknown) {
    const startedAt = performance.now();

    return this.http
      .request(method, this.buildUrl(path), {
        body,
        observe: 'response',
        responseType: 'text',
      })
      .pipe(
        map((response) => this.mapResponse<string>(path, method, response, startedAt)),
        catchError((error: unknown) => of(this.mapError<string>(path, method, error, startedAt))),
      );
  }

  private mapResponse<T>(
    path: string,
    method: string,
    response: HttpResponse<T>,
    startedAt: number,
  ): ApiCallResult<T> {
    const latencyMs = Math.round(performance.now() - startedAt);
    this.historyService.add({
      method,
      path,
      status: response.status,
      latencyMs,
    });

    return {
      ok: response.ok,
      status: response.status,
      latencyMs,
      body: response.body ?? null,
    };
  }

  private mapError<T>(
    path: string,
    method: string,
    error: unknown,
    startedAt: number,
  ): ApiCallResult<T> {
    const latencyMs = Math.round(performance.now() - startedAt);
    const httpError = error instanceof HttpErrorResponse ? error : null;
    this.historyService.add({
      method,
      path,
      status: httpError?.status ?? 0,
      latencyMs,
    });

    return {
      ok: false,
      status: httpError?.status ?? 0,
      latencyMs,
      body: (httpError?.error as T | null | undefined) ?? null,
      errorMessage: httpError?.message ?? 'Unknown error',
    };
  }

  private buildUrl(path: string): string {
    return `${this.settingsService.apiBaseUrl()}${path}`;
  }

  private buildParams(query?: Record<string, string>): HttpParams | undefined {
    if (!query) {
      return undefined;
    }

    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      params = params.set(key, value);
    });
    return params;
  }
}
