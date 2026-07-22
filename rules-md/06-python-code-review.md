# Python Code Review Standartları

> Backend · **Python** (Django / Flask / FastAPI). Dosya deseni: `*.py`.
> `- [ ]` maddeleri Portal Code Review tarafından kural olarak okunur.
> ⚙️ = tarayıcıda otomatik (deterministik) denetlenir; diğerleri incelemede referans standardıdır.

## 1. Genel Kod Kalitesi
- [ ] print( ile çıktı alınmamalı — üretim kodunda logging modülü kullanılmalı ⚙️
- [ ] Kodda TODO/FIXME bırakılmamalı; iş bitirilmeli veya issue açılmalı ⚙️
- [ ] Açıklayıcı olmayan gereksiz yorum satırı bulunmamalı ⚙️
- [ ] Fonksiyonlar tek bir işi yapmalı; 50 satırı aşan fonksiyonlar bölünmeli
- [ ] Değişken/fonksiyon adları snake_case, sınıflar PascalCase, sabitler UPPER_CASE olmalı (PEP 8) — Yasak: /def\s+[a-z_]+[A-Z]\w*\s*\(/
- [ ] Sihirli sabitler yerine adlandırılmış sabitler/Enum kullanılmalı — Yasak: /(if|elif|while)\s[^:\n]*[<>=!]=\s*\d{3,}/
- [ ] Satır uzunluğu 88/100 karakteri aşmamalı; black/ruff ile biçimlendirilmeli
- [ ] Kullanılmayan import ve değişkenler kaldırılmalı — Yasak: /^\s*from\s+[\w.]+\s+import\s+\*/

## 2. Tip Güvenliği & Modern Python
- [ ] Public fonksiyon/method imzalarında tip ipuçları (type hints) bulunmalı — Yasak: /def\s+[a-zA-Z_]\w*\((?!\s*(self|cls)\s*[,)])\s*\*{0,2}[a-z_]\w*\s*[,)]/
- [ ] Mutable default argüman (def f(x=[])) kullanılmamalı; None + içeride atama yapılmalı — Yasak: /def\s+\w+\([^)\n]*=\s*(\[\]|\{\}|set\(\)|dict\(\)|list\(\))/
- [ ] == None yerine is None kullanılmalı — Yasak: /[!=]=\s*None\b/
- [ ] String biçimlendirmede % veya .format yerine f-string tercih edilmeli — Yasak: /(\.format\(|["']\s*%\s*[\(\w])/
- [ ] Sözlük erişiminde KeyError riski için .get() veya in kontrolü yapılmalı — Yasak: /(request\.(POST|GET|data|json)|payload|params|body)\s*\[\s*["']/
- [ ] Bağlam yöneticisi (with) ile dosya/bağlantı/lock kaynakları yönetilmeli — Yasak: /^\s*\w+\s*=\s*open\s*\(/

## 3. Güvenlik
- [ ] Parola, secret, token veya api key kaynak koda gömülmemeli; ortam değişkeni kullanılmalı ⚙️
- [ ] eval( ve exec( kullanılmamalı — kod enjeksiyonu riski — Yasak: /(^|[^\w.])(eval|exec)\s*\(/
- [ ] SQL sorguları f-string/format ile değil parametreli (ORM/placeholder) yazılmalı — Yasak: /(execute|executemany|raw)\s*\(\s*(f["']|["'][^"'\n]*["']\s*[%+]|["'][^"'\n]*["']\s*\.format)/
- [ ] subprocess çağrılarında shell=True ve doğrulanmamış girdi kullanılmamalı — Yasak: /shell\s*=\s*True/
- [ ] pickle ile güvenilmeyen veri deserialize edilmemeli — Yasak: /(pickle|cPickle)\.(load|loads)\s*\(/
- [ ] Rastgelelik için `random` değil güvenlik gerektiren yerde `secrets` kullanılmalı
- [ ] assert ile üretimde güvenlik/doğrulama kontrolü yapılmamalı (optimize modda atlanır) — Yasak: /^\s*assert\s[^\n]*(user|token|auth|perm|role|admin|valid|secret|password)/

## 4. Hata Yönetimi
- [ ] Boş except bloğu ile istisna yutulmamalı; loglanmalı veya ele alınmalı ⚙️
- [ ] Çıplak except: yerine belirli istisna tipleri yakalanmalı — Yasak: /except\s*:/
- [ ] die(/exit(/panic( gibi ani sonlandırma yapılmamalı ⚙️
- [ ] İstisna yeniden fırlatılırken raise ... from err ile zincir korunmalı — Yasak: /\braise\s+\w[^\n]*\bfrom\s+None\b/
- [ ] except içinde pass yerine anlamlı işlem veya loglama yapılmalı — Yasak: /except[^\n]*:\s*pass\b/

## 5. Django
- [ ] View içinde iş mantığı değil servis/manager katmanı çağrılmalı (fat model / thin view) — Yasak: /\.objects\.\w+\([^)\n]*request\./
- [ ] DEBUG=True üretimde kapalı olmalı; ayarlar ortama göre gelmeli — Yasak: /DEBUG\s*=\s*True/
- [ ] N+1 sorgu için select_related/prefetch_related kullanılmalı — Yasak: /for\s+\w+\s+in\s+[\w.]*\.objects\.(all|filter)\(/
- [ ] QuerySet üzerinde döngüde tekrar sorgu (loop içinde .get) yapılmamalı — Yasak: /(for\s[^\n]*\.objects\.get\(|\.objects\.get\([^\n]*\bfor\s)/
- [ ] Ham SQL yerine ORM; gerekiyorsa params ile raw()/extra() kullanılmalı — Yasak: /(connection\.cursor\s*\(\s*\)|\.extra\s*\()/
- [ ] CSRF/güvenlik ara katmanları devre dışı bırakılmamalı — Yasak: /(csrf_exempt|WTF_CSRF_ENABLED\s*=\s*False|CSRF_COOKIE_SECURE\s*=\s*False|SECURE_SSL_REDIRECT\s*=\s*False)/
- [ ] Migration'lar el ile düzenlenip kod ile tutarsız bırakılmamalı — Yasak: /migrations\.RunSQL\s*\(/

## 6. Flask / FastAPI
- [ ] Kullanıcı girdisi Pydantic/marshmallow şeması ile doğrulanmalı — Yasak: /(request\.get_json\s*\(|await\s+request\.json\s*\(|request\.form\s*\[)/
- [ ] Bloklayan I/O async def endpoint içinde await edilmeden çağrılmamalı (FastAPI) — Yasak: /(time\.sleep\s*\(|requests\.(get|post|put|delete|patch)\s*\()/
- [ ] Global mutable state yerine dependency injection (Depends) kullanılmalı — Yasak: /^[A-Za-z_]\w*\s*(:\s*[^=\n]+)?=\s*(\[\]|\{\}|dict\(\)|list\(\)|set\(\))\s*$/
- [ ] Hatalar uygun HTTP status ve tutarlı hata gövdesiyle dönmeli — Yasak: /return\s*\{\s*["']\s*(error|hata|message)["']?\s*:/
- [ ] Uzun süren işler arka plan görevine (Celery/BackgroundTasks) taşınmalı

## 7. Test & Bakım
- [ ] Yeni davranış için birim testi eklenmeli; kritik yollar kapsanmalı
- [ ] Testlerde gerçek ağ/DB yerine mock/fixture kullanılmalı — Yasak: /(requests\.\w+\(\s*["']https?:|socket\.socket\s*\(|psycopg2\.connect\s*\()/
- [ ] Ölü kod (kullanılmayan fonksiyon/branch) bırakılmamalı — Yasak: /^\s*(if|while)\s+(False|0)\s*:/
