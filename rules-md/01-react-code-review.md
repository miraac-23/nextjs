# React Code Review Dokumani

> TAKBIS mikro-frontend ekosistemi (`taraf-web`, `islem-yonetimi-web`, `fen-kayit-web` ve diger `<is-alani>-web` repolari) icin React kod review standartlari.
> Bu dokuman, code review ve kod revizyonu sirasinda **referans** olarak kullanilir. Her standart icin uc soruyu yanitlar:
> **(a) NEDEN onemli — (b) Review'da NASIL tespit edilir — (c) NASIL duzeltilir (revizyon, mumkunse before/after).**
> Tum ornekler gercek repo dosyalarindan alinmistir; iddialar gercek koda dayanir.

---

## Icindekiler

1. [Amac & Kapsam](#1-amac--kapsam)
2. [Arka Plan / Mimari Ozet](#2-arka-plan--mimari-ozet)
3. [Standartlar & Konvansiyonlar](#3-standartlar--konvansiyonlar)
   - [3.1 Component Yapisi & Dosya Organizasyonu](#31-component-yapisi--dosya-organizasyonu)
   - [3.2 State Yonetimi](#32-state-yonetimi)
   - [3.3 Hook Kullanimi](#33-hook-kullanimi)
   - [3.4 Performans](#34-performans)
   - [3.5 Okunabilirlik & TypeScript](#35-okunabilirlik--typescript)
   - [3.6 Tekrar Kullanilabilirlik](#36-tekrar-kullanilabilirlik)
   - [3.7 Routing (react-router 6)](#37-routing-react-router-6)
   - [3.8 Axios Servis Katmani](#38-axios-servis-katmani)
   - [3.9 RTK Query apiSlice Deseni](#39-rtk-query-apislice-deseni)
   - [3.10 MUI 6 Tema, sx ve styled](#310-mui-6-tema-sx-ve-styled)
   - [3.11 Form, Maskeleme ve Dogrulama](#311-form-maskeleme-ve-dogrulama)
   - [3.12 i18n (react-i18next)](#312-i18n-react-i18next)
   - [3.13 Erisilebilirlik (a11y)](#313-erisilebilirlik-a11y)
4. [Sik Hatalar & Anti-Pattern'ler (before/after)](#4-sik-hatalar--anti-patternler-beforeafter)
5. [Hizli Referans (Review Checklist)](#5-hizli-referans-review-checklist)
6. [Ilgili Dosyalar & Capraz-Linkler](#6-ilgili-dosyalar--capraz-linkler)

---

## 1. Amac & Kapsam

Bu dokuman, TAKBIS frontend mikro-servislerinde acilan PR'larin **tutarli, olculebilir ve gerekceli** bir sekilde gozden gecirilmesini saglar. Kapsadigi alanlar:

- **Component yapisi**: dosya organizasyonu (`features/services/components/pages/hooks` deseni), container/presentational ayrimi, isimlendirme, tek-sorumluluk, bilesen boyutu.
- **State yonetimi**: Redux Toolkit slice vs RTK Query `apiSlice` vs yerel `useState`/`useReducer`/`useContext`; turetilmis state; global/lokal sinir; immutability.
- **Hook kullanimi**: hook kurallari, `useEffect` dogru kullanim + cleanup + bagimlilik dizileri, custom hook tasarimi, kosullu hook yasagi.
- **Performans**: `React.memo`/`useMemo`/`useCallback`, gereksiz re-render, `react-window` sanallastirma, kod bolme (`lazy`+`Suspense`), referans kararliligi.
- **Okunabilirlik**: JSX sadeligi, erken donus, isimlendirme, TS tipleme, `any` yasagi, ESLint `--max-warnings 0`.
- **Tekrar kullanilabilirlik**: paylasilan bilesen/hook, `golge-ui` bilesenlerinden yararlanma, prop/kompozisyon tasarimi, kopyalama-karsiti.

Ek alanlar: react-router 6 (korumali rota, lazy), axios servis katmani, RTK Query deseni, MUI 6 tema/sx/styled, form maskeleme + dogrulama, i18n, erisilebilirlik.

**Hedef kitle**: PR review yapan gelistirici ve teknik liderler. **Cikti**: review yorumlari icin gerekceli, kopyalanabilir oneri ve revizyon onerileri.

---

## 2. Arka Plan / Mimari Ozet

### 2.1 Teknoloji Yigini (dogrulanmis surumler)

| Alan | taraf-web | islem-yonetimi-web | fen-kayit-web |
| --- | --- | --- | --- |
| React | `^18.3.1` | `^18.2.0` | 18.x |
| TypeScript | `^5.8.3` | `~5.8.2` | 5.x |
| Vite | `^6.3.5` | `^6.2.0` | 6.x |
| MUI | `@mui/material ^6.3.1` | `^6.1.7` | 6.x |
| Redux Toolkit | `^2.2.3` | `^2.2.3` | 2.x |
| react-router-dom | `^6.26.1` | `^6.26.1` | 6.x |
| axios | `^1.7.7` | `^1.7.2` | 1.x |
| golge-ui | `1.16.10` | `1.16.10` | 1.16.x |
| ESLint | `^8.56.0` (legacy `.eslintrc.cjs`) | `^9.39.2` (flat `eslint.config.js`) | flat config |
| i18n | yok | `react-i18next ^15.1.3`, `i18next ^25.4.1` | — |

> **Surum notu (zorunlu):** Kesin surumleri DAIMA ilgili `package.json`'dan dogrula. ESLint surumu repodan repoya degisir (taraf-web legacy `.eslintrc.cjs`, islem-yonetimi-web flat config). Inceleme yaparken hangi config'in gecerli oldugunu kontrol et.

### 2.2 Mikro-Frontend Mimarisi

- **Module Federation** (`@module-federation/vite`): `dis-portal-mf-shell` = host/shell, her `<is-alani>-web` = remote.
- Cikis noktasi `main.tsx` -> `App.tsx` (sadece `<Routes>`) -> `InnerAppDev.tsx` (yetki + layout) deseni tum repolarda tekrar eder.
- **Standalone tespiti**: `taraf-web` `isStandaloneRun()` ile shell icinde mi yoksa bagimsiz mi calistigini ayirt eder (`InnerAppDev.tsx`).
- **golge-ui** ortak UI/altyapi kutuphanesi. Export alt-yollari: `.`, `./utils`, `./eimza`, `./theme`, `./router`, `./styles`. Onemli export'lar (gercek, `golge-ui/dist/index.d.ts`'ten):
  - `GolgeApi` (axios factory), `golgeRtkApiHeaders` (RTK Query `prepareHeaders`), `golgeErrorMiddleware`
  - `GolgeApp`, `GolgeAppBar`, `GolgeMain`, `GolgeFooter`, `GolgeCrudLayout`, `GolgeDraggableDialog`, `GolgeInfoCard`, `GolgeTreeView`
  - `enqueueSnackbar`, `useGolgeSecurity` (yetki: `hasAuthority`, `logout`)
  - `golge-ui/theme` -> `GolgeThemeProvider`; `golge-ui/router` -> `GolgeRouter` + re-export `react-router-dom`

### 2.3 Klasor Deseni

**Hafif/orta repo (`taraf-web`):** duz `src/` deseni:
```
src/
  app/        store.ts, hooks.ts (typed useAppDispatch/useAppSelector), *Slice.ts
  features/   RTK Query apiSlice'lar (tuzelKisiBilgileriApiSlice.ts, ext/deger/degerApiSlice.ts)
  services/   axios tabanli API (GercekKisiApi.ts, api.tsx = client factory)
  components/ paylasilan/alan bilesenleri (snackbar/, takbisBelge/, dataGrid/)
  pages/      ekran bilesenleri (Kisi.tsx, KisiListesi/, YeniKisi/)
  hooks/      custom hook (useResponsive.ts, useSearchKamu.tsx)
  contexts/   React Context (AuthTokenContext, KisiContext, YeniKisiContext)
  layouts/    TarafLayout, KisiLayout, SideBarMenu
  enums/, constants/, types/, utils/, _mock/
```

**Buyuk repo (`islem-yonetimi-web`):** **feature-sliced** yapi:
```
src/
  app/        store.ts (combineReducers + 25+ reducerPath), middlewares.ts, hooks.ts
  features/   <domain>/ (islem-tanimlari/, kural-motoru/, formul-motoru/, ...)
              her domain: *ApiSlice.ts + pages/ + components/ + shared/(constants,types,utils) + context/ + hooks/ + i18n/
  shared/     cross-domain: hooks/ (useLocalStorage, useBreakpoint, tasks/), lib/ (validation, errorHandling, performance), types/
  styles/, types/, utils/, shims/
```

> Review kurali: **Repo deseni hangisiyse ona uy.** `taraf-web`'e feature-sliced klasor, ya da `islem-yonetimi-web`'e duz `services/` eklemek tutarsizlik yaratir.

---

## 3. Standartlar & Konvansiyonlar

### 3.1 Component Yapisi & Dosya Organizasyonu

#### S-3.1.1 Tek sorumluluk ve bilesen boyutu
**(a) Neden:** 300+ satirlik, hem veri cekme hem is mantigi hem cok sekmeli UI iceren bilesenler test edilemez ve re-render maliyeti yuksektir.
**(b) Tespit:** Bir `.tsx` dosyasi >250-300 satir, 5+ `useState`, ic ice 3+ kosullu JSV blogu iceriyorsa. Bir bilesenin hem `fetch` hem prezentasyon yaptigini gor.
**(c) Duzeltme:** Container (veri/mantik) ile presentational (sadece prop alip render) ayir; tekrar eden alt-bloklari ayri dosyaya cikar. `islem-yonetimi-web` bunu dogru yapar: `IslemTanimTree.tsx` (mantik/sanallastirma) + `TreeNodeItem.tsx` (`memo`'lu satir) + `TreeNodeRow` ayri bilesenler.

#### S-3.1.2 Container / Presentational ayrimi
**(a) Neden:** Saf prezentasyon bilesenleri `React.memo` ile kolayca optimize edilir; mantikla karisinca memo etkisiz kalir.
**(b) Tespit:** Render fonksiyonu icinde dogrudan `apiSlice` hook + `useEffect` + buyuk JSX.
**(c) Duzeltme:** Veri cekme custom hook'a (`useTaskFiltering`, `useSearchKamu`), prezentasyon saf bilesene. Ornek: `taraf-web/src/hooks/useSearchKamu.tsx` arama mantigini sarar, tuketici bilesen sadece `searchKurum` cagirir.

#### S-3.1.3 Isimlendirme konvansiyonu
**(a) Neden:** Tutarli isim, dosya/sembol aramasini hizlandirir.
**(b)/(c) Kurallar (gercek koddan dogrulanmis):**

| Tur | Konvansiyon | Gercek ornek |
| --- | --- | --- |
| Bilesen dosyasi & export | `PascalCase` | `Kisi.tsx` → `export default function Kisi(...)` |
| Custom hook | `useXxx` (camelCase) | `useResponsive.ts`, `useSearchKamu.tsx`, `useLocalStorage.ts` |
| RTK Query slice | `xxxApiSlice` / `xxxApi` | `tuzelKisiBilgileriApiSlice`, `tipDegerVarlikApi` |
| Redux slice | `xxxSlice` + `xxxReducer` default export | `geldigiBilesenSlice.ts` |
| axios servis | `XxxApi.ts` + fonksiyon `fiilNesne` | `GercekKisiApi.ts` → `getGercekKisiById`, `ekleGercekKisi` |
| Context | `XxxContext` + `XxxProvider` + `useXxx` | `KisiContext.tsx` → `KisiProvider`, `useKisi` |

> Domain dili **Turkce**'dir; alan adlari Turkce (`tcKimlikNo`, `basvuruRef`), React/teknik terimler Ingilizce kalir.

#### S-3.1.4 Hook iceren dosya uzantisi
**(b) Tespit:** JSX donen hook/util `.ts` uzantili (`useSearchKamu.tsx` dogru cunku JSX/`ReactNode` icerir, `useResponsive.ts` dogru cunku JSX yok).
**(c) Duzeltme:** JSX iceren dosya `.tsx`, salt mantik `.ts`.

✅ **Dogru** (taraf-web `app/hooks.ts` — tiplenmis Redux hook'lari tek yerde):
```ts
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from './store';
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```
❌ **Yanlis:** Her bilesende `useDispatch<AppDispatch>()` tekrar yazmak veya tiplenmemis `useSelector` kullanmak.

---

### 3.2 State Yonetimi

#### S-3.2.1 Dogru state mekanizmasini sec
**(a) Neden:** Yanlis katman secimi (her seyi Redux'a, ya da sunucu verisini `useState`'e) gereksiz boilerplate, stale-data ve cift-kaynak sorunu yaratir.
**(b) Tespit:** Asagidaki karar tablosuna gore sapma ara.
**(c) Karar tablosu:**

| Veri turu | Mekanizma | Gerekce / gercek ornek |
| --- | --- | --- |
| **Sunucu verisi** (CRUD, liste, detay) | **RTK Query `apiSlice`** | Cache, dedupe, invalidation otomatik. `islemTanimlariApi`, `varlikApiSlice` |
| **Global UI/akis durumu** (secili sekme, "geldigi bilesen") | **Redux slice** | `geldigiBilesenSlice` |
| **Form/ekran-lokal durum** | `useState` / `useReducer` | `Kisi.tsx`: `gorunumUserPage`, `secilenKisi` |
| **Karmasik lokal state makinesi** | `useReducer` | `DuzenleyenSelect.tsx` arama state'i (`dispatch({ type: 'FETCH_START' })`) |
| **Alt-agaca yayilan, nadiren degisen deger** | `useContext` | `TreeContext`, `GeldigiBilesenContext` |
| **Tarayici kalici durum** | `useLocalStorage` (shared hook) | `islem-yonetimi-web/shared/hooks/useLocalStorage.ts` |

#### S-3.2.2 Sunucu verisini `useState`'e kopyalama
**(a) Neden:** RTK Query/axios sonucunu `useState`'e kopyalamak senkronizasyon ve stale-data hatasi dogurur.
**(b) Tespit:** `const { data } = useGetXQuery(); const [items, setItems] = useState([]); useEffect(() => setItems(data), [data])` kalibi.
**(c) Duzeltme:** Dogrudan `data`'yi kullan; turetilmis deger gerekiyorsa `useMemo` ile turet (asagi bkz).

#### S-3.2.3 Turetilmis state'i state olarak tutma
**(a) Neden:** Hesaplanabilir degeri ayrica state'te tutmak iki kaynagi senkron tutma yuku getirir.
**(b) Tespit:** `useEffect` icinde baska state'ten yeni state set ediliyor.
**(c) Duzeltme — render'da turet (gercek ornek, `useTaskFiltering.ts`):**
```ts
// Sunucudan gelen tasklar useMemo ile donusturulur, ayri state tutulmaz
const banaAtananTasks = useMemo(
  () => banaAtananCamundaTasks.map((ct) =>
    camundaTaskToTask(ct, processVariablesMap[ct.processInstanceId], TaskStatus.IN_PROGRESS)),
  [banaAtananCamundaTasks, processVariablesMap]
);
```

#### S-3.2.4 Immutability (RTK / Immer)
**(a) Neden:** RTK reducer'lari Immer ile calisir; reducer disinda state'i mutasyona ugratmak buglara yol acar.
**(b) Tespit:** Reducer **icinde** `state.x = y` dogru (Immer); reducer **disinda** `obj.x = y` ile store/props mutasyonu yanlis.
**(c) Dogru (gercek, `geldigiBilesenSlice.ts`):**
```ts
reducers: {
  setGeldigiBilesen: (state, action: PayloadAction<GeldigiBilesenType>) => {
    state.geldigiBilesen = action.payload; // Immer: guvenli
  },
}
```

#### S-3.2.5 Global vs lokal sinir + cift state-kaynagi yasagi
**(a) Neden:** Ayni durumu hem Context hem Redux'ta tutmak ("iki kaynak") en sik kok-neden hatadir.
**(b) Tespit:** Bir kayit/secim hem React Context'te hem store'da tutuluyor; ya da bir deger hem React state hem **modul-seviye mutable** degiskende tutuluyor.
**(c) Gercek anti-pattern — `AuthTokenContext.tsx` (kod icinde TODO ile isaretli):**
```tsx
let authToken: string | null = null;              // modul-seviye kaynak (axios bunu okur)
export const getAuthToken = (): string | null => authToken;
// + ayni token Context state'inde de tutulur, useEffect ile senkronlanir
```
> Risk: token degisiminden hemen sonra atilan istek **eski** token tasiyabilir (senkronizasyon useEffect'e bagli). **Cozum:** tek kaynak (provider mount'ta senkron set, ya da store'dan `getState`). `KisiContext.tsx` ve `TuzelKisiContext.tsx` benzer sekilde Redux varken ayri Context tutar — **secili kayit** Redux'a tasinmali.

---

### 3.3 Hook Kullanimi

#### S-3.3.1 Hook Kurallari (Rules of Hooks) — `error` seviyesi
**(a) Neden:** Kosullu/dongusel hook cagrisi React'in hook sirasi varsayimini bozar, calisma-zamani crash uretir. `react-hooks/rules-of-hooks` her iki repoda da **`error`**.
**(b) Tespit:** Hook cagrisi `if`/`for`/`.map`/`.reduce`/erken-`return` sonrasinda. ESLint yakalar; `eslint-disable react-hooks/rules-of-hooks` yorumu **kirmizi bayrak**.
**(c) Gercek ihlal — `taraf-web/src/hooks/useResponsive.ts` `useWidth()`:**
```ts
// ❌ YANLIS: useMediaQuery .reduce callback'i icinde cagriliyor (kosullu hook)
keys.reduce<Breakpoint | null>((output, key) => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const matches = useMediaQuery(theme.breakpoints.up(key));
  return !output && matches ? key : output;
}, null)
```
```ts
// ✅ DOGRU: tum breakpoint'ler ust-seviyede kosulsuz hesaplanir, sonra duz mantikla secilir
const xs = useMediaQuery(theme.breakpoints.up('xs'));
const sm = useMediaQuery(theme.breakpoints.up('sm'));
const md = useMediaQuery(theme.breakpoints.up('md'));
const lg = useMediaQuery(theme.breakpoints.up('lg'));
const xl = useMediaQuery(theme.breakpoints.up('xl'));
// ...sonra duz if/return ile en buyuk eslesen breakpoint dondurulur
```
> Ayni dosyada `useResponsive()` dogru desen sergiler: tum `useMediaQuery` cagrilari kosulsuz yapilir, secim sonradan `if`'lerle olur (yorum: "Hook must be called unconditionally").

#### S-3.3.2 `useEffect` — dogru kullanim, cleanup, bagimlilik dizisi
**(a) Neden:** Eksik cleanup => listener/abort sizinti; eksik/fazla bagimlilik => stale closure ya da sonsuz dongu.
**(b) Tespit:** `addEventListener`/`setInterval`/`AbortController`/subscription olup cleanup donmeyen effect; `// eslint-disable react-hooks/exhaustive-deps` yorumu; effect icinde set edilen state'in bagimlilikta olmasi (sonsuz dongu).
**(c) Dogru — cleanup donen effect (gercek, `InnerAppDev.tsx`):**
```tsx
useEffect(() => {
  const handleAuthError = () => { (async () => { await logout(); })(); };
  window.addEventListener('taraf:auth-error', handleAuthError);
  return () => window.removeEventListener('taraf:auth-error', handleAuthError); // cleanup
}, [logout]);
```
**(c) Dogru — `AbortController` ile istek iptali (gercek, `DuzenleyenSelect.tsx`):**
```tsx
abortControllerRef.current?.abort();
abortControllerRef.current = new AbortController();
// ...
const result = await fetchOptions(text, page, size, abortControllerRef.current.signal);
// catch icinde:
if ((err as Error).name !== 'AbortError') { /* gercek hatayi isle */ }
```
> Review notu: `useEffect` icinde `async` fonksiyon dogrudan verilmez (cleanup yerine Promise doner). Ic IIFE veya ic `async function` + cagri kullanilir (yukaridaki `handleAuthError` ornegi).

#### S-3.3.3 Custom hook tasarimi
**(a) Neden:** Tekrar eden mantik (storage, arama, filtre, responsive) hook'a cikarilirsa test edilebilir ve paylasilir olur.
**(b) Tespit:** Iki+ bilesende ayni `useState`+`useEffect` blogu kopyalanmis.
**(c) Iyi ornekler (gercek):**
- `useLocalStorage<T>` (`islem-yonetimi-web/shared/hooks`): SSR guard, JSON parse, cross-tab `storage` event listener + cleanup, `useCallback`'li `setValue`/`removeValue`. **Referans sablon.**
- `useTaskFiltering` (`shared/hooks/tasks`): `useMemo` ile turetilmis listeler, `useCallback`'li handler, alt-hook kompozisyonu (`useTaskAuthority`, `useTaskFetching`, `useTaskGrouping`).
- `useSearchKamu` (`taraf-web`): `useLazySearchKamuQuery` sarmalar, `useCallback([searchKamu])` ile referans kararliligi.

#### S-3.3.4 Custom hook'ta hata yutma
**(a) Neden:** Yeni `Error` firlatirken orijinal hatayi `cause` ile gecmemek tani yetenegini kaybettirir (SonarQube S2737/benzeri).
**(b) Tespit:** `catch (e) { throw new Error('...') }` — `e` kullanilmiyor.
**(c) Duzeltme (gercek, `useSearchKamu.tsx` TODO):**
```ts
// ❌  throw new Error('Kamu arama işlemi başarısız oldu');
// ✅  throw new Error('Kamu arama işlemi başarısız oldu', { cause: error });
```

---

### 3.4 Performans

#### S-3.4.1 `useMemo` / `useCallback` — dogru yerde, dogru bagimlilikla
**(a) Neden:** Pahali hesaplamayi (`.map`/`.filter` zincirleri) ve `memo`'lu cocuga gecen fonksiyon/objeyi sabitlemek gereksiz re-render'i onler. Asiri kullanim ise gurultu yaratir (her ilkel deger icin `useMemo` gereksiz).
**(b) Tespit:**
- `memo`'lu cocuga **inline** `() => {}` / `{...}` / `[...]` prop geciliyor → her render yeni referans → memo etkisiz.
- Pahali liste donusumu her render'da `useMemo`siz calisiyor.
- Tersine: `useMemo(() => a + b, [a, b])` gibi ilkel-aritmetik gereksiz.
**(c) Dogru (gercek, `IslemTanimTree.tsx`):**
```ts
const filteredTree   = useMemo(() => /* arama filtresi */, [tree, searchQuery]);
const flatItems      = useMemo(() => flatten(filteredTree, expandedIds), [filteredTree, expandedIds]);
const handleToggle   = useCallback((id: string) => /* ... */, []);
const treeContextValue = useMemo(() => ({ selectedId, expandedIds, onToggle, /* ... */ }), [/* deps */]);
const rowProps       = useMemo<TreeRowProps>(() => ({ flatItems }), [flatItems]);
```
> `treeContextValue`'nun `useMemo` ile sarilmasi **kritik**: Context value her render'da yeni obje olursa tum tuketiciler re-render olur.

#### S-3.4.2 `React.memo` ile saf bilesen
**(a) Neden:** Sik render edilen liste/agac satirlari icin `memo`, prop degismedikce render'i atlar.
**(b) Tespit:** Buyuk listede satir bilesi `memo`'suz; ya da `memo`'lu ama her render degisen prop (inline fn) aliyor.
**(c) Dogru (gercek, `TreeNodeItem.tsx`):**
```tsx
const TreeNodeRow = memo(function TreeNodeRow({ node, level, hasChildren, hasBaslamaSekiller, style }: {...}) {
  // ... satir render
});
```

#### S-3.4.3 Sanallastirma (`react-window`)
**(a) Neden:** Yuzlerce-binlerce satirli liste/agac DOM'a tam basilirsa scroll/initial-render coker.
**(b) Tespit:** Buyuk dinamik liste `.map` ile dogrudan render ediliyor, sanallastirma yok.
**(c) Dogru (gercek, `IslemTanimTree.tsx` — `react-window` v2 `List`):**
```tsx
import { List } from 'react-window';
<List<TreeRowProps>
  rowComponent={TreeRow}
  rowCount={flatItems.length}
  rowHeight={ROW_HEIGHT}
  rowProps={rowProps}
  style={{ height: '100%', overflow: 'auto' }}
/>
```
> Not: `islem-yonetimi-web` `react-window ^2.2.6` kullanir (yeni `List` API, `rowComponent`/`rowProps`). Eski `FixedSizeList` API'siyle karistirma.

#### S-3.4.4 Kod bolme (`lazy` + `Suspense`)
**(a) Neden:** Agir, nadiren acilan ekranlar (PDF viewer, BPMN/DMN editor, Monaco) ana bundle'i sismeden ayri chunk'a alinmali.
**(b) Tespit:** Buyuk bagimlilik (`bpmn-js`, `monaco-editor`, `@react-pdf-viewer`) statik `import` ile ana yola bagli; rota seviyesinde `lazy` yok.
**(c) Duzeltme:**
```tsx
const BpmnEditor = React.lazy(() => import('./features/islem-bpmn/BpmnEditor'));
<Suspense fallback={<GolgeLoader />}>
  <BpmnEditor />
</Suspense>
```
> Mevcut repolarda rota seviyesinde `lazy` **az** kullanilir (`fen-kayit`/`taraf` `<Routes>` icinde statik element). Agir alt-ekranlar icin review'da `lazy` onerilebilir.

#### S-3.4.5 Referans kararliligi (Context value, prop objeleri)
**(a) Neden:** Provider `value={{...}}` inline ise her render'da yeni referans → tum tuketiciler re-render.
**(b) Tespit:** `<Ctx.Provider value={{ a, b }}>` inline obje; handler'lar `useCallback`'siz.
**(c) Dogru (gercek, `GeldigiBilesenContext.tsx`): `updateBilesen`/`updateBasvuruRef` `useCallback([])` ile sabit; ama value objesi inline — buyuk agaclarda `useMemo` ile sarmak iyilestirme olur (review onerisi).**

---

### 3.5 Okunabilirlik & TypeScript

#### S-3.5.1 ESLint `--max-warnings 0` — uyarisiz birlestirme
**(a) Neden:** Tum repolarda `lint` script'i `--max-warnings 0` (sifir uyari). Uyari = CI kirmizi.
**(b) Tespit (gercek script'ler):**
```
"lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0"
```
PR'da yeni `eslint-disable` direktifi, yeni `: any`, kullanilmayan degisken/import.
**(c) Duzeltme:** Uyariyi kapatmak yerine kok-nedeni gider. `--report-unused-disable-directives` gereksiz `eslint-disable`'lari da hata yapar — olu disable'lari kaldir.

> Aktif kurallar (dogrulanmis):
> - `react-hooks/rules-of-hooks: 'error'` (her iki repo)
> - `react-hooks/exhaustive-deps: 'warn'`
> - `@typescript-eslint/no-explicit-any: 'warn'`
> - `no-console: 'warn'` (islem-yonetimi'de `warn/error/debug/group/table` izinli)
> - islem-yonetimi ek: `prefer-const: 'error'`, `no-var: 'error'`, `eqeqeq: 'error'` (`null` ignore), `no-non-null-assertion: 'warn'`

#### S-3.5.2 `any` yasagi ve TS strict
**(a) Neden:** `any` tip guvenligini kaldirir; tuketiciler derin opsiyonel zincirle korumasiz erisir. `tsconfig.json`: `strict: true`, `noUnusedLocals/Parameters: true`, `noFallthroughCasesInSwitch: true`.
**(b) Tespit:** `: any`, `as any`, `Promise<any>`. (taraf-web'de su an ~29 `any`/`as any` eslesmesi var — hepsi TODO ile isaretli teknik borc.)
**(c) Duzeltme (gercek ornekler):**
```ts
// ❌ varlikApiSlice.ts
transformResponse: (response: any) => ({ tipVarlikListe: response?.content ?? [] })
// ✅
interface VarlikPageResponse { content: VarlikDto[] }
transformResponse: (r: VarlikPageResponse) => ({ tipVarlikListe: r?.content ?? [] })
```
```ts
// ❌ KisiContext.tsx
interface KisiContextType { kisi: any; setKisi: any; }
// ✅  (state zaten GercekKisiDto | null)
interface KisiContextType {
  kisi: GercekKisiDto | null;
  setKisi: React.Dispatch<React.SetStateAction<GercekKisiDto | null>>;
}
```
> `unknown` + tip-daraltma, `any`'ye tercih edilir. Gercek dogru kullanim: `lowercaseKeys(obj: unknown)` (`IslemTanimlariApiSlice.ts`), `logger.error(message?: unknown, ...)` (`utils/logger.ts`).

#### S-3.5.3 Erken donus (early return) & JSX sadeligi
**(a) Neden:** Derin ic-ice ternary ve cok kosullu JSX okunamaz.
**(b) Tespit:** 3+ kademeli `cond ? (...) : cond2 ? (...) : (...)`; render basinda guard yok.
**(c) Dogru (gercek, `InnerAppDev.tsx`): yetki yoksa erken donus:**
```tsx
if (yetkiliKullanici === false) {
  return <UnauthorizedScreen />;
}
// ana render asagida
```

#### S-3.5.4 `console.*` yerine merkezi logger
**(a) Neden:** `no-console: 'warn'` ve uretimde gurultu/sizinti. taraf-web `utils/logger.ts` sadece `import.meta.env.DEV`'de loglar.
**(b) Tespit:** Kaynak kodda dogrudan `console.log/error`.
**(c) Duzeltme:** `import { logger } from '../utils/logger'; logger.error(...)`. (islem-yonetimi tarafinda `shared/lib` ve middleware `notistack` ile kullanici-yonelik hatayi yonetir; ham `console`'dan kacin.)

#### S-3.5.5 Sabit kodlu URL/deger
**(a) Neden:** Kaynak koda gomulu URL ortamlar arasi tasinabilirligi bozar (SonarQube S1075).
**(b) Tespit:** Literal `https://...test.com.tr/...`.
**(c) Duzeltme (gercek, `tipDegerVarlikApi.ts` TODO): `.env`'e `VITE_REACT_APP_TIPDEGER_VARLIK_API_URL` ekle, `env.envTipdegerVarlikApiUrl` uzerinden coz; fallback literal'i kaldir.**

---

### 3.6 Tekrar Kullanilabilirlik

#### S-3.6.1 `golge-ui` bilesenlerini once kullan
**(a) Neden:** Ortak UI/altyapi `golge-ui`'de hazirdir; yeniden yazmak tutarsizlik ve bakim yuku dogurur.
**(b) Tespit:** El yapimi modal/snackbar/api-client/tema saglayicisi, oysa `golge-ui` karsiligi var.
**(c) Kullan (gercek import'lar):**
```tsx
import { GolgeModal, GolgeApp, enqueueSnackbar, useGolgeSecurity, golgeRtkApiHeaders } from 'golge-ui';
import { GolgeThemeProvider } from 'golge-ui/theme';
import { GolgeApi } from 'golge-ui'; // axios factory
```
Gercek kullanim: `Kisi.tsx` `GolgeModal`, `main.tsx` `GolgeApp` + `GolgeThemeProvider`, `api.tsx` `GolgeApi`, tum apiSlice'lar `golgeRtkApiHeaders`.

#### S-3.6.2 Kopyalama-karsiti: tekrar eden donusum/handler'i ortak yardimciya cikar
**(a) Neden:** Ayni eslemenin/handler'in N kez kopyalanmasi tek-nokta-degisim ilkesini bozar.
**(b) Tespit (gercek TODO'lar):**
- `GercekKisiApi.ts`: `{ content, totalElements, totalPages, number } → { liste, kayitSayisi, sayfaSayisi, sayfaNo }` donusumu 6+ kez tekrar → **`toListeResponse(pageResponse)`** yardimcisina cikarilmali.
- `api.tsx`: 404 → `showSnackBar(..., WARNING)` kalibi 20+ serviste try/catch ile tekrar → interceptor'a tasinmali (~200 satir azalir).
- `tuzelKisiBilgileriApiSlice` + 4 kardesi: ayni `baseQuery`/header, sadece `/mersis/*` endpoint farkli → tek `mersisApi` + `injectEndpoints`.
**(c) Duzeltme:** Ortak fonksiyon/interceptor/`injectEndpoints`. **Tekrar sayisini PR aciklamasinda belirt.**

#### S-3.6.3 Prop/kompozisyon tasarimi
**(a) Neden:** Cok sayida boolean prop yerine kompozisyon (`children`, slot) daha esnek ve okunur.
**(b) Tespit:** 6+ boolean prop alan bilesen; `prop drilling` 3+ seviye.
**(c) Duzeltme:** Context (`TreeContext` ornegi) veya kompozisyon. `Kisi.tsx` callback prop'lari (`guncelleGosterGizleNav`, `basilanButonGoruntuleMi`) — cok sayida ise context'e tasimayi degerlendir.

#### S-3.6.4 Paylasilan hook/lib konumu
**(a) Neden:** Cross-domain mantik feature icinde kalirsa cogaltilir.
**(b) Tespit:** Iki feature ayni hook'u kopyalamis.
**(c) Duzeltme:** `islem-yonetimi-web`'de `src/shared/{hooks,lib,types}` altina; `taraf-web`'de `src/hooks` veya `src/utils` altina. Ortak ekosistem mantigi varsa kutuphaneye (`golge-ui`, `fen-kayit-lib`) terfi degerlendir.

---

### 3.7 Routing (react-router 6)

#### S-3.7.1 Standart yerlesim
**(a) Neden:** Tutarli `App → InnerApp` deseni shell/standalone gecisini kolaylastirir.
**(b)/(c) Gercek desen:**
```tsx
// taraf-web App.tsx — sadece <Routes>, tek wildcard
<Routes><Route path="*" element={<InnerAppDev />} /></Routes>
```
```tsx
// fen-kayit-web App.tsx — parametreli + yonlendirme
<Routes>
  <Route path="/basvuru/:basvuruNo/*" element={<InnerAppDev/>}/>
  <Route path="/*" element={<Navigate to="/sorgulama"/>}/>
  <Route path="/sorgulama" element={<Sorgulama/>}/>
</Routes>
```
> `react-router-dom`'u dogrudan veya `golge-ui/router` (re-export + `GolgeRouter`) uzerinden import et. Iki kaynagi karistirma.

#### S-3.7.2 Korumali rota (yetki) deseni
**(a) Neden:** Yetkisiz kullanici hassas ekrani gormemeli.
**(b) Tespit:** Rota render'i `hasAuthority` kontrolu olmadan.
**(c) Gercek desen — `useGolgeSecurity().hasAuthority` ile guard:**
```tsx
// InnerAppDev.tsx (taraf): yetki cozulene kadar bekle, yoksa Unauthorized
const { hasAuthority } = useGolgeSecurity();
useEffect(() => { /* hasAuthority(Permission.X) -> setYetkiliKullanici */ }, [hasAuthority]);
if (yetkiliKullanici === false) return <UnauthorizedScreen />;
```
```tsx
// fen-kayit InnerAppDev: yetki + veri hazir olunca rota agacini ac
if (await hasAuthority('KDS_FK_GORUNTULE')) { getFenKayit().then(() => setRoutesReady(true)); }
{ routesReady && <Routes>...</Routes> }
```
> Review notu: `hasAuthority` **async**; yetki cozulmeden rota render edilmemeli (yukaridaki `routesReady`/`yetkiliKullanici` guard'lari). Rol kodlari `Permission` sabitlerinde (`constants/Permission`), backend `IY_*`/`KDS_*` desenleriyle uyumlu.

#### S-3.7.3 Rota seviyesinde `lazy`
Agir alt-ekranlar icin `React.lazy` + `<Suspense>` (bkz. S-3.4.4). Mevcut repolarda yaygin degil; agir editorler (BPMN/DMN/Monaco/PDF) icin onerilir.

---

### 3.8 Axios Servis Katmani

#### S-3.8.1 Merkezi client factory + interceptor
**(a) Neden:** Auth header, base URL, ortak hata isleme tek yerde toplanmali; her serviste tekrar edilmemeli.
**(b) Tespit:** `axios.create()` bilesende elle cagriliyor; her cagrida `Authorization` header'i elle ekleniyor.
**(c) Gercek desen — `services/api.tsx` (`getClient`) `golge-ui`'nin `GolgeApi`'sini sarar:**
```tsx
export const getClient = (options = {}): AxiosInstance => {
  const client = GolgeApi({ ...options, headers: { 'Content-Type': 'application/json', ...(options.headers||{}) } });
  client.interceptors.request.use((req) => {
    const token = getAuthToken();
    if (token) { req.headers.Authorization = `Bearer ${token}`; }
    return req;
  }, (e) => Promise.reject(e));
  client.interceptors.response.use(r => r, (error) => {
    switch (error.response?.status) {
      case 401: showSnackBar(MSG.KIMLIK_DOGRULAMA_HATASI, TYPE.ERROR);
                window.dispatchEvent(new CustomEvent('taraf:auth-error', { detail:{status:401} })); break;
      case 403: showSnackBar(MSG.ERISIM_ENGELLENDI, TYPE.WARNING); /* ... */ break;
      case 500: showSnackBar(MSG.TEKNIK_BIR_HATA_OLUSTU, TYPE.ERROR); break;
    }
    return Promise.reject(error);
  });
  return client;
};
```
```tsx
// tarafClient.tsx — tek instance, baseURL env'den
const tarafClient = getClient({ baseURL: env.envBaseUrl });
```

#### S-3.8.2 Tekil instance kullan, header'i elle ekleme
**(b) Tespit (gercek TODO, `GercekKisiApi.ts`):** `getNviKisi`/`getNviKisiAdres` cagrilarinda `Accept`/`Content-Type` **elle** veriliyor — oysa ortak client zaten `Content-Type` ekliyor.
**(c) Duzeltme:** Fazla header tanimlarini kaldir; ortak `tarafClient` kullan.

#### S-3.8.3 Hata isleme — tutarli ve merkezi
**(a) Neden:** Her serviste `try/catch + if 404 showSnackBar` kopyasi (~200 satir borc).
**(b) Tespit (gercek, `GercekKisiApi.ts`):**
```ts
catch (error: unknown) {
  if (isAxiosError(error) && error.response?.status === 404) {
    showSnackBar(error.response?.data?.message, TYPE.WARNING);
  }
}
```
**(c) Duzeltme:** 404 default handling'i response interceptor'a tasi (TODO ile isaretli) veya `handleApiError(error)` yardimcisi. Servisler sadece is-mantigina odaklanir.

#### S-3.8.4 Istek iptali (cancellation)
**(a) Neden:** Hizli yazimlı arama/autocomplete'te eski istekler yeni sonucu ezebilir; unmount sonrasi setState uyarisi cikar.
**(b) Tespit:** Arama bileseninde `AbortController` yok; effect cleanup'ta `.abort()` cagrilmiyor.
**(c) Dogru (gercek, `DuzenleyenSelect.tsx` + `YeniAdresIletisim.tsx`):** `abortControllerRef` ile onceki istegi iptal, `catch`'te `AbortError` ayikla, effect cleanup'ta `controller.abort()`.

---

### 3.9 RTK Query apiSlice Deseni

#### S-3.9.1 Standart slice kurulumu
**(a) Neden:** Tutarli `createApi` + `golgeRtkApiHeaders` + `tagTypes` cache/invalidation'i ongorulebilir kilar.
**(b)/(c) Gercek temel slice (`tipDegerVarlikApi.ts`):**
```ts
const tipDegerVarlikApi = createApi({
  reducerPath: 'tipDegerVarlikApi',
  baseQuery: fetchBaseQuery({ baseUrl: TIP_DEGER_VARLIK_API_URL, prepareHeaders: golgeRtkApiHeaders }),
  tagTypes: ['Varlik','Deger','VarlikFilter','VarlikArama','VarlikFilterList'],
  endpoints: () => ({}),
});
```
> `prepareHeaders: golgeRtkApiHeaders` **zorunlu** (auth header propagasyonu). Elle `Authorization` ekleme.

#### S-3.9.2 `injectEndpoints` ile tek-API genisletme (cogalmayi onle)
**(a) Neden:** Her endpoint icin ayri `createApi` => ayri `reducerPath`/cache/middleware kaydi => store sismesi.
**(b) Tespit (gercek TODO, `tuzelKisiBilgileriApiSlice.ts`):** Bes ayri slice (`tuzelKisiBilgileri`, `sermaye`, `ortak`, `unvan`, `temsilci`) ayni `baseQuery`/header, sadece `/mersis/*` endpoint farkli — **bes ayri reducer/middleware**.
**(c) Dogru (gercek, `degerApiSlice.ts` / `varlikApiSlice.ts`):**
```ts
export const varlikApiSlice = tipDegerVarlikApi.injectEndpoints({
  endpoints: (builder) => ({ /* ... */ }),
});
```

#### S-3.9.3 `query` vs `mutation` dogru secimi
**(a) Neden:** Salt-okuma veri `mutation` ile tanimlanirsa cache devre disi kalir, ayni girdiyle gereksiz tekrar istek atilir.
**(b) Tespit (gercek TODO, `tuzelKisiBilgileriApiSlice.ts`):** `fetchTuzelKisiBilgileri` salt-okuma oldugu halde `builder.mutation`.
**(c) Duzeltme:** Salt-okuma → `builder.query` + `providesTags`; yazma → `builder.mutation` + `invalidatesTags`.

#### S-3.9.4 `transformResponse` ve tagleme
**(a) Neden:** Backend zarfini (`content`, snake_case) frontend tipine donusturmek tek yerde olmali; tag'lar dogru invalidation saglar.
**(b)/(c) Gercek (`IslemTanimlariApiSlice.ts`):** `transformResponse` ile `lowercaseKeys`/`transformListResponse`; `providesTags`/`invalidatesTags` ile `Table`/`Lookup`/`Enum`/`IslemTanim` esleme.
> **Lossy donusum uyarisi:** `lowercaseKeys` geri-donusturulemez; tip tanimlari bu forma gore yazilir (dosyadaki yorum). Donusum degistirilirse tum field referanslari kirilir — review'da bunu vurgula.
> **Gereksiz invalidation kacin:** `createRecord` icinde tag invalidation kaldirilmis, yerine lokal store guncellemesi yapilmis (yorum: "cift render dongusune neden oluyordu"). Invalidation maliyetini gozet.

#### S-3.9.5 Store kaydi tamlik kontrolu
**(a) Neden:** Her `createApi` icin `reducer` **ve** `middleware` store'a eklenmeli; eksik middleware cache/invalidation'i bozar.
**(b) Tespit (gercek, `taraf-web/app/store.ts`):** `tuzelKisiBilgileriApiSlice` reducer'i kayitli ama formatlama bozuk; **her** slice'in hem `[x.reducerPath]: x.reducer` hem `.concat(x.middleware)` satiri olmali.
**(c) Dogru (gercek, `islem-yonetimi-web/app/store.ts`):** `combineReducers` + `getDefaultMiddleware().concat(...)` ile 25+ api tutarli kayitli; ek `rtkQueryErrorLogger` middleware merkezi hata gosterimi yapar.

#### S-3.9.6 Merkezi RTK Query hata middleware'i
**(a) Neden:** Tum mutation/query hatalarini tek yerde kullaniciya gostermek (notistack) tutarli UX saglar.
**(b)/(c) Gercek (`app/middlewares.ts` `rtkQueryErrorLogger`):** `isRejectedWithValue` ile backend hata zarfini (`error`/`code`/`message`) ayrıştirir; `AbortError` ve `meta.condition` (skip) durumlarini **gostermez** (gereksiz hata gurultusu engellenir).

---

### 3.10 MUI 6 Tema, sx ve styled

#### S-3.10.1 Tema saglayicisi ve lokalizasyon
**(a) Neden:** Tek tema kaynagi (golge tema) + tarih lokalizasyonu tutarli gorunum/format saglar.
**(b)/(c) Gercek (`main.tsx`):** `GolgeThemeProvider` (golge-ui/theme) + `LocalizationProvider` (`AdapterDayjs`, `adapterLocale="tr"`, `trTR` localeText). Ayri/ozel `createTheme` ekleme — golge temasini kullan/genislet.

#### S-3.10.2 `sx` vs `styled` secimi
**(a) Neden:** Tek-seferlik/duruma-bagli stil `sx`; tekrar kullanilan/varyantli stil `styled`.
**(b) Tespit:** Ayni `sx={{...}}` blogu cok yerde kopyalanmis (→ `styled`'a cikar); ya da basit tek-seferlik stil icin gereksiz `styled` bileseni.
**(c) Dogru `styled` (gercek, `components/controls/YeniKisiItem.ts`):**
```ts
import { styled } from '@mui/material/styles';
export const YeniKisiItem = styled(Paper)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
  ...theme.typography.body2, padding: theme.spacing(1), color: theme.palette.text.secondary,
}));
```
**(c) Dogru `sx` (gercek, `Kisi.tsx`):** responsive deger objeleri `sx={{ p: { xs: 2, sm: 3 }, width: { xs: 'calc(100vw - 16px)', md: '56%' } }}`.
> Tema degeri kullan: `theme.spacing()`, `theme.palette.*`, breakpoint objeleri. Sabit hex/px gomulu degerleri (tema disi) review'da sorgula.

#### S-3.10.3 `as any` ile `sx` tip kacisi
**(b) Tespit (gercek, fen-kayit `InnerAppDev.tsx`):** `sx={{ '--header-sub-content-height': ... } as any}` — CSS degisken icin tip kacisi.
**(c) Duzeltme:** CSS custom property'leri `CSSProperties` ile `style` uzerinden ya da `sx` icin dogru tiple ver; `as any`'den kacin.

#### S-3.10.4 Grid2 ve responsive
Gercek: `import Grid from '@mui/material/Grid2'; <Grid size={{ xs: 12, md: 12, lg: 12, xl: 12 }}>` (MUI 6 Grid2 API). Eski `<Grid item xs>` API'siyle karistirma.

---

### 3.11 Form, Maskeleme ve Dogrulama

> Not: Incelenen repolarda `react-imask` bagimliligi **bulunamadi**; maskeleme MUI alanlari + manuel donusum ve `libphonenumber-js` (islem-yonetimi) ile yapilir. Asagidaki kurallar genel form standardidir; `react-imask` eklenirse onerilen desen verilmistir.

#### S-3.11.1 Maskelenmis girdi (TC Kimlik, telefon, vergi no)
**(a) Neden:** Sabit-format alanlar (11 hane TC, telefon) maskelenirse hatali giris en bastan engellenir.
**(b) Tespit:** Serbest `TextField` + manuel `replace`/`slice` ile elle maskeleme tekrarlanmis.
**(c) Onerilen desen (`react-imask` eklenirse):**
```tsx
import { IMaskInput } from 'react-imask';
const TcMask = React.forwardRef<HTMLInputElement, any>((props, ref) => (
  <IMaskInput {...props} mask="00000000000" inputRef={ref} onAccept={(v)=>props.onChange({target:{name:props.name,value:v}})} unmask />
));
<TextField name="tcKimlikNo" InputProps={{ inputComponent: TcMask as any }} />
```
> Mevcut alternatif: `libphonenumber-js` (islem-yonetimi) telefon dogrulama/format icin kullanilir.

#### S-3.11.2 Dogrulama ve gonderim
**(a) Neden:** Istemci dogrulamasi kullaniciya hizli geri-bildirim verir; ama **backend dogrulamasi tek gercek kaynaktir** (golge `*Constraint` + jakarta `@Valid`).
**(b) Tespit:** Sadece istemci dogrulamasina guvenen kritik akis; ya da hic istemci dogrulamasi olmadan ham gonderim.
**(c) Duzeltme:** Zorunlu/desen kontrollerini istemcide yap, backend hata zarfini (`message`/`error`) RTK Query middleware veya axios interceptor ile kullaniciya goster.

#### S-3.11.3 Form state'i lokal tut
Form alanlari ekran-lokal `useState`/`useReducer` ile tutulur (S-3.2.1). Form verisini Redux global store'a koymak gereksizdir; submit'te RTK Query `mutation`/axios servisi cagrilir.

---

### 3.12 i18n (react-i18next)

> Sadece `islem-yonetimi-web` i18n kullanir (`react-i18next ^15.1.3`). `taraf-web`/`fen-kayit-web`'de metinler dogrudan Turkce gomulu (domain dili Turkce).

#### S-3.12.1 Namespace'li, feature-bazli kurulum
**(a) Neden:** Buyuk uygulamada ceviriler feature namespace'lerine bolunmeli; tek dev sozluk yonetilemez.
**(b)/(c) Gercek (`features/kural-motoru/i18n/index.ts`):**
```ts
i18n.use(LanguageDetector).use(initReactI18next).init({
  resources: { tr: { kuralMotoru: tr }, en: { kuralMotoru: en } },
  fallbackLng: 'tr', ns: ['kuralMotoru'], defaultNS: 'kuralMotoru',
  interpolation: { escapeValue: false },
  detection: { order: ['localStorage','navigator'], caches: ['localStorage'], lookupLocalStorage: 'kuralMotoruLng' },
});
```
**(b) Tespit:** Bilesende sabit string oysa o feature i18n kullaniyor; eksik ceviri anahtari; `fallbackLng` yok.
**(c) Duzeltme:** `const { t } = useTranslation('kuralMotoru'); t('anahtar')`. Yeni metin icin `tr` **ve** `en` dosyalarina anahtar ekle.

---

### 3.13 Erisilebilirlik (a11y)

#### S-3.13.1 Klavye erisimi ve odak
**(a) Neden:** Tum etkilesimli ogeler klavyeyle erisilebilir olmali.
**(b) Tespit:** `onClick` olan `<div>` ama `tabIndex`/`onKeyDown`/`role` yok.
**(c) Dogru (gercek, `IslemTanimTree.tsx`):** `tabIndex={0}` + `onKeyDown={handleTreeKeyDown}` + `:focus-visible` gorsel odak (`sx`). MUI'nin `IconButton`/`Tooltip`/`Button` bilesenleri erisilebilirligi hazir verir — ham `<div onClick>` yerine bunlari kullan.

#### S-3.13.2 Etiket ve metin alternatifleri
**(b) Tespit:** Sadece ikonlu buton (`IconButton`) icin `aria-label`/`title` yok; `TextField` icin `label` yok.
**(c) Duzeltme:** `IconButton` -> `Tooltip` + `aria-label`; `TextField` -> `label`/`aria-label`. Gercek: `TreeNodeItem.tsx` ikon butonlari `Tooltip` ile sarili.

#### S-3.13.3 Modal odak yonetimi
**(b)/(c) Gercek (`Kisi.tsx`):** `GolgeModal` `disableEnforceFocus` ve `paperProps` ile odak/yerlesim yonetir. Modal acilinca odak icine alinmali, kapaninca tetikleyiciye donmeli (golge-ui yonetir; ozel modal yazarken bu davranisi koru).

---

## 4. Sik Hatalar & Anti-Pattern'ler (before/after)

### AP-1 — `.reduce`/`.map` icinde hook cagrisi
```ts
// ❌ ANTI-PATTERN (useResponsive.ts useWidth) — rules-of-hooks ihlali, disable ile gizlenmis
keys.reduce((out, key) => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const m = useMediaQuery(theme.breakpoints.up(key)); return !out && m ? key : out;
}, null)
```
```ts
// ✅ DUZELTME — tum hook'lar kosulsuz ust seviyede
const up = {
  xl: useMediaQuery(theme.breakpoints.up('xl')),
  lg: useMediaQuery(theme.breakpoints.up('lg')),
  md: useMediaQuery(theme.breakpoints.up('md')),
  sm: useMediaQuery(theme.breakpoints.up('sm')),
};
return up.xl ? 'xl' : up.lg ? 'lg' : up.md ? 'md' : up.sm ? 'sm' : 'xs';
```

### AP-2 — Cift state-kaynagi (Context state + modul global)
```tsx
// ❌ AuthTokenContext.tsx — token hem state hem modul-global; axios eski token tasiyabilir
let authToken: string | null = null;
```
```tsx
// ✅ Tek kaynak: Redux store'dan oku (getState) ya da provider mount'ta senkron set,
//    axios interceptor ayni tek kaynaktan token cekmeli.
```

### AP-3 — `any` ile tip guvenligi kaybi
```ts
// ❌ transformResponse: (response: any) => ({ tipVarlikListe: response?.content ?? [] })
// ✅ interface VarlikPageResponse { content: VarlikDto[] }
//    transformResponse: (r: VarlikPageResponse) => ({ tipVarlikListe: r?.content ?? [] })
```

### AP-4 — Salt-okuma veri icin `mutation`
```ts
// ❌ fetchTuzelKisiBilgileri: builder.mutation({ query: (b) => ({ url:'/mersis/...', method:'POST', body:b }) })
// ✅ builder.query(...) + providesTags  → cache + dedupe devreye girer
```

### AP-5 — Tekrar eden zarf donusumu
```ts
// ❌ 6+ serviste: const { content, totalElements, totalPages, number } = res.data;
//    return { liste: content, kayitSayisi: totalElements, sayfaSayisi: totalPages, sayfaNo: number };
// ✅ const toListeResponse = (p) => ({ liste:p.content, kayitSayisi:p.totalElements, sayfaSayisi:p.totalPages, sayfaNo:p.number });
```

### AP-6 — Cleanup'siz effect / iptalsiz arama
```tsx
// ❌ useEffect(() => { window.addEventListener('x', h); }, []);  // remove yok
// ✅ useEffect(() => { window.addEventListener('x', h); return () => window.removeEventListener('x', h); }, [h]);
//    Arama icin AbortController + cleanup'ta .abort()
```

### AP-7 — Memo'lu cocuga inline prop / inline Context value
```tsx
// ❌ <Ctx.Provider value={{ a, b, onX: () => ... }}>   // her render yeni referans
// ✅ const value = useMemo(() => ({ a, b, onX }), [a, b, onX]); <Ctx.Provider value={value}>
//    onX = useCallback(..., [deps])
```

### AP-8 — `eslint-disable` ile uyari gizleme
```ts
// ❌ // eslint-disable-next-line @typescript-eslint/no-explicit-any
//    const x: any = ...
// ✅ Kok-nedeni gider; --report-unused-disable-directives gereksiz disable'lari da hata yapar (max-warnings 0).
```

### AP-9 — Hata yutma (cause kaybi)
```ts
// ❌ catch (error) { throw new Error('İşlem başarısız'); }
// ✅ catch (error) { throw new Error('İşlem başarısız', { cause: error }); }
```

### AP-10 — `useRef` ile yaratilan debounce'un stale closure'i
```tsx
// ❌ const debounced = useRef(debounce(performSearch, t)).current;  // ilk render closure'unu kalici yakalar
// ✅ const debounced = useMemo(() => debounce(performSearch, t), [performSearch, t]); // + unmount'ta debounced.cancel()
```
> Gercek: `DuzenleyenSelect.tsx` bu durumu TODO ile isaretlemis (`react-hooks/exhaustive-deps`).

---

## 5. Hizli Referans (Review Checklist)

**Component & dosya**
- [ ] Dosya repo desenine uygun konumda (`taraf` duz / `islem-yonetimi` feature-sliced).
- [ ] Bilesen <250-300 satir; tek sorumluluk; container/presentational ayrik.
- [ ] Isimlendirme: PascalCase bilesen, useXxx hook, XxxApiSlice, XxxApi.ts, XxxContext/XxxProvider/useXxx. — Yasak: /export\s+default\s+function\s+[a-z]/

**State**
- [ ] Sunucu verisi RTK Query'de (slice'a kopyalanmamis). — Yasak: /dispatch\s*\(\s*set[A-Z][A-Za-z0-9]*\s*\(\s*[A-Za-z0-9_]*[Dd]ata\b/
- [ ] Turetilmis deger useMemo ile render'da; ayri state degil. — Yasak: /useEffect\s*\(\s*\(\s*\)\s*=>\s*\{?\s*set[A-Z][A-Za-z0-9]*\s*\(/
- [ ] Cift state-kaynagi yok (Context+Redux ya da state+modul-global ayni veri).
- [ ] Reducer disinda mutasyon yok; Immer sadece reducer icinde. — Yasak: /\bprops\.[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*\s*(?:=[^=>]|\.(?:push|pop|splice|shift|unshift|sort|reverse)\s*\()/

**Hook**
- [ ] Hook'lar kosulsuz, ust seviyede (.map/.reduce/if/erken-return sonrasi yok). — Yasak: /(?:\bif\s*\([^)]*\)\s*\{?\s*|\.\s*(?:map|forEach|reduce|filter)\s*\(\s*\([^)]*\)\s*=>\s*\{?\s*)(?:const\s+[^=]*=\s*)?use[A-Z]/
- [ ] useEffect cleanup donuyor (listener/timer/abort/subscription). — Yasak: /useEffect\s*\(\s*\(\s*\)\s*=>\s*\{(?:(?!return)[^}])*(?:addEventListener|setInterval)\s*\((?:(?!return)[^}])*\}\s*,/
- [ ] Bagimlilik dizileri tam; gereksiz exhaustive-deps disable yok. — Yasak: /eslint-disable[^\n]*exhaustive-deps/
- [ ] Custom hook tek-sorumluluk; `useCallback`/`useMemo` ile kararli ciktilar.

**Performans**
- [ ] Pahali liste donusumu useMemo'lu; satir bileseni memo'lu. — Yasak: /\{\s*[A-Za-z0-9_.]+\s*\.(?:filter|sort|slice|reduce|concat)\s*\([^)]*\)\s*\.map\s*\(/
- [ ] memo'lu cocuga/Provider value'ya inline fn/obj gecmiyor. — Yasak: /\.Provider\s+value=\{\{/
- [ ] Buyuk liste `react-window` ile sanallastirilmis.
- [ ] Agir ekran lazy+Suspense (BPMN/DMN/Monaco/PDF). — Yasak: /import\s+[^;]*from\s*["']{1}(?:bpmn-js|dmn-js|monaco-editor|@monaco-editor|react-pdf|pdfjs-dist)/

**Okunabilirlik & TS**
- [ ] `: any`/`as any` yok (gerekiyorsa `unknown` + daraltma).
- [ ] Erken donus; JSX'te 3+ kademeli ternary yok. — Yasak: /\?(?![.?])[^?]{1,60}\?(?![.?])[^?]{1,60}\?(?![.?])/
- [ ] `console.*` yerine `logger`; sabit kodlu URL yok.
- [ ] npm run lint (max-warnings 0) ve tsc temiz. — Yasak: /@ts-(?:ignore|nocheck)\b|eslint-disable\b/

**Tekrar kullanilabilirlik**
- [ ] golge-ui karsiligi varken yeniden yazilmamis (Modal/Snackbar/Api/Theme). — Yasak: /import\s+\{[^}]*\b(?:Snackbar|Dialog|Modal)\b[^}]*\}\s*from\s*["']@mui\/material/
- [ ] Tekrar eden donusum/handler ortak yardimciya/`injectEndpoints`'e cikarilmis.

**Routing / axios / RTK Query**
- [ ] Korumali rota hasAuthority ile; yetki cozulmeden render yok. — Yasak: /\b(?:user|currentUser|profile)\??\.(?:role|roles|authorities|yetki|yetkiler)\b\s*(?:===|!==|\.includes\s*\()/
- [ ] Tekil axios tarafClient; header elle eklenmemis; iptal (AbortController) var. — Yasak: /\baxios\s*\.\s*(?:get|post|put|patch|delete|create)\s*\(/
- [ ] apiSlice golgeRtkApiHeaders kullanir; query/mutation dogru; reducer **ve** middleware store'da kayitli. — Yasak: /headers\.set\s*\(\s*["']Authorization/

**MUI / form / i18n / a11y**
- [ ] Tema degeri (theme.spacing/palette, breakpoint objeleri) kullanilmis; sx as any yok. — Yasak: /(?:sx|style)=\{\{[^}]*#[0-9a-fA-F]{3,8}\b/
- [ ] Form lokal state'te; kritik dogrulama backend'de de var.
- [ ] (islem-yonetimi) metin t() ile, tr+en anahtarlari eklenmis. — Yasak: /\s(?:label|placeholder|helperText)="[^"{}]{3,}"/
- [ ] Etkilesimli <div> yerine MUI bileseni; aria-label/Tooltip/tabIndex mevcut. — Yasak: /<(?:div|span)[^>]*\sonClick\s*=/

---

## 6. Ilgili Dosyalar & Capraz-Linkler

**taraf-web (duz desen — temel referanslar)**
- `src/services/api.tsx` — axios `getClient` factory + interceptor (auth, 401/403/500). **S-3.8**
- `src/services/tarafClient.tsx` — tekil instance.
- `src/services/GercekKisiApi.ts` — axios servis deseni + tekrar/`any`/header TODO'lari. **S-3.6.2 / S-3.8 / AP-5**
- `src/app/store.ts`, `src/app/hooks.ts` — store kurulumu + tiplenmis hook'lar. **S-3.9.5**
- `src/app/geldigiBilesenSlice.ts` — Redux slice (Immer). **S-3.2.4**
- `src/features/tipDegerVarlikApi.ts` — RTK Query temel slice. **S-3.9.1**
- `src/features/ext/{deger,varlik}/*ApiSlice.ts` — `injectEndpoints`, `query`/`mutation`, `transformResponse`, `any` TODO. **S-3.9.2 / AP-3**
- `src/features/tuzelKisiBilgileriApiSlice.ts` — slice cogalma + `mutation` yanlis-kullanim TODO. **S-3.9.2/3 / AP-4**
- `src/hooks/useResponsive.ts` — `useResponsive` (dogru) vs `useWidth` (rules-of-hooks ihlali). **S-3.3.1 / AP-1**
- `src/hooks/useSearchKamu.tsx` — custom hook + hata-cause TODO. **S-3.3.3/4 / AP-9**
- `src/contexts/AuthTokenContext.tsx` — cift state-kaynagi anti-pattern. **S-3.2.5 / AP-2**
- `src/contexts/{Kisi,GeldigiBilesen}Context.tsx` — Context + `useCallback`; Redux'a tasima onerisi. **S-3.2.5 / S-3.4.5**
- `src/components/takbisBelge/DuzenleyenSelect.tsx` — `useReducer` + `AbortController` + debounce TODO. **S-3.8.4 / AP-10**
- `src/pages/Kisi.tsx` — ekran-lokal state, `useCallback`, `GolgeModal`. **S-3.2.1 / S-3.6.1**
- `src/InnerAppDev.tsx`, `src/App.tsx`, `src/main.tsx` — yetki guard, routing, provider agaci. **S-3.7.2 / S-3.10.1**
- `src/components/controls/YeniKisiItem.ts` — `styled`. **S-3.10.2**
- `src/utils/logger.ts` — merkezi logger. **S-3.5.4**
- `.eslintrc.cjs`, `tsconfig.json` — lint/strict kurallar. **S-3.5.1/2**

**islem-yonetimi-web (feature-sliced — buyuk uygulama referanslari)**
- `src/app/store.ts` — `combineReducers` + 25+ apiSlice. **S-3.9.5**
- `src/app/middlewares.ts` — `rtkQueryErrorLogger` (merkezi hata + abort/skip ayikla). **S-3.9.6**
- `src/features/islem-tanimlari/IslemTanimlariApiSlice.ts` — `transformResponse`/`lowercaseKeys`, tag invalidation, lossy-donusum uyarisi. **S-3.9.4**
- `src/features/islem-tanimlari/components/islem-tanim/IslemTanimTree.tsx` — `useMemo`/`useCallback`, Context value memo, `react-window` `List`, a11y `tabIndex`/`onKeyDown`. **S-3.4.1/2/3 / S-3.13.1**
- `src/features/islem-tanimlari/components/islem-tanim/TreeNodeItem.tsx` — `memo`'lu satir bileseni. **S-3.4.2**
- `src/shared/hooks/useLocalStorage.ts` — referans custom hook (SSR guard, cross-tab event + cleanup). **S-3.3.3**
- `src/shared/hooks/tasks/useTaskFiltering.ts` — `useMemo` turetilmis state, hook kompozisyonu. **S-3.2.3 / S-3.3.3**
- `src/shared/lib/performance.ts` — olcum/`debounce`/`throttle` yardimcilari. **S-3.4**
- `src/features/kural-motoru/i18n/index.ts` — namespace'li i18next kurulumu. **S-3.12.1**
- `eslint.config.js` (flat) — ESLint 9 kural seti. **S-3.5.1**

**fen-kayit-web**
- `src/App.tsx`, `src/InnerAppDev.tsx` — parametreli routing, `routesReady` yetki-guard, `useLayoutEffect`, `as any` sx TODO. **S-3.7 / S-3.10.3**

**golge-ui (ortak kutuphane — `taraf-web/node_modules/golge-ui/dist`)**
- `dist/index.d.ts` — `GolgeApi`, `golgeRtkApiHeaders`, `golgeErrorMiddleware`, `GolgeApp/AppBar/Main/Footer`, `GolgeModal`, `GolgeCrudLayout`, `GolgeTreeView`, `enqueueSnackbar`, `useGolgeSecurity`.
- `dist/router/index.d.ts` — `GolgeRouter` + `react-router-dom` re-export. **S-3.7.1**
- `package.json` exports: `.`, `./utils`, `./eimza`, `./theme`, `./router`, `./styles`. **S-3.6.1**

> **Capraz dokuman:** Backend kontrat tarafi (Feign `*RestClient` ↔ controller) icin backend code-review dokumanina bakiniz. Frontend servis/DTO tipleri, backend `client` modulundeki DTO'larla **uyumlu** olmalidir (orn. sayfalama zarfi `content/totalElements` ↔ Spring `Page`).
