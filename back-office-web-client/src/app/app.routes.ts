import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { PublicHealthComponent } from './features/public-health/public-health.component';
import { PublicVerifyComponent } from './features/public-verify/public-verify.component';
import { PublicScanComponent } from './features/public-scan/public-scan.component';
import { AdminEnrollComponent } from './features/admin-enroll/admin-enroll.component';
import { AdminNextMessagesComponent } from './features/admin-next-messages/admin-next-messages.component';
import { AdminRevokeTagComponent } from './features/admin-revoke-tag/admin-revoke-tag.component';
import { AdminRotateKeyComponent } from './features/admin-rotate-key/admin-rotate-key.component';
import { AdminReconfigureComponent } from './features/admin-reconfigure/admin-reconfigure.component';
import { AdminGenerateScanTokensComponent } from './features/admin-generate-scan-tokens/admin-generate-scan-tokens.component';
import { AdminRevokeScanTokenComponent } from './features/admin-revoke-scan-token/admin-revoke-scan-token.component';
import { SettingsComponent } from './features/settings/settings.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'public/health', component: PublicHealthComponent },
  { path: 'public/verify', component: PublicVerifyComponent },
  { path: 'public/scan', component: PublicScanComponent },
  { path: 'admin/enroll', component: AdminEnrollComponent },
  { path: 'admin/next-messages', component: AdminNextMessagesComponent },
  { path: 'admin/revoke-tag', component: AdminRevokeTagComponent },
  { path: 'admin/rotate-key', component: AdminRotateKeyComponent },
  { path: 'admin/reconfigure-tag', component: AdminReconfigureComponent },
  { path: 'admin/generate-scan-tokens', component: AdminGenerateScanTokensComponent },
  { path: 'admin/revoke-scan-token', component: AdminRevokeScanTokenComponent },
  { path: 'settings', component: SettingsComponent },
  { path: '**', redirectTo: 'dashboard' },
];
