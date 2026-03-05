# Anti-Counterfeit NFC Demo Frontend

Frontend de démonstration en Angular 21 + TailwindCSS pour tester les routes publiques et admin de l’API REST anti-contrefaçon NFC.

## Stack

- Angular 21 standalone components
- TypeScript strict
- Angular Router
- RxJS
- HttpClient + interceptors
- TailwindCSS v4

## Setup

```bash
npm install
npm start
```

Application locale par défaut : [http://localhost:4200](http://localhost:4200)

Build :

```bash
npm run build
```

Note : dans ce workspace, `npx ngc -p tsconfig.app.json` passe correctement. Le `ng build` Angular CLI se termine sans diagnostic exploitable dans le sandbox Codex, mais le projet est typé et compilé côté Angular compiler.

## Configuration

Deux niveaux existent :

1. Valeurs par défaut Angular :
   Fichier [environment.ts](/Users/user/esgi-year-5-quarter-2-modart/back-office-web-client/src/environments/environment.ts)

```ts
export const environment = {
  production: false,
  API_BASE_URL: 'http://localhost:8101',
  ADMIN_API_KEY: '',
};
```

2. Valeurs runtime modifiables dans l’UI :
   Page `Settings`

Les valeurs sauvegardées dans `localStorage` prennent le dessus sans redémarrage de l’application.

Clés utilisées :

- `demo.apiBaseUrl`
- `demo.adminApiKey`
- `demo.currentTagId`
- `demo.currentScanToken`
- `demo.currentProductCode`
- `demo.requestHistory`

## Auth admin

Les endpoints admin utilisent le header suivant :

```http
X-Admin-Key: <admin_key>
```

L’ajout est fait automatiquement par [admin-key.interceptor.ts](/Users/user/esgi-year-5-quarter-2-modart/back-office-web-client/src/app/core/interceptors/admin-key.interceptor.ts) pour :

- `/admin/**`
- `/provision`
- `/v1/products/:product_code/scan-tokens`

## Pages disponibles

- `Dashboard` : dernier health, dernier verify, dernier scan, historique local des 20 dernières requêtes.
- `Public / Health` : test `GET /health`.
- `Public / Verify (CMAC)` : test `POST /verify` avec bouton de replay.
- `Public / Scan (Token)` : test `GET /v1/scan?pid=...&t=...`.
- `Admin / Enroll Tag` : test `POST /admin/tags/enroll` et `POST /provision`.
- `Admin / Next Messages` : test `POST /admin/tags/:tag_id/next-messages`.
- `Admin / Revoke Tag` : test `POST /admin/tags/:tag_id/revoke`.
- `Admin / Rotate Key` : test `POST /admin/tags/:tag_id/rotate-key`.
- `Admin / Reconfigure Tag` : test `POST /admin/tags/:tag_id/reconfigure`.
- `Admin / Generate Scan Tokens` : test `POST /v1/products/:product_code/scan-tokens`.
- `Admin / Revoke Scan Token` : test `POST /admin/scan-tokens/:token_id/revoke`.
- `Settings` : modification de `API_BASE_URL` et `ADMIN_API_KEY`.

## UX intégrée

- Loader global pendant les requêtes
- Notifications toast pour succès et erreurs HTTP
- Historique local des requêtes avec route, statut et latence
- Logs console en mode dev via interceptor
- Visualisation JSON brute avec copie presse-papiers
- Pré-remplissage entre écrans :
  - `Enroll` sauvegarde le `tag_id` courant
  - `Generate Scan Tokens` sauvegarde le token courant
  - `Next Messages` peut remplir `Verify`
  - `Generate Scan Tokens` peut remplir `Scan`

## Architecture

```text
src/app/
  core/
    api/
    interceptors/
    models/
    services/
  features/
    dashboard/
    public-health/
    public-verify/
    public-scan/
    admin-enroll/
    admin-next-messages/
    admin-revoke-tag/
    admin-rotate-key/
    admin-reconfigure/
    admin-generate-scan-tokens/
    admin-revoke-scan-token/
    settings/
  shared/
    components/
```

## Exemples de payloads

### Health

```http
GET /health
```

### Verify

```json
{
  "tag_uid": "04AABBCCDD",
  "counter": 1,
  "cmac": "2E4B0F458301D8871F8C219E7ED999B5"
}
```

### Enroll

```json
{
  "tag_uid": "04AABBCCDD",
  "product_code": "TSHIRT-001",
  "size": "M",
  "color": "BLACK",
  "mode": "dynamic_cmac"
}
```

### Next messages

```json
{
  "count": 3,
  "starting_counter": 1
}
```

### Reconfigure dynamic CMAC

```json
{
  "reset_counter": true,
  "rotate_key": false
}
```

### Reconfigure one-time tokens

```json
{
  "revoke_existing_batch": true,
  "token_count": 5,
  "ttl_seconds": 3600
}
```

### Generate scan tokens

```json
{
  "count": 3,
  "ttl_seconds": 3600
}
```

## Fichiers principaux

- [app.routes.ts](/Users/user/esgi-year-5-quarter-2-modart/back-office-web-client/src/app/app.routes.ts)
- [app.config.ts](/Users/user/esgi-year-5-quarter-2-modart/back-office-web-client/src/app/app.config.ts)
- [api-client.service.ts](/Users/user/esgi-year-5-quarter-2-modart/back-office-web-client/src/app/core/api/api-client.service.ts)
- [settings.service.ts](/Users/user/esgi-year-5-quarter-2-modart/back-office-web-client/src/app/core/services/settings.service.ts)
- [admin-key.interceptor.ts](/Users/user/esgi-year-5-quarter-2-modart/back-office-web-client/src/app/core/interceptors/admin-key.interceptor.ts)
- [json-viewer.component.ts](/Users/user/esgi-year-5-quarter-2-modart/back-office-web-client/src/app/shared/components/json-viewer.component.ts)
- [request-history.component.ts](/Users/user/esgi-year-5-quarter-2-modart/back-office-web-client/src/app/shared/components/request-history.component.ts)
