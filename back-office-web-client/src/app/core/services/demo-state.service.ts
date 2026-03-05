import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DemoStateService {
  private readonly currentTagIdKey = 'demo.currentTagId';
  private readonly currentScanTokenKey = 'demo.currentScanToken';
  private readonly currentProductCodeKey = 'demo.currentProductCode';

  readonly currentTagId = signal(localStorage.getItem(this.currentTagIdKey) ?? '');
  readonly currentScanTokenId = signal(localStorage.getItem(this.currentScanTokenKey) ?? '');
  readonly currentProductCode = signal(localStorage.getItem(this.currentProductCodeKey) ?? '');
  readonly lastHealthResult = signal<unknown | null>(null);
  readonly lastVerifyResult = signal<unknown | null>(null);
  readonly lastScanResult = signal<unknown | null>(null);

  setCurrentTagId(tagId: string): void {
    localStorage.setItem(this.currentTagIdKey, tagId);
    this.currentTagId.set(tagId);
  }

  setCurrentToken(tokenId: string, productCode: string): void {
    localStorage.setItem(this.currentScanTokenKey, tokenId);
    localStorage.setItem(this.currentProductCodeKey, productCode);
    this.currentScanTokenId.set(tokenId);
    this.currentProductCode.set(productCode);
  }
}
