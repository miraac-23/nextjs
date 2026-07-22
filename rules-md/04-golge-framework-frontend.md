# Golge Framework — Frontend Code Review Standartlari

> **Alt gorev 9** karsiligi. Frontend golge framework'u: **golge-ui** (paylasilan bilesen/tema/router/e-imza/api kutuphanesi) + **Module Federation** mikro-frontend mimarisi (`dis-portal-mf-shell` = host, `<ad>-web` = remote).
> Backend (golge-* jar'lari) tarafi ayri dokumanda: [04-golge-framework-backend.md](04-golge-framework-backend.md) (alt gorev 4).
> **Kullanim:** Her standart icin (a) **NEDEN** onemli, (b) review'da **NASIL TESPIT** edilir, (c) **NASIL DUZELTILIR**. Iddialar `golge-ui` `dist/*.d.ts` tip tanimlarina ve gercek `vite.config` dosyalarina dayandirilmistir.

### Surum (dogrulanmis)

golge-ui **1.16.10** (`taraf-web/node_modules/golge-ui`). Repolar arasi hedef **1.16.x**; hala `^1.0.x`/`^1.2.x` kullanan repo var (singleton riski — bkz. B.2).

---
# BOLUM B — FRONTEND (golge-ui + Module Federation)

## B.1 golge-ui Modulleri ve Export Alanlari — Yasak: /localStorage\.(?:getItem|setItem)\s*\(\s*["'][^"']*(?:[Tt]oken|[Jj]wt|[Aa]uth)/

`taraf-web/node_modules/golge-ui/package.json` (**v1.16.10**) `exports` alani — bes giris noktasi + stiller:

| Import yolu | Saglananlar (`.d.ts`'ten dogrulandi) |
|---|---|
| `golge-ui` (`"."`) | **Bilesenler:** `GolgeApp`, `GolgeAppBar`, `GolgeMain`, `GolgeFooter`, `GolgeBrowserDebugger`, `GolgeDraggableDialog`, `GolgeInfoCard`, `GolgeTreeView`, `GolgeCrudLayout`, `components/base` (card/modal/button/menu/input), `components/crud` (`GolgeEntityForm`, `GolgeFilterForm`, `GolgeTable` + `GolgeTableField/GolgeField/GolgeFilterField` tipleri), `iconify`. **API:** `GolgeApi`, `golgeRtkApiHeaders`, `golgeErrorMiddleware`, tip: `GolgeEntity`, `GolgePageableRequest/Response`. **Bildirim:** `enqueueSnackbar`. **Guvenlik:** `useGolgeSecurity` + `GolgeUser`/`GolgeUserPosition`. **Vite:** `GolgeVitePlugin`, `PostTransformPlugin`. **Log/media hook'lari.** |
| `golge-ui/utils` | `configUtils`, `DateUtil`, `inputUtils`, `postMessageBridge`, `typeUtils`, `windowUtils` |
| `golge-ui/eimza` | E-imza: `EImza`, `EImzaModal` (+`EImzaModalProps`), `EImzaProps`, `SignDoc`, `GolgeDocument` |
| `golge-ui/theme` | `theme-provider`, `theme-config`, `core`, `layouts`, `settings`, tema `types` (MUI tema entegrasyonu) |
| `golge-ui/router` | `GolgeRouter` + `react-router-dom`'un tamami re-export |
| `golge-ui/styles` | `dist/style.css` |

`useGolgeSecurity()` doner: `{ logout, getToken, getAuthorities, hasAuthority, getUser, getUserPosition, switchPosition }` (hepsi `Promise`). **Token/yetki erisimi icin standart yol budur.**

### golge-ui mi, ozel bilesen mi? (+ portal-ui/tapu-ui)
- **golge-ui kullan:** uygulama kabugu (`GolgeApp/GolgeAppBar/GolgeMain`), CRUD ekranlari (`GolgeTable/GolgeEntityForm/GolgeFilterForm/GolgeCrudLayout`), tema, router, e-imza, RTK API header/middleware, guvenlik hook'u. Bunlari yeniden yazmak golge ile tutarsizlik ve bakim yuku dogurur.
- **portal-ui / tapu-ui:** portal/tapu'ya ozgu paylasilan bilesen kutuphaneleri (MF'de `golge-ui` ile birlikte `portal-ui`, `portal-ui/ui`, `portal-ui/shared` singleton paylasilir). Domain-genel bilesen portal-ui/tapu-ui'de varsa onu kullan.
- **Ozel bilesen yaz:** yalniz domain'e cok ozgu, paylasilamaz UI icin — ve mumkunse golge `base`/tema primitifleri uzerine kur.

### Review kontrolleri (B.1)
- ❌ Tablo/form/filtre elle MUI ile sifirdan yazilmis: `GolgeTable`/`GolgeEntityForm`/`GolgeFilterForm` kullan.
- ❌ Token elle `localStorage`/cookie'den okunuyor: `useGolgeSecurity().getToken()` veya `golgeRtkApiHeaders` kullan.
- ❌ Tarih/input/config islemleri elle: `golge-ui/utils` icinde var.
- ❌ E-imza akisi elle: `golge-ui/eimza` (`EImzaModal`) kullan.

---

## B.2 Module Federation Mimarisi — Yasak: /["']{1}(?:golge-ui|react|react-dom|react-router-dom|portal-ui)["']\s*:\s*\{(?![^}]*singleton\s*:\s*true)/

**Host/shell:** `dis-portal-mf-shell-web` (port 5100). **Remote'lar:** `<ad>-web` (taraf 3005, zeminsorgu 5101, ...). Plugin: `@module-federation/vite`. Runtime: `@module-federation/runtime` + `runtime-tools` + `retry-plugin` (shell package.json `^0.21.6`).

### Shell (host) — dinamik remote kaydi
Shell `vite.config.ts`'te `remotes: {}` **bos** birakilir; remote'lar **runtime'da** manifest'ten yuklenir (`src/remotes/loader.ts`):

```ts
import { loadRemote, registerRemotes } from '@module-federation/runtime';
const manifestUrl = import.meta.env.DEV ? '/remotes.dev.json' : '/remotes.json';
// fetch -> registerRemotes(remotesMap, { force: true }) -> loadRemote(remotePath)
```

Shell ayrica `./shared` (`src/mf-shared.ts`) expose eder; remote'lara `getShellAuthToken()` saglar (`window.__SHELL_AUTH__`).

### Remote — expose + shell'i remote olarak alma
- `taraf-web`: `name: 'tarafApp'`, `filename: 'remoteEntry.js'`, expose: `./KisiLayout`, `./TuzelKisiLayout`, `./TipDegerVarlikApi`.
- `zemin-sorgu-web`: `name: 'immovable_property_processes'`, expose: `./App`, ve **shell'i remote alir** (`remotes.shell` -> `http://localhost:5100/remoteEntry.js`) ki paylasilan auth token'ina (`shell/shared`) erisebilsin.

### SHARED / SINGLETON bagimliliklar
Cogu config benzer bir shared blok kullanir (singleton + eager), ama **bloklar birebir ayni DEGILDIR** — dogrulandi: shell ve zeminsorgu (`zemin-sorgu-web`) config'leri `@reduxjs/toolkit`/`react-redux`'u shared'a koyar, ama `taraf-web` koymaz (taraf-web shared'i yalniz `react`, `react-dom`, `react-router-dom`, `@mui/*`, `portal-ui`/`portal-ui/ui`/`portal-ui/shared`, `golge-ui` icerir). Asagidaki blok **kanonik ornek**tir, tum config'lere dayatilan tek dogru sablon degil; review'da farkliliklarin **kasitli** olup olmadigini sorgulayin (orn. remote redux store paylasimina ihtiyac duyuyorsa redux singleton'i eksik birakmamali).

```ts
// Ornek (shell/zeminsorgu); taraf-web redux satirlarini icermez.
shared: {
  react:            { singleton: true, eager: true },
  'react-dom':      { singleton: true, eager: true },
  'react-router-dom': { singleton: true, eager: true },
  '@reduxjs/toolkit': { singleton: true, eager: true },   // store paylasimi — taraf-web'de YOK
  'react-redux':    { singleton: true, eager: true },     // taraf-web'de YOK
  '@mui/material':  { singleton: true, eager: true },
  '@mui/icons-material': { singleton: true, eager: true },
  '@mui/system':    { singleton: true, eager: true },
  'portal-ui':      { singleton: true, eager: true, version: false, requiredVersion: false },
  'portal-ui/ui':   { singleton: true, eager: true, version: false, requiredVersion: false },
  'portal-ui/shared': { singleton: true, eager: true, version: false, requiredVersion: false },
  'golge-ui':       { singleton: true, eager: true, version: false, requiredVersion: false },
}
```

> **NEDEN singleton:** React (hooks/context), react-router (tek router context), Redux (tek store), MUI/Emotion (tek tema + tek CSS cache), golge-ui (tek `useGolgeSecurity` context). Iki kopya yuklenirse: "Invalid hook call", kaybolan context, cift tema/CSS, bozuk auth. `golge-ui`/`portal-ui*` icin `version: false, requiredVersion: false` — surum uyumsuzlugunda hard fail yerine tek instance zorlanir.

> **dedupe/optimizeDeps.dedupe** tum config'lerde ayni listeyi (`react`, `react-dom`, `react-router-dom`, `@remix-run/router`, `@mui/*`, `@emotion/*`, `golge-ui`) icerir — Vite'in dev'de cift kopya bundlelamasini engeller. Bu blok her remote'ta TUTARLI olmali.

### Auth / token ve routing
- Token paylasimi: birincil `golgeRtkApiHeaders`/`useGolgeSecurity().getToken()`; alternatif `shell/shared` -> `getShellAuthToken()` (`window.__SHELL_AUTH__`).
- Routing: tek `react-router-dom` singleton; remote'lar shell'in router context'i icine mount edilir (`MicroAppRenderer` `loadRemote` + 10sn timeout ile).
- Proxy/auth (dev): her web'in vite proxy'si `/api`'yi backend'e yonlendirir, `referer/referrer/origin` header'larini temizler, `Referrer-Policy: no-referrer` ekler; shell `tasinmaz` proxy'sinde cookie'den token fallback yapar.

### golge-ui surum uyumu (RISK)
Repolar arasi golge-ui surum dagilimi (dogrulandi): cogu `1.16.x`, ama hala `^1.0.0` (3 repo) ve `^1.2.0` (3 repo) kullanan var. Singleton paylasimda **tek instance** yuklenir; 1.0.x/1.2.x bekleyen bir remote 1.16.x ile calismak zorunda kalirsa **kirilma** (kayip export, degisen API) olur.

### Review kontrolleri (B.2)
- ❌ Yeni remote'un `shared` blogunda **ortak/zorunlu** bagimliliklar (react, react-dom, react-router-dom, @mui/*, golge-ui, portal-ui*) singleton olarak paylasilmamis: "Invalid hook call"/cift tema/bozuk auth. Bu cekirdek listeyi shell ile hizala. (Not: redux/`react-redux` her remote'ta olmak zorunda degil — shell/zeminsorgu paylasir, taraf-web paylasmaz; ama bir remote shell store'unu/redux'i gercekten paylasiyorsa `@reduxjs/toolkit`+`react-redux` singleton'i da eksiksiz olmali, yoksa cift store olusur.)
- ❌ React/React-DOM/MUI/golge-ui surumleri remote ile shell arasinda **major** olarak farkli: singleton tek surum yukleyince digeri kirilir. package.json surumlerini hizala (golge-ui'yi 1.16.x'e cek).
- ❌ Token elle remote'a prop olarak gecilmis: `useGolgeSecurity`/`golgeRtkApiHeaders`/`getShellAuthToken` standardini kullan.
- ❌ Remote `dedupe`/`optimizeDeps.dedupe` listesi eksik: dev'de cift kopya. Standart listeyi ekle.
- ❌ Remote kendi `react-router`'ini izole yuklemis (singleton degil): navigasyon shell ile kopar.
- ⚠️ `GolgeVitePlugin()` eksik (taraf/shell var, zeminsorgu config'inde yok): golge build/transform davranisi tutarsiz olabilir — gerekliligini dogrula.
- ⚠️ Remote `remoteEntry.js` adi/`name` cakismasi: shell `registerRemotes` scope'a gore dedup eder; iki remote ayni `name` kullanmamali.

---


---

## Hizli Referans — Frontend "kirmizi bayraklar"

shared blok shell ile uyumsuz · react/mui/golge-ui major surum farki · token elle localStorage/prop · dedupe listesi eksik · elle tablo/form (golge CRUD bilesenleri varken) · golge-ui `^1.0.x`/`^1.2.x` (1.16.x'e cek).

---

## Ilgili Dosyalar

- `/home/kerim/repositories/taraf/taraf-web/node_modules/golge-ui/dist/*.d.ts` + `package.json` (v1.16.10 export'lari)
- MF config: `/home/kerim/repositories/dis-portal-mf-shell/dis-portal-mf-shell-web/vite.config.ts` (+ `src/remotes/loader.ts`, `src/mf-shared.ts`), `/home/kerim/repositories/taraf/taraf-web/vite.config.ts`, `/home/kerim/repositories/zeminsorgu/zemin-sorgu-web/vite.config.ts`

**Backend tarafi** (golge-* jar'lari) ayri dokumanda: [04-golge-framework-backend.md](04-golge-framework-backend.md).

**Capraz-link:** React standartlari [01-react-code-review.md](01-react-code-review.md); frontend PR checklist'i [05-frontend-checklist.md](05-frontend-checklist.md).
