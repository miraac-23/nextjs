# Frontend Code Review Checklist

> TAKBIS mikro-frontend ekosistemi (`taraf-web`, `islem-yonetimi-web`, `fen-kayit-web` ve diger `<is-alani>-web` repolari) icin PR incelemede kullanilacak **eyleme donuk** kontrol listesi.
> Kaynak standartlar: [01-react-code-review.md](./01-react-code-review.md) ve [04-golge-framework-frontend.md](./04-golge-framework-frontend.md) (Bolum B — Frontend). Maddeler bu dokumanlardan turetilmistir ve onlarla tutarlidir.
>
> ⚡ **Önce hızlı tara:** [`08-review-rehberi.md`](08-review-rehberi.md) — `pre-review.sh` mekanik ön-tarama (`eslint-disable`, `console.*`, golge-ui sürüm…), dosya-tipi→madde yönlendirme tablosu ve tek-sayfa Blocker kartı. Bu liste o akışın **derin inceleme** adımıdır.

## Nasil kullanilir
- PR'daki **degisen** dosyalar uzerinde maddeleri sirayla tara; her madde tek bir somut kontroldur.
- Oncelik etiketi: **Blocker** = merge engeli; **Major** = duzeltilmeli, gerekce sorulmali; **Minor** = iyilestirme/oneri.
- Repo desenini once tespit et: `taraf-web` = duz `src/` (`features/services/components/pages/hooks`), `islem-yonetimi-web` = feature-sliced (`features/<domain>` + `shared/`). Madde "repo desenine uy" derken bunu kasteder.
- Surumleri DAIMA ilgili `package.json`'dan dogrula (React 18.2/18.3, MUI 5/6, ESLint legacy/flat, golge-ui 1.16.x). Capraz-linkler ayni `code-review-docs/` klasorune goredir.

---

## 1. Component & yapi

- [ ] Dosyanin repo desenine uygun konumda oldugundan (`taraf-web` duz `services/` / `islem-yonetimi-web` `features/<domain>` + `shared/`) **emin ol**  — yanlis desen tutarsizlik yaratir  [Oncelik: Major]  ([01 §2.3](./01-react-code-review.md#23-klasor-deseni))
- [ ] Bilesenin <250-300 satir ve tek sorumluluk oldugundan; container (veri/mantik) ile presentational (saf render) katmanlarinin ayrik oldugundan **emin ol**  — buyuk karma bilesen test edilemez, `memo` etkisiz kalir  [Oncelik: Major]  ([01 §3.1.1-3.1.2](./01-react-code-review.md#s-311-tek-sorumluluk-ve-bilesen-boyutu))
  <details><summary>↳ örnek</summary>

  ```tsx
  // ❌ tek bilesende fetch + mantik + buyuk JSX (>300 satir)
  function IslemTanimTree() { const { data } = useGetTreeQuery(); /* +200 satir JSX */ }
  // ✅ container/presentational ayrik: mantik hook'ta, satir memo'lu saf bilesende
  function IslemTanimTree() { const { flatItems } = useTreeData(); return <List rowComponent={TreeNodeRow} ... />; }
  const TreeNodeRow = memo(function TreeNodeRow({ node, style }) { /* saf render */ });
  ```
  </details>
- [ ] Veri cekmeyi custom hook'a, prezentasyonu saf bilesene **tasi** (useSearchKamu/useTaskFiltering deseni)  — render icinde dogrudan apiSlice hook + buyuk JSX karisimi olmamali  [Oncelik: Major]  ([01 §3.1.2](./01-react-code-review.md#s-312-container--presentational-ayrimi)) Yasak: /function\s+[A-Z]\w*\s*\([^)]*\)\s*\{[^}]*use\w*Query\(/
  <details><summary>↳ örnek</summary>

  ```tsx
  // ❌ veri cekme + filtre render govdesinde
  function KisiListesi() { const { data } = useSearchKamuQuery(q); const filtered = data?.filter(...); return <Table rows={filtered} />; }
  // ✅ veri/mantik hook'ta, bilesen saf
  function KisiListesi() { const { searchKurum, sonuclar } = useSearchKamu(); return <Table rows={sonuclar} onSearch={searchKurum} />; }
  ```
  </details>
- [ ] Isimlendirme konvansiyonunu **kullan**: PascalCase bilesen, useXxx hook, xxxApiSlice/xxxApi, xxxSlice+xxxReducer, XxxApi.ts (axios), XxxContext/XxxProvider/useXxx  — sembol/dosya aramasi icin tutarlilik  [Oncelik: Minor]  ([01 §3.1.3](./01-react-code-review.md#s-313-isimlendirme-konvansiyonu)) Yasak: /const\s+(?!\w*[Ss]lice)\w+\s*=\s*createSlice\(/
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ tutarsiz: gercekKisiapi, KisiCtx, getKisiData
  export const gercekKisiapi = createApi({ ... });
  // ✅ konvansiyon: xxxApiSlice / XxxContext / useXxx
  export const gercekKisiApiSlice = createApi({ reducerPath: 'gercekKisiApi', ... });
  export const KisiContext = createContext<KisiContextType | null>(null);
  ```
  </details>
- [ ] JSX donen dosya icin `.tsx`, salt mantik icin `.ts` uzantisini **kullan** (orn. `useSearchKamu.tsx` vs `useResponsive.ts`)  — uzanti dogru olmali  [Oncelik: Minor]  ([01 §3.1.4](./01-react-code-review.md#s-314-hook-iceren-dosya-uzantisi))
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ useResponsive.tsx — JSX yok, yine de .tsx
  // ❌ useSearchKamu.ts — ReactNode/JSX donduruyor ama .ts
  // ✅ JSX yok -> .ts ;  JSX/ReactNode var -> .tsx
  // useResponsive.ts (salt mantik)  |  useSearchKamu.tsx (JSX icerir)
  ```
  </details>
- [ ] Domain dilini Turkce; alan adlarini Turkce (tcKimlikNo, basvuruRef), React/teknik terimleri Ingilizce **kullan**  — TAKBIS konvansiyonu  [Oncelik: Minor] Yasak: /\b(firstName|lastName|identityNumber|taxNumber|birthDate)\b/
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ domain alanlari Ingilizce
  interface GercekKisiDto { identityNumber: string; applicationRef: string; }
  // ✅ domain Turkce, teknik terim Ingilizce
  interface GercekKisiDto { tcKimlikNo: string; basvuruRef: string; }
  ```
  </details>

## 2. State yonetimi

- [ ] Sunucu verisi (CRUD/liste/detay) icin **RTK Query apiSlice**'i; global UI/akis durumu icin Redux slice'i; form/ekran-lokal durum icin useState/useReducer'i **kullan**  — yanlis katman boilerplate ve stale-data dogurur  [Oncelik: Major]  ([01 §3.2.1](./01-react-code-review.md#s-321-dogru-state-mekanizmasini-sec)) Yasak: /createAsyncThunk\s*\(/
  <details><summary>↳ örnek</summary>

  ```tsx
  // ❌ sunucu verisi Redux slice'a elle yazilmis
  dispatch(setKisiler(await fetch('/api/kisiler').then(r => r.json())));
  // ✅ sunucu verisi RTK Query apiSlice'ta (cache/dedupe/invalidation otomatik)
  const { data: kisiler } = useGetKisilerQuery();
  ```
  </details>
- [ ] Sunucu verisini useState'e kopyalamaktan **kacin** (const {data}=useGetXQuery() sonrasi useEffect(()=>setItems(data)) kalibi olmasin)  — cift kaynak/senkron hatasi  [Oncelik: Major]  ([01 §3.2.2](./01-react-code-review.md#s-322-sunucu-verisini-usestatee-kopyalama)) Yasak: /set[A-Z]\w*\(\s*data\s*\)/
  <details><summary>↳ örnek</summary>

  ```tsx
  // ❌ RTK Query sonucu useState'e kopyalaniyor (stale-data)
  const { data } = useGetVarlikQuery(); const [items, setItems] = useState([]);
  useEffect(() => { if (data) setItems(data); }, [data]);
  // ✅ dogrudan data'yi kullan
  const { data: items = [] } = useGetVarlikQuery();
  ```
  </details>
- [ ] Turetilebilir degeri ayri state'te tutmaktan **kacin**; useMemo ile render'da turet  — useEffect icinde state'ten state set etme  [Oncelik: Major]  ([01 §3.2.3](./01-react-code-review.md#s-323-turetilmis-statei-state-olarak-tutma)) Yasak: /useEffect\(\s*\(\s*\)\s*=>\s*\{?\s*set[A-Z]\w*\(/
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ turetilmis deger ayri state + useEffect ile senkron
  const [tasks, setTasks] = useState<Task[]>([]);
  useEffect(() => { setTasks(camundaTasks.map(camundaTaskToTask)); }, [camundaTasks]);
  // ✅ render'da useMemo ile turet
  const tasks = useMemo(() => camundaTasks.map(camundaTaskToTask), [camundaTasks]);
  ```
  </details>
- [ ] Cift state-kaynagindan **kacin**: ayni kayit/secim hem Context hem Redux'ta, ya da hem React state hem modul-seviye mutable degiskende tutulmasin (AuthTokenContext token anti-pattern'i)  — token degisimi sonrasi eski token tasiyabilir  [Oncelik: Blocker]  ([01 §3.2.5 / AP-2](./01-react-code-review.md#s-325-global-vs-lokal-sinir--cift-state-kaynagi-yasagi)) Yasak: /(^|\s)let\s+\w*[Tt]oken\w*\s*=/
  <details><summary>↳ örnek</summary>

  ```tsx
  // ❌ token hem Context state hem modul-global; axios eski token tasiyabilir
  let authToken: string | null = null; // modul-global, useEffect ile senkronlanir
  // ✅ tek kaynak: axios interceptor token'i useGolgeSecurity/store'dan ceker
  const token = await useGolgeSecurity().getToken();
  ```
  </details>
- [ ] Immutability'yi koru: mutasyonu yalniz reducer **icinde** (Immer) yap; reducer/store/props **disinda** obj.x = y kullanmaktan **kacin**  — Immer disi mutasyon bug uretir  [Oncelik: Major]  ([01 §3.2.4](./01-react-code-review.md#s-324-immutability-rtk--immer)) Yasak: /\bprops\.\w+\s*=\s*[^=]/
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ reducer disinda props/store mutasyonu
  const onSec = (kayit) => { kayit.secili = true; setKayitlar(kayitlar); };
  // ✅ Immer sadece reducer icinde; disarida immutable kopya
  setGeldigiBilesen: (state, action: PayloadAction<GeldigiBilesenType>) => {
    state.geldigiBilesen = action.payload; // Immer: guvenli
  }
  ```
  </details>
- [ ] Tiplenmis Redux hook'larini (useAppDispatch/useAppSelector) app/hooks.ts'ten **kullan**; bilesende ham useDispatch<AppDispatch>() tekrari olmasin  [Oncelik: Minor]  ([01 §3.1.4](./01-react-code-review.md#s-314-hook-iceren-dosya-uzantisi)) Yasak: /useDispatch\s*<\s*AppDispatch\s*>/
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ her bilesende ham, tiplenmemis hook
  const dispatch = useDispatch<AppDispatch>();
  const kisi = useSelector((s: RootState) => s.kisi);
  // ✅ app/hooks.ts'ten tiplenmis hook
  const dispatch = useAppDispatch();
  const kisi = useAppSelector((s) => s.kisi);
  ```
  </details>

## 3. Hook kullanimi

- [ ] Hook'larin kosulsuz ve ust seviyede oldugundan; if/for/.map/.reduce/erken-return sonrasi hook cagrisi OLMADIGINDAN **emin ol**  — react-hooks/rules-of-hooks: error, runtime crash riski (useWidth ihlali)  [Oncelik: Blocker]  ([01 §3.3.1 / AP-1](./01-react-code-review.md#s-331-hook-kurallari-rules-of-hooks--error-seviyesi)) Yasak: /(if|for|while)\s*\([^)]*\)\s*\{?\s*(const\s+[^=]+=\s*)?use[A-Z]\w*\s*\(/
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ .reduce callback'i icinde hook (kosullu) — rules-of-hooks ihlali
  keys.reduce((out, key) => {
    const m = useMediaQuery(theme.breakpoints.up(key)); return !out && m ? key : out;
  }, null);
  // ✅ tum hook'lar kosulsuz ust seviyede, secim sonra
  const md = useMediaQuery(theme.breakpoints.up('md'));
  const sm = useMediaQuery(theme.breakpoints.up('sm'));
  return md ? 'md' : sm ? 'sm' : 'xs';
  ```
  </details>
- [ ] `eslint-disable react-hooks/rules-of-hooks` yorumunu **kaldir**  — hook ihlalini gizlemek kirmizi bayrak  [Oncelik: Blocker]  ([01 §3.3.1](./01-react-code-review.md#s-331-hook-kurallari-rules-of-hooks--error-seviyesi))
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ disable ile ihlal gizlenmis
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const matches = useMediaQuery(theme.breakpoints.up(key));
  // ✅ disable'i kaldir, hook'u ust seviyeye tasi (kok-nedeni gider)
  const matches = useMediaQuery(theme.breakpoints.up('md'));
  ```
  </details>
- [ ] useEffect cleanup'inin dondugunden (listener/setInterval/AbortController/subscription) ve addEventListener -> removeEventListener yapildigindan **emin ol**  — sizinti onlemi  [Oncelik: Major]  ([01 §3.3.2 / AP-6](./01-react-code-review.md#s-332-useeffect--dogru-kullanim-cleanup-bagimlilik-dizisi)) Yasak: /useEffect\((?:(?!removeEventListener).)*addEventListener/
  <details><summary>↳ örnek</summary>

  ```tsx
  // ❌ listener eklenir ama kaldirilmaz (sizinti)
  useEffect(() => { window.addEventListener('taraf:auth-error', handleAuthError); }, []);
  // ✅ cleanup ile removeEventListener
  useEffect(() => {
    window.addEventListener('taraf:auth-error', handleAuthError);
    return () => window.removeEventListener('taraf:auth-error', handleAuthError);
  }, [handleAuthError]);
  ```
  </details>
- [ ] useEffect'e dogrudan async fn vermekten **kacin**; ic IIFE/async function **kullan**  — async fn cleanup yerine Promise doner  [Oncelik: Major]  ([01 §3.3.2](./01-react-code-review.md#s-332-useeffect--dogru-kullanim-cleanup-bagimlilik-dizisi)) Yasak: /useEffect\(\s*async\b/
  <details><summary>↳ örnek</summary>

  ```tsx
  // ❌ async fonksiyon dogrudan effect'e (cleanup yerine Promise doner)
  useEffect(async () => { await logout(); }, []);
  // ✅ ic IIFE; cleanup donulebilir
  useEffect(() => { (async () => { await logout(); })(); }, []);
  ```
  </details>
- [ ] Bagimlilik dizilerinin tam oldugundan; eslint-disable react-hooks/exhaustive-deps OLMADIGINDAN; effect icinde set edilen state'in bagimlilikta OLMADIGINDAN (sonsuz dongu) **emin ol**  [Oncelik: Major]  ([01 §3.3.2](./01-react-code-review.md#s-332-useeffect--dogru-kullanim-cleanup-bagimlilik-dizisi)) Yasak: /eslint-disable[^\n]*exhaustive-deps/
  <details><summary>↳ örnek</summary>

  ```tsx
  // ❌ set edilen state bagimlilikta -> sonsuz dongu; disable ile gizlenmis
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setSayac(sayac + 1); }, [sayac]);
  // ✅ functional update; bagimlilik gereksiz
  useEffect(() => { setSayac((s) => s + 1); }, []);
  ```
  </details>
- [ ] Iki+ bilesende kopyalanan `useState`+`useEffect` blogunu, tek-sorumluluk + `useCallback`/`useMemo` ile kararli cikti veren bir custom hook'a **cikar** (`useLocalStorage` referans sablonu)  [Oncelik: Minor]  ([01 §3.3.3](./01-react-code-review.md#s-333-custom-hook-tasarimi))
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ ayni localStorage useState+useEffect blogu iki bilesende kopyalanmis
  const [v, setV] = useState(() => JSON.parse(localStorage.getItem('k') ?? 'null'));
  useEffect(() => { localStorage.setItem('k', JSON.stringify(v)); }, [v]);
  // ✅ tek custom hook'a cikar (useCallback'li setValue, referans kararli)
  const [v, setV] = useLocalStorage<MyType>('k', initial);
  ```
  </details>
- [ ] Custom hook'ta hatayi yutmadan, throw new Error(msg, { cause: error }) ile orijinal hatayi gecirmekten **emin ol**  — tani kaybi (S2737)  [Oncelik: Minor]  ([01 §3.3.4 / AP-9](./01-react-code-review.md#s-334-custom-hookta-hata-yutma)) Yasak: /catch\s*(\([^)]*\))?\s*\{\s*\}/
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ orijinal hata yutulur (cause kaybi)
  catch (error) { throw new Error('Kamu arama işlemi başarısız oldu'); }
  // ✅ orijinal hata cause ile gecirilir
  catch (error) { throw new Error('Kamu arama işlemi başarısız oldu', { cause: error }); }
  ```
  </details>

## 4. Performans

- [ ] Pahali liste donusumu (.map/.filter zinciri) icin useMemo **kullan**; her render'da yeniden hesaplanmasin  [Oncelik: Major]  ([01 §3.4.1](./01-react-code-review.md#s-341-usememo--usecallback--dogru-yerde-dogru-bagimlilikla)) Yasak: /=\s*\w+[?.]*\.(filter|map)\([^)]*\)\s*\.(map|filter|sort|reduce)\(/
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ her render'da pahali zincir yeniden hesaplanir
  const flatItems = flatten(filteredTree, expandedIds);
  // ✅ useMemo ile bagimliliklara baglanir
  const flatItems = useMemo(() => flatten(filteredTree, expandedIds), [filteredTree, expandedIds]);
  ```
  </details>
- [ ] Handler'i useCallback, value'yu useMemo ile sabitleyerek memo'lu cocuga / Context Provider value'ya inline ()=>{}/{...}/[...] gecmekten **kacin**  — yeni referans memo'yu etkisiz kilar, tum tuketiciler re-render olur  [Oncelik: Major]  ([01 §3.4.1 / §3.4.5 / AP-7](./01-react-code-review.md#s-341-usememo--usecallback--dogru-yerde-dogru-bagimlilikla)) Yasak: /Provider\s+value=\{\{/
  <details><summary>↳ örnek</summary>

  ```tsx
  // ❌ inline value/fn -> her render yeni referans -> tum tuketiciler re-render
  <TreeContext.Provider value={{ selectedId, onToggle: (id) => setSel(id) }}>
  // ✅ useMemo value + useCallback handler ile referans kararli
  const onToggle = useCallback((id: string) => setSel(id), []);
  const value = useMemo(() => ({ selectedId, onToggle }), [selectedId, onToggle]);
  <TreeContext.Provider value={value}>
  ```
  </details>
- [ ] Sik render edilen liste/agac satirini React.memo ile sar (TreeNodeRow deseni); asiri useMemo'dan (ilkel-aritmetik) **kacin**  [Oncelik: Minor]  ([01 §3.4.2](./01-react-code-review.md#s-342-reactmemo-ile-saf-bilesen)) Yasak: /useMemo\(\s*\(\s*\)\s*=>\s*[\w.]+\s*[-+*\/]\s*[\w.]+\s*,/
  <details><summary>↳ örnek</summary>

  ```tsx
  // ❌ sik render edilen satir bileseni memo'suz
  function TreeNodeRow({ node, style }) { /* satir render */ }
  // ✅ React.memo ile sar (prop degismedikce render atlanir)
  const TreeNodeRow = memo(function TreeNodeRow({ node, style }) { /* satir render */ });
  ```
  </details>
- [ ] Yuzlerce+ satirli liste/agaci react-window ile sanallastir; islem-yonetimi-web v2 List (rowComponent/rowProps) API'sini, eski FixedSizeList ile karistirmaktan **kacin**  [Oncelik: Major]  ([01 §3.4.3](./01-react-code-review.md#s-343-sanallastirma-react-window)) Yasak: /FixedSizeList/
  <details><summary>↳ örnek</summary>

  ```tsx
  // ❌ binlerce satir DOM'a tam basilir
  {flatItems.map((item) => <TreeNodeRow key={item.id} node={item} />)}
  // ✅ react-window v2 List ile sanallastir
  <List<TreeRowProps> rowComponent={TreeNodeRow} rowCount={flatItems.length}
    rowHeight={ROW_HEIGHT} rowProps={rowProps} />
  ```
  </details>
- [ ] Agir/nadiren acilan ekrani (BPMN/DMN/Monaco/PDF), ana bundle'a statik baglamadan, React.lazy + <Suspense> ile ayri chunk'a **bol**  [Oncelik: Minor]  ([01 §3.4.4](./01-react-code-review.md#s-344-kod-bolme-lazy--suspense)) Yasak: /from\s+["\']\s*(bpmn-js|dmn-js|monaco-editor|@monaco-editor|react-pdf|pdfjs-dist)/
  <details><summary>↳ örnek</summary>

  ```tsx
  // ❌ agir editor ana bundle'a statik bagli
  import BpmnEditor from './features/islem-bpmn/BpmnEditor';
  // ✅ lazy + Suspense ile ayri chunk
  const BpmnEditor = React.lazy(() => import('./features/islem-bpmn/BpmnEditor'));
  <Suspense fallback={<GolgeLoader />}><BpmnEditor /></Suspense>
  ```
  </details>
- [ ] useRef(debounce(...)).current ile stale-closure debounce yerine useMemo(()=>debounce(...),[deps]) + unmount'ta .cancel() **kullan**  [Oncelik: Minor]  ([01 AP-10](./01-react-code-review.md#ap-10--useref-ile-yaratilan-debounceun-stale-closurei)) Yasak: /useRef\(\s*debounce\(/
  <details><summary>↳ örnek</summary>

  ```tsx
  // ❌ useRef ilk render closure'unu kalici yakalar (stale)
  const debounced = useRef(debounce(performSearch, 300)).current;
  // ✅ useMemo ile bagimliliklara bagli; unmount'ta cancel
  const debounced = useMemo(() => debounce(performSearch, 300), [performSearch]);
  useEffect(() => () => debounced.cancel(), [debounced]);
  ```
  </details>

## 5. Okunabilirlik

- [ ] Render basinda erken donus (guard) kullan; JSX'te 3+ kademeli ic-ice ternary'den **kacin**  [Oncelik: Minor]  ([01 §3.5.3](./01-react-code-review.md#s-353-erken-donus-early-return--jsx-sadeligi)) Yasak: /\?[^?:]{1,80}\?[^?:]{1,80}\?/
  <details><summary>↳ örnek</summary>

  ```tsx
  // ❌ ic-ice ternary ile render
  return yetkiliKullanici === false ? <Unauthorized /> : loading ? <Loader /> : <Icerik />;
  // ✅ erken donus (guard) ile sadelik
  if (yetkiliKullanici === false) return <UnauthorizedScreen />;
  if (loading) return <Loader />;
  return <Icerik />;
  ```
  </details>
- [ ] Kaynak kodda dogrudan `console.*` yerine merkezi `logger` (`utils/logger.ts`, sadece `import.meta.env.DEV`) veya notistack middleware **kullan**  — `no-console: warn`  [Oncelik: Minor]  ([01 §3.5.4](./01-react-code-review.md#s-354-console-yerine-merkezi-logger))
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ dogrudan console (no-console: warn, uretimde sizinti)
  console.error('Kisi yuklenemedi', error);
  // ✅ merkezi logger (sadece import.meta.env.DEV'de loglar)
  import { logger } from '../utils/logger';
  logger.error('Kisi yuklenemedi', error);
  ```
  </details>
- [ ] Sabit kodlu URL/ortam degeri yerine .env (VITE_REACT_APP_*) uzerinden cozulen degerleri **kullan**  — ortamlar arasi tasinabilirlik (S1075)  [Oncelik: Major]  ([01 §3.5.5](./01-react-code-review.md#s-355-sabit-kodlu-urldeger)) Yasak: /["\']https?:\/\/[a-zA-Z0-9.-]+/
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ sabit kodlu URL (S1075, ortamlar arasi tasinmaz)
  const TIP_DEGER_VARLIK_API_URL = 'https://test.test.com.tr/tipdeger/api';
  // ✅ .env'den coz (VITE_REACT_APP_*)
  const TIP_DEGER_VARLIK_API_URL = env.envTipdegerVarlikApiUrl;
  ```
  </details>
- [ ] Kullanilmayan import/degisken/eslint-disable'i ve gereksiz disable'i **kaldir**  — --report-unused-disable-directives + max-warnings 0  [Oncelik: Major]  ([01 §3.5.1 / AP-8](./01-react-code-review.md#s-351-eslint---max-warnings-0--uyarisiz-birlestirme)) Yasak: /eslint-disable-next-line/
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ uyariyi gizleyen disable + kullanilmayan import
  import { useMemo, useRef } from 'react'; // useRef kullanilmiyor
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const x: any = veri;
  // ✅ kok-nedeni gider, gereksiz import/disable'i kaldir
  import { useMemo } from 'react';
  const x: VarlikDto = veri;
  ```
  </details>

## 6. Tekrar kullanilabilirlik

- [ ] golge-ui karsiligi varken yeniden yazmaktan **kacin**: modal/snackbar/api-client/tema/CRUD tablo-form (GolgeModal, enqueueSnackbar, GolgeApi, GolgeThemeProvider, GolgeTable/GolgeEntityForm/GolgeFilterForm/GolgeCrudLayout)  — el yapimi kopya tutarsizlik + bakim yuku  [Oncelik: Major]  ([01 §3.6.1](./01-react-code-review.md#s-361-golge-ui-bilesenlerini-once-kullan) / [04 §B.1](./04-golge-framework-frontend.md#review-kontrolleri-b1)) Yasak: /<Dialog[\s>]/
  <details><summary>↳ örnek</summary>

  ```tsx
  // ❌ CRUD tablo/form elle MUI ile sifirdan yazilmis
  <Table>{rows.map((r) => <TableRow>...</TableRow>)}</Table> /* + el yapimi form/filtre */
  // ✅ golge-ui CRUD bilesenleri
  import { GolgeTable, GolgeEntityForm, GolgeFilterForm } from 'golge-ui';
  <GolgeCrudLayout table={<GolgeTable ... />} form={<GolgeEntityForm ... />} />
  ```
  </details>
- [ ] portal-ui/tapu-ui'de domain-genel bilesen varsa onu, ozel bileseni ise yalniz paylasilamaz domain UI icin ve golge `base`/tema primitifleri uzerine kurulu olacak sekilde **kullan**  [Oncelik: Minor]  ([04 §B.1](./04-golge-framework-frontend.md#golge-ui-mi-ozel-bilesen-mi--portal-uitapu-ui))
  <details><summary>↳ örnek</summary>

  ```tsx
  // ❌ portal-genel bilesen yeniden yazilmis
  function PortalUserCard({ user }) { /* el yapimi */ }
  // ✅ portal-ui'deki paylasilan bileseni kullan; ozel ise golge base uzerine kur
  import { PortalUserCard } from 'portal-ui';
  import { GolgeCard } from 'golge-ui'; // ozel bilesen tabani
  ```
  </details>
- [ ] Tekrar eden donusum/handler'i ortak yardimciya **cikar**: zarf donusumu (content/totalElements -> liste/kayitSayisi) toListeResponse'a, 404->snackbar interceptor'a; kardes apiSlice'lar injectEndpoints'e  — tek-nokta-degisim; tekrar sayisini PR aciklamasinda belirt  [Oncelik: Major]  ([01 §3.6.2 / AP-5](./01-react-code-review.md#s-362-kopyalama-karsiti-tekrar-eden-donusumhandleri-ortak-yardimciya-cikar)) Yasak: /(liste|kayitSayisi)\s*:\s*[\w.?]*\.(content|totalElements)/
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ ayni zarf donusumu 6+ serviste kopyalanmis
  const { content, totalElements, totalPages, number } = res.data;
  return { liste: content, kayitSayisi: totalElements, sayfaSayisi: totalPages, sayfaNo: number };
  // ✅ ortak yardimciya cikar (tek-nokta-degisim)
  const toListeResponse = (p) => ({ liste: p.content, kayitSayisi: p.totalElements, sayfaSayisi: p.totalPages, sayfaNo: p.number });
  ```
  </details>
- [ ] Cross-domain mantigi, feature icinde cogaltmadan, dogru konuma (islem-yonetimi-web shared/{hooks,lib,types}, taraf-web hooks/utils) **tasi**  [Oncelik: Minor]  ([01 §3.6.4](./01-react-code-review.md#s-364-paylasilan-hooklib-konumu)) Yasak: /from\s+["\']\.\.\/\.\.\/(features|modules)\//
- [ ] 6+ boolean prop / 3+ seviye prop-drilling yerine kompozisyon/Context (TreeContext deseni) **kullan**  [Oncelik: Minor]  ([01 §3.6.3](./01-react-code-review.md#s-363-propkompozisyon-tasarimi)) Yasak: /(\s\w+=\{(true|false)\}){4,}/
  <details><summary>↳ örnek</summary>

  ```tsx
  // ❌ cok sayida boolean prop + derin prop-drilling
  <TreeNode selectedId={selectedId} expandedIds={expandedIds} onToggle={onToggle} showIcon hasChildren isLeaf disabled />
  // ✅ paylasilan durumu Context'e tasi
  const { selectedId, onToggle } = useContext(TreeContext);
  <TreeNode node={node} />
  ```
  </details>

## 7. TypeScript tipleme

- [ ] `: any`/`as any`/`Promise<any>` yerine, gerekiyorsa `unknown` + tip-daraltma (`lowercaseKeys(obj: unknown)` deseni) **kullan**  — `no-explicit-any: warn` + `max-warnings 0`  [Oncelik: Major]  ([01 §3.5.2 / AP-3](./01-react-code-review.md#s-352-any-yasagi-ve-ts-strict))
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ any tip guvenligini kaldirir
  function lowercaseKeys(obj: any) { return Object.keys(obj)...; }
  // ✅ unknown + tip-daraltma
  function lowercaseKeys(obj: unknown) {
    if (obj === null || typeof obj !== 'object') return obj;
    return Object.keys(obj as Record<string, unknown>)...;
  }
  ```
  </details>
- [ ] `transformResponse`/Context tipleri icin somut interface **kullan** (`response: any` -> `VarlikPageResponse`; `kisi: any` -> `GercekKisiDto | null`)  [Oncelik: Major]  ([01 §3.5.2 / AP-3](./01-react-code-review.md#s-352-any-yasagi-ve-ts-strict))
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ transformResponse/Context any
  transformResponse: (response: any) => ({ tipVarlikListe: response?.content ?? [] });
  // ✅ somut interface
  interface VarlikPageResponse { content: VarlikDto[] }
  transformResponse: (r: VarlikPageResponse) => ({ tipVarlikListe: r?.content ?? [] });
  ```
  </details>
- [ ] Frontend DTO/sayfalama tiplerinin backend `client` modulu DTO'lariyla uyumlu oldugundan (zarf `content/totalElements` <-> Spring `Page`) **emin ol**  — kontrat tutarliligi  [Oncelik: Major]  ([01 §6 capraz dokuman](./01-react-code-review.md#6-ilgili-dosyalar--capraz-linkler))
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ frontend tip backend Page zarfiyla uyumsuz
  interface VarlikPageResponse { items: VarlikDto[]; total: number; }
  // ✅ Spring Page alan adlariyla birebir
  interface VarlikPageResponse { content: VarlikDto[]; totalElements: number; totalPages: number; number: number; }
  ```
  </details>
- [ ] tsc'nin temiz oldugundan; strict/noUnusedLocals/noUnusedParameters/noFallthroughCasesInSwitch ihlali OLMADIGINDAN **emin ol**  [Oncelik: Major]  ([01 §3.5.2](./01-react-code-review.md#s-352-any-yasagi-ve-ts-strict)) Yasak: /@ts-(ignore|nocheck|expect-error)/
  <details><summary>↳ örnek</summary>

  ```json
  // ✅ tsconfig.json — zorunlu strict bayraklar (ihlal = tsc kirmizi)
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
  ```
  </details>

## 8. golge-ui & Module Federation (singleton/surum)

- [ ] Yeni remote shared blogunda cekirdek bagimliliklarin singleton+eager oldugundan **emin ol**: react, react-dom, react-router-dom, @mui/*, golge-ui, portal-ui*  — eksikse "Invalid hook call"/cift tema/bozuk auth  [Oncelik: Blocker]  ([04 §B.2](./04-golge-framework-frontend.md#review-kontrolleri-b2)) Yasak: /singleton\s*:\s*false/
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ cekirdek bagimliliklar shared'da degil (cift React -> Invalid hook call)
  shared: { react: {} }
  // ✅ cekirdek bagimliliklar singleton + eager
  shared: {
    react:            { singleton: true, eager: true },
    'react-dom':      { singleton: true, eager: true },
    'react-router-dom': { singleton: true, eager: true },
    '@mui/material':  { singleton: true, eager: true },
    'golge-ui':       { singleton: true, eager: true, version: false, requiredVersion: false },
  }
  ```
  </details>
- [ ] Remote redux store/redux'i gercekten paylasiyorsa @reduxjs/toolkit+react-redux singleton'inin eksiksiz oldugundan (shell/zeminsorgu paylasir, taraf-web paylasmaz) ve shared blok farkliliklarinin **kasitli** oldugundan **emin ol**  — yoksa cift store  [Oncelik: Major]  ([04 §B.2](./04-golge-framework-frontend.md#shared--singleton-bagimliliklar)) Yasak: /["\']\s*(@reduxjs\/toolkit|react-redux)["\']\s*:\s*\{(?:(?!singleton)[^}])*\}/
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ shell store'unu paylasan remote'ta sadece toolkit var, react-redux eksik -> cift store
  shared: { '@reduxjs/toolkit': { singleton: true, eager: true } }
  // ✅ store paylasiliyorsa ikisi de singleton (taraf-web paylasmiyorsa hicbiri olmaz — kasitli)
  shared: {
    '@reduxjs/toolkit': { singleton: true, eager: true },
    'react-redux':      { singleton: true, eager: true },
  }
  ```
  </details>
- [ ] React/React-DOM/MUI/golge-ui surumlerinin remote ile shell arasinda **major** farkli OLMADIGINDAN ve golge-ui'nin 1.16.x'e cekildiginden (hala ^1.0.x/^1.2.x kullanan repo var) **emin ol**  — singleton tek surum yukleyince digeri kirilir  [Oncelik: Blocker]  ([04 §B.2 golge-ui surum uyumu](./04-golge-framework-frontend.md#golge-ui-surum-uyumu-risk)) Yasak: /["\']golge-ui["\']\s*:\s*["\'][\^~]?1\.([0-9]|1[0-5])\./
  <details><summary>↳ örnek</summary>

  ```json
  // ❌ package.json — eski major (singleton 1.16.x yuklenince kayip export/API)
  "golge-ui": "^1.2.0"
  // ✅ tum repolar 1.16.x'e hizali
  "golge-ui": "1.16.10"
  ```
  </details>
- [ ] golge-ui/portal-ui* icin shared'da version: false, requiredVersion: false **kullan**  — surum uyumsuzlugunda hard-fail yerine tek instance zorlanir  [Oncelik: Minor]  ([04 §B.2](./04-golge-framework-frontend.md#shared--singleton-bagimliliklar)) Yasak: /["\']golge-ui["\']\s*:\s*\{[^}]*requiredVersion\s*:\s*["\']/
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ surum uyumsuzlugunda hard-fail
  'golge-ui': { singleton: true, eager: true }
  // ✅ version: false ile tek instance zorlanir (hard-fail yok)
  'golge-ui': { singleton: true, eager: true, version: false, requiredVersion: false }
  ```
  </details>
- [ ] `dedupe`/`optimizeDeps.dedupe` listesinin standart (`react`, `react-dom`, `react-router-dom`, `@remix-run/router`, `@mui/*`, `@emotion/*`, `golge-ui`) ve remote'lar arasi tutarli oldugundan **emin ol**  — dev'de cift kopya onlenir  [Oncelik: Major]  ([04 §B.2 dedupe](./04-golge-framework-frontend.md#shared--singleton-bagimliliklar))
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ dedupe listesi eksik -> dev'de cift kopya
  resolve: { dedupe: ['react', 'react-dom'] }
  // ✅ standart listenin tamami, remote'lar arasi tutarli
  resolve: { dedupe: ['react', 'react-dom', 'react-router-dom', '@remix-run/router', '@mui/material', '@emotion/react', 'golge-ui'] }
  ```
  </details>
- [ ] Remote'un kendi react-router'ini izole yuklemediginden (singleton) ve navigasyonun shell router context'inden kopmadigindan **emin ol**  [Oncelik: Major]  ([04 §B.2](./04-golge-framework-frontend.md#review-kontrolleri-b2)) Yasak: /["\']react-router-dom["\']\s*:\s*\{(?:(?!singleton)[^}])*\}/
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ react-router-dom shared'da singleton degil -> izole router, navigasyon kopar
  shared: { react: { singleton: true, eager: true } }
  // ✅ react-router-dom singleton -> tek router context, shell ile baglanir
  shared: {
    react:              { singleton: true, eager: true },
    'react-router-dom': { singleton: true, eager: true },
  }
  ```
  </details>
- [ ] Iki remote'ta ayni `name`/`remoteEntry.js` cakismasi OLMADIGINDAN ve `GolgeVitePlugin()` gerekliliginden **emin ol**  [Oncelik: Minor]  ([04 §B.2](./04-golge-framework-frontend.md#review-kontrolleri-b2))
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ baska remote ile cakisan name + golge plugin yok
  federation({ name: 'tarafApp', filename: 'remoteEntry.js', exposes: { ... } })
  // ✅ benzersiz name + GolgeVitePlugin
  plugins: [GolgeVitePlugin(), federation({ name: 'immovable_property_processes', filename: 'remoteEntry.js', exposes: { ... } })]
  ```
  </details>

## 9. Form & dogrulama

- [ ] Form alanlarini, global Redux store'a koymadan ekran-lokal useState/useReducer'da; submit'te ise RTK Query mutation/axios servisini **kullan**  [Oncelik: Minor]  ([01 §3.11.3](./01-react-code-review.md#s-3113-form-statei-lokal-tut)) Yasak: /dispatch\(\s*set(Form|Field)[A-Za-z]*\(/
  <details><summary>↳ örnek</summary>

  ```tsx
  // ❌ form alani global Redux store'da
  const ad = useAppSelector((s) => s.form.ad);
  dispatch(setFormAd(e.target.value));
  // ✅ form lokal state; submit'te mutation
  const [ad, setAd] = useState('');
  const [ekleKisi] = useEkleKisiMutation();
  const submit = () => ekleKisi({ ad });
  ```
  </details>
- [ ] Sabit-format alanlari (11 hane TC, telefon, vergi no) maskele; serbest TextField + manuel replace/slice tekrari yerine (react-imask/libphonenumber-js) **kullan**  [Oncelik: Minor]  ([01 §3.11.1](./01-react-code-review.md#s-3111-maskelenmis-girdi-tc-kimlik-telefon-vergi-no)) Yasak: /\.replace\(\/\\D\/g/
  <details><summary>↳ örnek</summary>

  ```tsx
  // ❌ serbest TextField + elle replace/slice ile maskeleme
  <TextField value={tc} onChange={(e) => setTc(e.target.value.replace(/\D/g, '').slice(0, 11))} />
  // ✅ maske bileseni (react-imask)
  const TcMask = React.forwardRef((props, ref) => <IMaskInput {...props} mask="00000000000" inputRef={ref} unmask />);
  <TextField name="tcKimlikNo" InputProps={{ inputComponent: TcMask }} />
  ```
  </details>
- [ ] Istemci dogrulamasi olsa da kritik akista yalniz ona guvenme; **backend tek gercek kaynak** olsun (golge `*Constraint` + jakarta `@Valid`), hata zarfini (`message`/`error`) kullaniciya gosterdiginden **emin ol**  [Oncelik: Major]  ([01 §3.11.2](./01-react-code-review.md#s-3112-dogrulama-ve-gonderim))
  <details><summary>↳ örnek</summary>

  ```tsx
  // ❌ yalniz istemci dogrulamasina guven; backend hatasi yutulur
  if (!tcGecerli(tc)) return; await ekleKisi({ tc }).unwrap();
  // ✅ backend hata zarfini (message/error) kullaniciya goster
  try { await ekleKisi({ tc }).unwrap(); }
  catch (e) { enqueueSnackbar((e as { data?: { message?: string } }).data?.message, { variant: 'error' }); }
  ```
  </details>

## 10. i18n (yalniz `islem-yonetimi-web`)

- [ ] i18n kullanan feature'da sabit string yerine const {t}=useTranslation('namespace'); t('anahtar') **kullan**  [Oncelik: Major]  ([01 §3.12.1](./01-react-code-review.md#s-3121-namespaceli-feature-bazli-kurulum)) Yasak: /(label|placeholder)="[A-Za-z]{4,}/
  <details><summary>↳ örnek</summary>

  ```tsx
  // ❌ sabit string (i18n kullanan feature'da)
  <Button>Kaydet</Button>
  // ✅ namespace'li t()
  const { t } = useTranslation('kuralMotoru');
  <Button>{t('kaydet')}</Button>
  ```
  </details>
- [ ] Yeni metin icin hem `tr` hem `en` dosyasina, eksik birakmadan ve `fallbackLng: 'tr'` mevcutken, anahtar **ekle**  [Oncelik: Major]  ([01 §3.12.1](./01-react-code-review.md#s-3121-namespaceli-feature-bazli-kurulum))
  <details><summary>↳ örnek</summary>

  ```json
  // ❌ anahtar yalniz tr/kuralMotoru.json'da, en eksik
  { "kaydet": "Kaydet" }
  // ✅ hem tr hem en dosyasina ekle
  // tr/kuralMotoru.json: { "kaydet": "Kaydet" }
  // en/kuralMotoru.json: { "kaydet": "Save" }
  ```
  </details>
- [ ] Cevirileri, tek dev sozluk yerine feature namespace'ine (ns/defaultNS) **bol**  [Oncelik: Minor]  ([01 §3.12.1](./01-react-code-review.md#s-3121-namespaceli-feature-bazli-kurulum)) Yasak: /useTranslation\(\s*\)/
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ tek dev sozluk (namespace yok)
  i18n.init({ resources: { tr: { translation: tumCeviriler } } });
  // ✅ feature namespace'ine bol
  i18n.init({ resources: { tr: { kuralMotoru: tr }, en: { kuralMotoru: en } },
    ns: ['kuralMotoru'], defaultNS: 'kuralMotoru', fallbackLng: 'tr' });
  ```
  </details>

## 11. Erisilebilirlik

- [ ] Etkilesimli <div onClick> yerine MUI bilesenini (IconButton/Button); ham div ise tabIndex={0}+onKeyDown+role ve :focus-visible **kullan**  [Oncelik: Major]  ([01 §3.13.1](./01-react-code-review.md#s-3131-klavye-erisimi-ve-odak)) Yasak: /<div[^>]*onClick=/
  <details><summary>↳ örnek</summary>

  ```tsx
  // ❌ etkilesimli div, klavyeyle erisilemez
  <div onClick={onSec}>Sec</div>
  // ✅ MUI bileseni (klavye/odak hazir)
  <Button onClick={onSec}>Sec</Button>
  // ham div sart ise: <div role="button" tabIndex={0} onClick={onSec} onKeyDown={...} />
  ```
  </details>
- [ ] Sadece-ikon buton icin aria-label/Tooltip; TextField icin label/aria-label **ekle**  [Oncelik: Minor]  ([01 §3.13.2](./01-react-code-review.md#s-3132-etiket-ve-metin-alternatifleri)) Yasak: /<IconButton(?:(?!aria-label)[^>])*>/
  <details><summary>↳ örnek</summary>

  ```tsx
  // ❌ ikon buton etiketsiz (ekran okuyucu okuyamaz)
  <IconButton onClick={sil}><DeleteIcon /></IconButton>
  // ✅ Tooltip + aria-label
  <Tooltip title="Sil"><IconButton aria-label="Sil" onClick={sil}><DeleteIcon /></IconButton></Tooltip>
  ```
  </details>
- [ ] Modal odak yonetiminde acilinca odagin icine, kapaninca tetikleyiciye dondugunden (GolgeModal yonetir; ozel modalda davranis korunmus olmali) **emin ol**  [Oncelik: Minor]  ([01 §3.13.3](./01-react-code-review.md#s-3133-modal-odak-yonetimi)) Yasak: /disable(AutoFocus|EnforceFocus|RestoreFocus)/
  <details><summary>↳ örnek</summary>

  ```tsx
  // ❌ el yapimi overlay; odak tuzaklamasi/geri donus yok
  {open && <div className="overlay"><div className="dialog">{children}</div></div>}
  // ✅ GolgeModal odagi yonetir (acilinca ice, kapaninca tetikleyiciye)
  <GolgeModal open={open} onClose={onClose}>{children}</GolgeModal>
  ```
  </details>

## 12. Guvenlik (XSS / token)

- [ ] Token'i elle localStorage/cookie'den okumaktan veya prop olarak gecmekten kacin; useGolgeSecurity().getToken() / golgeRtkApiHeaders / getShellAuthToken() standardini **kullan**  [Oncelik: Blocker]  ([04 §B.1 / §B.2](./04-golge-framework-frontend.md#review-kontrolleri-b1)) Yasak: /(localStorage|sessionStorage)\.(get|set)Item\(\s*["\'][^"\']*[Tt]oken/
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ token elle localStorage'dan / prop olarak
  const token = localStorage.getItem('access_token');
  // ✅ golge guvenlik standardi
  const token = await useGolgeSecurity().getToken(); // veya getShellAuthToken()
  ```
  </details>
- [ ] apiSlice'ta prepareHeaders: golgeRtkApiHeaders kullan; elle Authorization header eklemekten **kacin**  — auth propagasyonu zorunlu  [Oncelik: Major]  ([01 §3.9.1](./01-react-code-review.md#s-391-standart-slice-kurulumu)) Yasak: /["\']?Authorization["\']?\s*\]?\s*[:=]\s*\S/
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ elle Authorization header
  baseQuery: fetchBaseQuery({ baseUrl, prepareHeaders: (h) => { h.set('Authorization', `Bearer ${token}`); return h; } })
  // ✅ golgeRtkApiHeaders ile otomatik auth propagasyonu
  baseQuery: fetchBaseQuery({ baseUrl, prepareHeaders: golgeRtkApiHeaders })
  ```
  </details>
- [ ] axios serviste header'i elle eklemekten ve fazla Accept/Content-Type'tan kacin; tekil tarafClient (auth/401/403/500 interceptor) uzerinden **kullan**  [Oncelik: Major]  ([01 §3.8.1-3.8.2](./01-react-code-review.md#s-381-merkezi-client-factory--interceptor)) Yasak: /axios\.(get|post|put|patch|delete)\(/
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ her cagrida elle header + ham axios
  axios.get(url, { headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
  // ✅ tekil tarafClient (header + interceptor merkezi)
  tarafClient.get(url);
  ```
  </details>
- [ ] Korumali rotada useGolgeSecurity().hasAuthority(...) kullan; hasAuthority **async** oldugu icin yetki cozulmeden rota render etmekten kacin (yetkiliKullanici/routesReady guard); rol kodunu Permission sabitinde (backend IY_*/KDS_* ile uyumlu) **belirt**  [Oncelik: Blocker]  ([01 §3.7.2](./01-react-code-review.md#s-372-korumali-rota-yetki-deseni)) Yasak: /(?<!await\s)hasAuthority\([^)]*\)\s*(&&|\?)/
  <details><summary>↳ örnek</summary>

  ```tsx
  // ❌ async hasAuthority cozulmeden rota render edilir (yetkisiz ekran gorunur)
  if (hasAuthority(Permission.IY_GORUNTULE)) return <Routes>...</Routes>;
  // ✅ yetki cozulene kadar guard (routesReady / yetkiliKullanici)
  useEffect(() => { hasAuthority(Permission.IY_GORUNTULE).then(setYetkiliKullanici); }, [hasAuthority]);
  if (yetkiliKullanici === false) return <UnauthorizedScreen />;
  ```
  </details>
- [ ] Ham HTML enjeksiyonundan kacin: dangerouslySetInnerHTML kullanildiysa girdiyi sanitize ettiginden **emin ol**  — XSS  [Oncelik: Blocker] Yasak: /dangerouslySetInnerHTML/
  <details><summary>↳ örnek</summary>

  ```tsx
  // ❌ sanitize edilmemis ham HTML (XSS)
  <div dangerouslySetInnerHTML={{ __html: aciklama }} />
  // ✅ sanitize edilmis (mumkunse dangerouslySetInnerHTML'den tamamen kacin)
  <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(aciklama) }} />
  ```
  </details>
- [ ] react-router-dom'u tek kaynaktan (dogrudan veya golge-ui/router re-export) import et; iki kaynak karistirmaktan **kacin**  [Oncelik: Minor]  ([01 §3.7.1](./01-react-code-review.md#s-371-standart-yerlesim)) Yasak: /from\s+["\']react-router["\']/
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ ayni dosyada iki kaynak karistirilmis
  import { useNavigate } from 'react-router-dom';
  import { Routes } from 'golge-ui/router';
  // ✅ tek kaynaktan
  import { useNavigate, Routes } from 'golge-ui/router';
  ```
  </details>

## 13. RTK Query & axios (veri katmani)

- [ ] query vs mutation secimini dogru yaparak (salt-okumayi mutation yapmadan) salt-okuma icin builder.query+providesTags, yazma icin builder.mutation+invalidatesTags **kullan**  [Oncelik: Major]  ([01 §3.9.3 / AP-4](./01-react-code-review.md#s-393-query-vs-mutation-dogru-secimi)) Yasak: /mutation\(\{[^}]*method:\s*["\']GET/
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ salt-okuma mutation ile (cache devre disi, gereksiz tekrar istek)
  fetchTuzelKisiBilgileri: builder.mutation({ query: (b) => ({ url: '/mersis/...', method: 'POST', body: b }) })
  // ✅ salt-okuma query + providesTags
  getTuzelKisiBilgileri: builder.query({ query: (id) => `/mersis/${id}`, providesTags: ['TuzelKisi'] })
  ```
  </details>
- [ ] Her `createApi` icin store'a hem `[x.reducerPath]: x.reducer` hem `.concat(x.middleware)`'i **ekle**  — eksik middleware cache/invalidation'i bozar  [Oncelik: Blocker]  ([01 §3.9.5](./01-react-code-review.md#s-395-store-kaydi-tamlik-kontrolu))
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ reducer eklenmis ama middleware eksik (cache/invalidation bozulur)
  reducer: { [varlikApi.reducerPath]: varlikApi.reducer },
  middleware: (gDM) => gDM(),
  // ✅ hem reducer hem middleware
  reducer: { [varlikApi.reducerPath]: varlikApi.reducer },
  middleware: (gDM) => gDM().concat(varlikApi.middleware),
  ```
  </details>
- [ ] Kardes endpoint'ler icin ayri createApi yerine tek API + injectEndpoints ile genisletmeyi **kullan**  — ayri reducerPath/middleware store'u sisirir  [Oncelik: Major]  ([01 §3.9.2](./01-react-code-review.md#s-392-injectendpoints-ile-tek-api-genisletme-cogalmayi-onle)) Yasak: /=\s*createApi\(/
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ kardes endpoint'ler icin ayri createApi (ayri reducerPath/middleware)
  export const varlikApiSlice = createApi({ reducerPath: 'varlikApi', baseQuery, endpoints: ... });
  export const degerApiSlice = createApi({ reducerPath: 'degerApi', baseQuery, endpoints: ... });
  // ✅ tek API + injectEndpoints
  export const varlikApiSlice = tipDegerVarlikApi.injectEndpoints({ endpoints: (builder) => ({ ... }) });
  ```
  </details>
- [ ] Gereksiz tag invalidation'dan (cift-render) kacin; lossy transformResponse'un (lowercaseKeys) tip tanimlariyla tutarli oldugundan **emin ol**  [Oncelik: Minor]  ([01 §3.9.4](./01-react-code-review.md#s-394-transformresponse-ve-tagleme)) Yasak: /lowercaseKeys/
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ lossy transformResponse ama tip backend zarfina gore yazilmis (uyumsuz)
  transformResponse: (r) => lowercaseKeys(r) as IslemTanim, // tip { Ad: ... } bekliyor
  // ✅ tip lowercaseKeys ciktisina gore (gereksiz invalidation yerine lokal guncelleme)
  interface IslemTanim { ad: string } // lowercase formla tutarli
  transformResponse: (r: unknown): IslemTanim => lowercaseKeys(r) as IslemTanim,
  ```
  </details>
- [ ] Arama/autocomplete'te `AbortController` ile istek iptali, effect cleanup'ta `.abort()` ve `catch`'te `AbortError` ayiklamasi **kullan**  [Oncelik: Major]  ([01 §3.8.4](./01-react-code-review.md#s-384-istek-iptali-cancellation))
  <details><summary>↳ örnek</summary>

  ```tsx
  // ❌ iptal yok; eski istek yeni sonucu ezebilir
  useEffect(() => { fetchOptions(text).then(setSecenekler); }, [text]);
  // ✅ AbortController + cleanup'ta abort + AbortError ayikla
  useEffect(() => {
    const c = new AbortController();
    fetchOptions(text, c.signal).then(setSecenekler).catch((e) => { if (e.name !== 'AbortError') throw e; });
    return () => c.abort();
  }, [text]);
  ```
  </details>
- [ ] 404/genel hatayi, her serviste try/catch + if 404 showSnackBar kopyasindan kacinarak, axios response interceptor veya rtkQueryErrorLogger middleware ile merkezilestirmeyi **kullan**  [Oncelik: Major]  ([01 §3.8.3 / §3.9.6](./01-react-code-review.md#s-383-hata-isleme--tutarli-ve-merkezi)) Yasak: /(status|statusCode)\s*===?\s*404/
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ her serviste 404 -> snackbar kopyasi
  catch (error) { if (isAxiosError(error) && error.response?.status === 404) showSnackBar(error.response?.data?.message, TYPE.WARNING); }
  // ✅ merkezi: axios response interceptor / rtkQueryErrorLogger middleware
  client.interceptors.response.use((r) => r, (error) => { /* 404/500 tek yerde */ return Promise.reject(error); });
  ```
  </details>

## 14. MUI 6 (tema/stil)

- [ ] Tek tema kaynagi olarak GolgeThemeProvider'i (golge-ui/theme) ve tarih lokalizasyonunu (AdapterDayjs, tr/trTR) kullan; ayri createTheme eklemekten **kacin**  [Oncelik: Minor]  ([01 §3.10.1](./01-react-code-review.md#s-3101-tema-saglayicisi-ve-lokalizasyon)) Yasak: /createTheme\(/
  <details><summary>↳ örnek</summary>

  ```tsx
  // ❌ ayri createTheme + ThemeProvider (golge temasiyla cakisir)
  <ThemeProvider theme={createTheme({ palette: { mode: 'light' } })}>...</ThemeProvider>
  // ✅ tek kaynak GolgeThemeProvider + lokalizasyon
  import { GolgeThemeProvider } from 'golge-ui/theme';
  <GolgeThemeProvider><LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="tr">...</LocalizationProvider></GolgeThemeProvider>
  ```
  </details>
- [ ] Tema degeri (theme.spacing(), theme.palette.*, breakpoint objeleri) kullan; tema-disi sabit hex/px gommekten **kacin**  [Oncelik: Minor]  ([01 §3.10.2](./01-react-code-review.md#s-3102-sx-vs-styled-secimi)) Yasak: /(color|backgroundColor|background|border|borderColor)\s*:\s*["\']#[0-9a-fA-F]{3,8}["\']/
  <details><summary>↳ örnek</summary>

  ```tsx
  // ❌ tema-disi sabit hex/px
  <Box sx={{ padding: '16px', color: '#1976d2' }} />
  // ✅ tema degeri
  <Box sx={{ p: 2, color: 'primary.main' }} />
  ```
  </details>
- [ ] Basit tek-seferlik stil icin gereksiz styled'tan ve sx={... as any} (CSS var tip kacisi) kullanimindan kacinarak, tekrarlanan sx blogunu styled'a **cikar**  [Oncelik: Minor]  ([01 §3.10.2-3.10.3](./01-react-code-review.md#s-3103-as-any-ile-sx-tip-kacisi)) Yasak: /sx=\{[^;]*as\s+any/
  <details><summary>↳ örnek</summary>

  ```tsx
  // ❌ CSS var icin as any ile tip kacisi
  <Box sx={{ '--header-sub-content-height': h } as any} />
  // ✅ CSS custom property'i style ile dogru tiple ver
  <Box style={{ '--header-sub-content-height': h } as React.CSSProperties} />
  ```
  </details>
- [ ] MUI 6 Grid2 API'sini (<Grid size={{xs,md}}>) kullan; eski <Grid item xs> ile karistirmaktan (repo MUI surumune gore) **kacin**  [Oncelik: Minor]  ([01 §3.10.4](./01-react-code-review.md#s-3104-grid2-ve-responsive)) Yasak: /<Grid\s+item\b/
  <details><summary>↳ örnek</summary>

  ```tsx
  // ❌ eski Grid API (MUI 6'da deprecated)
  <Grid item xs={12} md={6}>...</Grid>
  // ✅ MUI 6 Grid2 API
  import Grid from '@mui/material/Grid2';
  <Grid size={{ xs: 12, md: 6 }}>...</Grid>
  ```
  </details>

## 15. Test & lint (max-warnings 0)

- [ ] npm run lint'in (eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0) temiz oldugundan **emin ol**; yeni uyari = CI kirmizi  [Oncelik: Blocker]  ([01 §3.5.1](./01-react-code-review.md#s-351-eslint---max-warnings-0--uyarisiz-birlestirme)) Yasak: /\/\*\s*eslint-disable\b/
  <details><summary>↳ örnek</summary>

  ```bash
  # ❌ uyari toleransli lint (CI'de gecer ama borc birikir)
  eslint . --ext ts,tsx
  # ✅ package.json lint script'i: sifir uyari + olu disable hata
  eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0
  ```
  </details>
- [ ] Hangi ESLint config'in gecerli oldugunu **dogrula**: legacy `.eslintrc.cjs` (taraf-web) vs flat `eslint.config.js` (islem-yonetimi-web)  [Oncelik: Minor]  ([01 §2.1](./01-react-code-review.md#21-teknoloji-yigini-dogrulanmis-surumler))
- [ ] Aktif kurallarin ihlal edilmediginden **emin ol**: `rules-of-hooks: error`, `exhaustive-deps: warn`, `no-explicit-any: warn`, `no-console: warn` (islem-yonetimi: `prefer-const`/`no-var`/`eqeqeq: error`)  [Oncelik: Major]  ([01 §3.5.1](./01-react-code-review.md#s-351-eslint---max-warnings-0--uyarisiz-birlestirme))
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ kuralin gevsetilmesi/kapatilmasi
  rules: { 'react-hooks/rules-of-hooks': 'off' }
  // ✅ aktif kural seti (max-warnings 0 ile warn de kirilir)
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-console': 'warn',
  }
  ```
  </details>
- [ ] Yeni/degisen mantik icin, mevcut testler gecerken, test **ekle**  [Oncelik: Minor]

---

## 16. Guvenlik — Genel Iyi Pratikler (global)

> Platformdaki TUM `<is-alani>-web` repolarina uygulanan, review/CI/config ile dogrulanabilir genel guvenlik kapilari. (Token/auth standardi icin Bolum 12'ye, sanitize edilmis `dangerouslySetInnerHTML` icin yine Bolum 12'ye atif.)

- [ ] eval/new Function(...)/setTimeout('kod-string')/string-setInterval kullanimini **yasakla**; dinamik calistirma yerine veri-yonlu cozum kullan  — ham string yurutme XSS/RCE kapisidir; ESLint no-eval/no-implied-eval/no-new-func ile CI'da dogrulanabilir  [Oncelik: Blocker] Yasak: /(\beval\(|new\s+Function\(|set(Timeout|Interval)\(\s*["\'])/
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ kullanici/sunucu verisinden string kod yurutme (no-eval ihlali)
  const sonuc = eval(entityDto.ifadeMetni);
  // ✅ guvenli yorumlayici / lookup tablosu (string yurutme yok)
  const sonuc = ifadeYorumlayici.degerlendir(entityDto.ifadeMetni);
  ```
  </details>
- [ ] DOM API'leri ile ham HTML enjeksiyonundan **kacin**: element.innerHTML = .../outerHTML/document.write/insertAdjacentHTML ile sunucu-veya-kullanici verisi basma; React render veya textContent kullan  — dangerouslySetInnerHTML disinda kalan klasik XSS vektoru  [Oncelik: Blocker] Yasak: /(\.(innerHTML|outerHTML)\s*=[^=]|document\.write\(|insertAdjacentHTML\()/
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ ham DOM innerHTML ile veri basma (XSS)
  containerRef.current.innerHTML = entityDto.aciklama;
  // ✅ React render et veya textContent kullan (HTML yorumlanmaz)
  containerRef.current.textContent = entityDto.aciklama; // ya da <div>{entityDto.aciklama}</div>
  ```
  </details>
- [ ] Kullanici verisinden gelen href/src URL'lerinde javascript:/data:/vbscript: semasini **engelle**; yalniz http(s)/mailto/tel ve bilinen-iyi listeye izin ver  — <a href={kullaniciUrl}> ile script semasi XSS kapisidir  [Oncelik: Major] Yasak: /(href|src)\s*=\s*\{?\s*["\']\s*(javascript|vbscript|data):/
  <details><summary>↳ örnek</summary>

  ```tsx
  // ❌ sema dogrulanmamis href (javascript: -> XSS)
  <a href={entityDto.disBaglanti}>Detay</a>
  // ✅ guvenli sema kontrolu
  const guvenli = /^(https?:|mailto:|tel:)/i.test(url) ? url : '#';
  <a href={guvenli}>Detay</a>
  ```
  </details>
- [ ] Yeni sekme acan target="_blank" baglantilarda rel="noopener noreferrer" (veya MUI Link) **kullan**  — noopener yoksa hedef sayfa window.opener ile reverse-tabnabbing yapabilir; review/lint (react/jsx-no-target-blank) ile dogrulanabilir  [Oncelik: Major] Yasak: /target=["\']_blank["\']\s*(?![\s\S]*rel=)/
  <details><summary>↳ örnek</summary>

  ```tsx
  // ❌ opener acik birakilir (reverse tabnabbing)
  <a href={url} target="_blank">Ac</a>
  // ✅ rel ile opener kapatilir
  <a href={url} target="_blank" rel="noopener noreferrer">Ac</a>
  ```
  </details>
- [ ] Kullanici-kontrollu redirect/returnUrl/next parametresiyle yonlendirmede acik-yonlendirmeyi (open redirect) **dogrula**: yalniz uygulama-ici goreli yol veya allowlist host'a izin ver  — kontrol edilmemis yonlendirme phishing/token sizdirma kapisidir  [Oncelik: Major] Yasak: /(navigate\(|location\.href\s*=)[^;]*(searchParams\.get|returnUrl|redirectUrl|redirect_uri)/
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ query'den gelen mutlak URL'e dogrudan yonlendirme (open redirect)
  navigate(searchParams.get('returnUrl')!);
  // ✅ yalniz goreli ic yol; harici/protokol-goreli reddedilir
  const hedef = returnUrl?.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/';
  navigate(hedef);
  ```
  </details>
- [ ] Client bundle'a gizli anahtar/parola/sertifika/private token **koyma**; yalniz public, gizli-olmayan `VITE_*` config degerleri gomulu olsun (Vite `VITE_` disi env'i bundle'a dahil etmez ama gizli degeri `VITE_`'e koymak onu public yapar)  — bundle herkese acik; grep/CI ile dogrulanabilir  [Oncelik: Blocker]
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ gizli anahtar VITE_ ile bundle'a sizar (public olur)
  const apiKey = import.meta.env.VITE_GIZLI_API_KEY; // tarayicida acik
  // ✅ yalniz public config; gizli is gateway/BFF tarafinda kalir
  const apiTabani = import.meta.env.VITE_API_BASE_URL; // gizli degil
  ```
  </details>
- [ ] Kaynak kodda gomulu sirr (token/parola/`Bearer ...`/private key) bulunmadigindan, secret-scan (gitleaks/trufflehog veya CI grep) ile **emin ol**  — sizan sirr geri alinamaz; CI gate ile dogrulanabilir  [Oncelik: Blocker]
  <details><summary>↳ örnek</summary>

  ```bash
  # ❌ commit edilmis sirr
  # const TOKEN = "eyJhbGciOi...";
  # ✅ CI secret-scan gate (PR'i kirar)
  gitleaks detect --source . --no-banner --redact
  ```
  </details>
- [ ] Bagimlilik CVE'lerini **denetle**: `npm audit --audit-level=high` (veya `--omit=dev` ile prod set) CI'da calissin ve yuksek/kritik aciklarla merge engellensin; lockfile commit'li olsun  — bilinen-acikli paket en yaygin saldiri yuzeyidir  [Oncelik: Major]
  <details><summary>↳ örnek</summary>

  ```bash
  # ❌ denetimsiz bagimlilik (bilinen CVE uretime gider)
  npm ci
  # ✅ CI gate: yuksek/kritik acik = kirmizi
  npm ci && npm audit --audit-level=high
  ```
  </details>
- [ ] Uretim build'inde kaynak harita (source map) yayinindan **kacin** veya erisimi kisitla (build.sourcemap: false ya da gizli/yetkili sunum)  — public source map ile tum kaynak ve ic mantik aciga cikar; vite.config ile dogrulanabilir  [Oncelik: Minor] Yasak: /sourcemap\s*:\s*true/
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ public source map (orijinal kaynak aciga cikar)
  build: { sourcemap: true }
  // ✅ uretimde kapali (veya yalniz error-tracking'e gizli yuklenir)
  build: { sourcemap: false }
  ```
  </details>
- [ ] CSP / guvenli HTTP header'larin (Content-Security-Policy, X-Frame-Options/frame-ancestors, X-Content-Type-Options, Referrer-Policy) gateway/sunum katmaninda tanimli oldugundan **emin ol**; unsafe-inline/unsafe-eval'den kacin  — XSS/clickjacking icin son savunma hatti; gateway config ile dogrulanabilir  [Oncelik: Major] Yasak: /(unsafe-inline|unsafe-eval)/
  <details><summary>↳ örnek</summary>

  ```yaml
  # ❌ CSP/güvenlik header yok (XSS/clickjacking acik)
  # (header tanimsiz)
  # ✅ gateway/nginx guvenli header seti
  add_header Content-Security-Policy "default-src 'self'; object-src 'none'; frame-ancestors 'self'";
  add_header X-Content-Type-Options "nosniff";
  add_header Referrer-Policy "strict-origin-when-cross-origin";
  ```
  </details>
- [ ] window.addEventListener('message', ...) ile gelen postMessage'ta event.origin'i (ve beklenen kaynagi) **dogrula**; dogrulanmamis mesaj govdesini state/DOM'a islemekten kacin  — Module Federation/iframe kurulumunda guvenilmeyen origin enjeksiyon kapisidir  [Oncelik: Major] Yasak: /postMessage\([^)]*["\']\*["\']\s*\)/
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ origin dogrulanmadan mesaj islenir
  window.addEventListener('message', (e) => setVeri(e.data));
  // ✅ beklenen origin kontrolu
  window.addEventListener('message', (e) => {
    if (e.origin !== import.meta.env.VITE_SHELL_ORIGIN) return;
    setVeri(e.data);
  });
  ```
  </details>
- [ ] Hata/exception detayini (stack trace, ic URL, sunucu mesaji ham hali) son kullaniciya **gosterme**; kullaniciya genel mesaj, detayi merkezi `logger`/ekolog'a gonder  — sizinti ic mimariyi ifsa eder (Bolum 5 merkezi `logger` ve Bolum 13 merkezi hata isleme ile uyumlu)  [Oncelik: Minor]
  <details><summary>↳ örnek</summary>

  ```tsx
  // ❌ ham hata/stack kullaniciya basilir (ic detay sizar)
  enqueueSnackbar(String(error), { variant: 'error' });
  // ✅ kullaniciya genel mesaj; detay merkezi log'a
  logger.error('Entity kaydi basarisiz', error);
  enqueueSnackbar('Islem tamamlanamadi, lutfen tekrar deneyin', { variant: 'error' });
  ```
  </details>

## 17. Performans & Kaynak (GC/RAM/CPU) — Genel Iyi Pratikler (global)

> Platformdaki TUM `<is-alani>-web` repolarina uygulanan, somut kaynak etkisi (GC/RAM/CPU/bundle) belirten genel performans kapilari. (useEffect listener/interval/AbortController cleanup icin Bolum 3'e, react-window sanallastirma icin Bolum 4'e, AbortController istek iptali icin Bolum 13'e atif.)

- [ ] RTK Query cache'inin sinirsiz buyumesini keepUnusedDataFor ile **sinirla** ve buyuk/sik-degisen sorgularda gerektiginde api.util.resetApiState() veya api.util.invalidateTags(...) ile temizle  — varsayilan 60 sn ablukasi disinda tutulan binlerce arama/parametre varyantli cache sonsuz birikir → RAM  [Oncelik: Major] Yasak: /keepUnusedDataFor\s*:\s*[1-9]\d{3,}/
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ her arama metni ayri cache girdisi olarak kalir (sinirsiz buyume → RAM)
  export const entityApi = createApi({ baseQuery, endpoints: (b) => ({ ara: b.query({ query: (q) => `/entity?ara=${q}` }) }) });
  // ✅ kullanilmayan veriyi kisa surede dusur
  export const entityApi = createApi({ baseQuery, keepUnusedDataFor: 30, endpoints: (b) => ({ ... }) });
  ```
  </details>
- [ ] Buyuk veri kumelerini / Blob / dosya icerigi / base64 string / genis dizileri Redux store veya Context'te **tutma**; ihtiyac aninda ureten kaynaktan oku, gerekirse useRef/yerel degiskende geciri tut  — store serialize edilir ve uzun yasar → RAM/GC (server verisi icin Bolum 2 RTK Query atfi)  [Oncelik: Major] Yasak: /:\s*(Blob|File|ArrayBuffer|Uint8Array)(\[\])?\s*[;,]/
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ MB'larca dosya/base64 Redux state'te (store sislir → RAM/GC)
  dispatch(setYuklenenDosya({ base64: await dosyayiBase64Yap(file) }));
  // ✅ buyuk icerigi store disinda tut; yalniz referans/metadata sakla
  const dosyaRef = useRef<File | null>(file);
  dispatch(setDosyaMeta({ ad: file.name, boyut: file.size }));
  ```
  </details>
- [ ] createObjectURL ile uretilen object URL'leri kullanim bittiginde / unmount'ta URL.revokeObjectURL(...) ile **serbest birak**  — revoke edilmeyen URL referans tuttugu Blob'u GC'den korur → RAM (PDF/gorsel onizleme indir/export akislari)  [Oncelik: Major] Yasak: /URL\.createObjectURL\(/
  <details><summary>↳ örnek</summary>

  ```tsx
  // ❌ object URL revoke edilmez (Blob GC olmaz → RAM sizintisi)
  const url = URL.createObjectURL(blob); setOnizleme(url);
  // ✅ cleanup'ta revoke
  useEffect(() => { const url = URL.createObjectURL(blob); setOnizleme(url);
    return () => URL.revokeObjectURL(url); }, [blob]);
  ```
  </details>
- [ ] Buyuk kutuphanelerden tam (barrel) import yerine named/alt-yol import **kullan**: lodash yerine lodash-es/lodash/debounce, import { Button } from '@mui/material' yerine gerektiginde @mui/material/Button, ikonlarda @mui/icons-material/X  — barrel import tum modulu agaca cekip parse ettirir → bundle/parse CPU + RAM  [Oncelik: Major] Yasak: /from\s+["\']\s*(lodash|@mui\/icons-material)["\']/
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ tam kutuphane / barrel import (kullanilmayan kod da gelir)
  import _ from 'lodash';
  import { Delete } from '@mui/icons-material'; // tum ikon barrel'i parse edilir
  // ✅ alt-yol / named import (tree-shake + dusuk parse)
  import debounce from 'lodash/debounce';
  import DeleteIcon from '@mui/icons-material/Delete';
  ```
  </details>
- [ ] Turetilmis store verisini bilesende her render hesaplamak yerine reselect/createSelector ile memoize edilmis selector **kullan**; selector icinde inline .filter/.map/.sort ile her cagrida yeni referans donmesinden kacin  — memoize edilmemis selector yeni referans uretip gereksiz re-render zinciri tetikler → CPU  [Oncelik: Major] Yasak: /useSelector\([\s\S]*=>[\s\S]*\.(filter|map|sort)\(/
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ her render yeni dizi referansi → tum tuketiciler re-render
  const aktifler = useAppSelector((s) => s.entity.liste.filter((e) => e.aktif));
  // ✅ createSelector ile memoize (girdi degismedikce ayni referans)
  const secAktifEntityler = createSelector((s: RootState) => s.entity.liste, (l) => l.filter((e) => e.aktif));
  const aktifler = useAppSelector(secAktifEntityler);
  ```
  </details>
- [ ] Pahali tek-seferlik nesneleri (Intl.NumberFormat/Intl.DateTimeFormat, RegExp, agir konfigurasyon) render govdesinde yeniden yaratmaktan **kacin**; modul-seviyesinde veya useMemo ile tek kez uret  — her render'da yeni Intl/RegExp allocate edip atmak → GC baskisi + CPU  [Oncelik: Minor] Yasak: /new\s+Intl\.\w+\([\s\S]*\)\.format\(/
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ her render yeni Intl/RegExp (allocate + GC)
  function fiyat({ deger }) { return new Intl.NumberFormat('tr-TR').format(deger); }
  // ✅ modul-seviyesinde tek kez (paylasilan instance)
  const trFormat = new Intl.NumberFormat('tr-TR');
  function fiyat({ deger }) { return trFormat.format(deger); }
  ```
  </details>
- [ ] setInterval/setTimeout/requestAnimationFrame/polling dongusunu unmount'ta clearInterval/clearTimeout/cancelAnimationFrame ile **iptal et**; ozellikle gorunmeyen sekme/komponentte polling birakma  — temizlenmemis zamanlayici state guncellemeye devam edip referans tutar → RAM sizintisi + CPU (Bolum 3 useEffect cleanup ilkesiyle uyumlu)  [Oncelik: Major] Yasak: /(setInterval\(|requestAnimationFrame\()/
  <details><summary>↳ örnek</summary>

  ```tsx
  // ❌ interval temizlenmez (unmount sonrasi calismaya devam → sizinti/CPU)
  useEffect(() => { setInterval(() => refetch(), 5000); }, []);
  // ✅ cleanup'ta clearInterval
  useEffect(() => { const id = setInterval(() => refetch(), 5000); return () => clearInterval(id); }, [refetch]);
  ```
  </details>
- [ ] Uzun-omurlu WebSocket/SSE/EventSource/harici SDK aboneliklerini bilesen unmount'ta close()/unsubscribe() ile **kapat**; her acilista yeni baglanti acip kapatmamaktan kacin  — kapanmayan baglanti hem soket/handle hem callback closure'unu tutar → RAM/baglanti sizintisi  [Oncelik: Major] Yasak: /new\s+(WebSocket|EventSource)\(/
  <details><summary>↳ örnek</summary>

  ```tsx
  // ❌ EventSource hic kapatilmaz (her mount yeni baglanti, eskiler sizar)
  useEffect(() => { const es = new EventSource(url); es.onmessage = onMsg; }, [url]);
  // ✅ cleanup'ta kapat
  useEffect(() => { const es = new EventSource(url); es.onmessage = onMsg; return () => es.close(); }, [url]);
  ```
  </details>
- [ ] Liste render'inda key olarak kararli benzersiz kimlik (item.id) **kullan**; array index'i veya her render degisen deger (rastgele/Date.now) key'i olarak kullanma  — kararsiz key React'i tum alt agaci yeniden olusturmaya zorlar (reconciliation cogalir) → CPU + gereksiz DOM allocate/GC  [Oncelik: Major] Yasak: /key=\{\s*(index|idx|i|Math\.random\(\)|Date\.now\(\))\s*\}/
  <details><summary>↳ örnek</summary>

  ```tsx
  // ❌ kararsiz key (her render yeni → tum satirlar yeniden olusur)
  {liste.map((e, i) => <Row key={Math.random()} entity={e} />)}
  // ✅ kararli kimlik key'i
  {liste.map((e) => <Row key={e.id} entity={e} />)}
  ```
  </details>
- [ ] CPU-yogun islemi (buyuk parse/sort/hesaplama, kripto, dosya isleme) ana thread'i kilitlemeden Web Worker'a veya parcalanmis/async isleme **tasi**; binlerce ogeyi senkron map/sort ile tek karede islemekten kacin  — uzun senkron is ana thread'i bloklar → CPU/jank (UI donar)  [Oncelik: Minor]
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ on binlerce kaydi render thread'inde senkron isle (UI donar)
  const sonuc = devasaListe.map(agirDonusum).sort(karsilastir);
  // ✅ agir isi worker'a tasi (ana thread serbest)
  const worker = new Worker(new URL('./entity-isle.worker.ts', import.meta.url), { type: 'module' });
  worker.postMessage(devasaListe);
  ```
  </details>
- [ ] Gorsel/asset boyutunu **optimize et**: buyuk PNG/JPG yerine optimize/WebP, gerektiginde loading="lazy", ikon icin SVG; ham yuksek-cozunurluklu gorseli src/'e gomup bundle'a katmaktan kacin  — buyuk asset hem indirme hem decode bellegi tuketir → RAM + ag/CPU (decode)  [Oncelik: Minor] Yasak: /from\s+["\'][^"\']*\.(png|jpe?g)["\']/
  <details><summary>↳ örnek</summary>

  ```tsx
  // ❌ devasa ham gorsel, lazy yok (decode RAM + ilk yuk yavas)
  <img src={buyukJpg} />
  // ✅ optimize asset + lazy yukleme
  <img src={optimizeWebp} loading="lazy" width={320} height={200} />
  ```
  </details>
- [ ] Bundle boyutu icin gozlem/butce **kur**: build'de rollup-plugin-visualizer/vite build --report ile chunk analizi yap, beklenmedik buyuk bagimliligi (moment, tum lodash, agir grafik kutuphanesi) tespit et ve gerektiginde lazy-load veya hafif alternatife gec  — kontrolsuz bundle ilk yuk parse/derleme suresi → CPU + RAM (mevcut React.lazy ile uyumlu)  [Oncelik: Minor] Yasak: /from\s+["\']moment["\']/
  <details><summary>↳ örnek</summary>

  ```ts
  // ❌ bundle boyutu izlenmiyor (regresyon fark edilmez)
  // (analiz adimi yok)
  // ✅ build'de gorsel chunk analizi
  import { visualizer } from 'rollup-plugin-visualizer';
  export default defineConfig({ plugins: [visualizer({ gzipSize: true })] });
  ```
  </details>

---

## Hizli ozet

| Kategori | En kritik kontrol | Oncelik |
|---|---|---|
| Component & yapi | <300 satir, container/presentational ayrik | Major |
| State yonetimi | Cift state-kaynagi (Context+Redux/state+modul-global) yok | Blocker |
| Hook kullanimi | Hook'lar kosulsuz; rules-of-hooks disable yok | Blocker |
| Performans | Provider value/memo'lu cocuga inline obj/fn yok; buyuk liste sanallastirilmis | Major |
| Okunabilirlik | Sabit kodlu URL yok; console yerine logger | Major |
| Tekrar kullanilabilirlik | golge-ui karsiligi varken elle yazma yok | Major |
| TypeScript | `any`/`as any` yok; DTO backend kontratiyla uyumlu | Major |
| golge-ui & MF | shared singleton tam + surum (golge-ui 1.16.x, major fark yok) | Blocker |
| Form & dogrulama | Backend tek gercek kaynak; form lokal state | Major |
| i18n | tr+en anahtar tam; sabit string yok | Major |
| Erisilebilirlik | Etkilesimli div yerine MUI; klavye/aria | Major |
| Guvenlik (XSS/token) | Token `useGolgeSecurity`/`golgeRtkApiHeaders`; korumali rota `hasAuthority`; dangerouslySetInnerHTML sanitize | Blocker |
| Veri katmani | Her createApi reducer **ve** middleware kayitli | Blocker |
| MUI 6 | Tema degeri; `sx as any` yok | Minor |
| Test & lint | `lint --max-warnings 0` temiz | Blocker |
| Guvenlik — genel (global) | `eval`/ham `innerHTML` yok; client'a sirr yok (yalniz public `VITE_`); `npm audit` gate; `target=_blank`→`rel=noopener`; open redirect dogrulama; CSP header | Blocker |
| Performans & kaynak (global) | Unmount'ta timer/abone/object URL temizligi (→RAM); RTK Query `keepUnusedDataFor` (→RAM); barrel yerine alt-yol import (→bundle/CPU); memoize selector (→CPU); buyuk veri/blob store'da degil (→RAM) | Major |
