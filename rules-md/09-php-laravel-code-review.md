# PHP / Laravel Code Review Standartları

> Backend · **PHP** (Laravel / Symfony). Dosya deseni: `*.php`.
> `- [ ]` maddeleri kural olarak okunur. ⚙️ = otomatik denetlenir.

## 1. Genel Kod Kalitesi
- [ ] var_dump / print_r / dd( gibi hata ayıklama çağrıları bırakılmamalı ⚙️
- [ ] Kodda TODO/FIXME bırakılmamalı ⚙️
- [ ] Gereksiz yorum satırı bulunmamalı ⚙️
- [ ] Sınıf PascalCase, method camelCase, sabit UPPER_CASE olmalı (PSR-12) — Yasak: /(?:function\s+[a-z0-9]+_[a-z0-9_]*\s*\(|\bclass\s+[a-z]\w*|const\s+[a-z]\w*\s*=)/
- [ ] Sihirli sabitler yerine const/enum kullanılmalı — Yasak: /(?:===|!==|==|!=|>=|<=|>|<)\s*[0-9]{3,}/
- [ ] declare(strict_types=1) dosya başında bulunmalı — Yasak: /declare\s*\(\s*strict_types\s*=\s*0\s*\)/
- [ ] Fonksiyon parametreleri ve dönüş değerleri tiplenmeli (type hints) — Yasak: /function\s+(?!__)\w+\s*\([^)]*\)\s*\{/

## 2. Güvenlik
- [ ] Parola/secret/token/api key koda gömülmemeli; .env/config kullanılmalı ⚙️
- [ ] eval( kullanılmamalı; die(/exit( ile ani sonlandırma yapılmamalı ⚙️
- [ ] SQL için Eloquent/Query Builder veya PDO parametreleri kullanılmalı; ham birleştirme yasak — Yasak: /(?:DB::(?:select|statement|unprepared|raw)|whereRaw|selectRaw|havingRaw|orderByRaw|mysqli_query|->query)\s*\(\s*["'][^"']*(?:\$|["']\s*\.)/
- [ ] Çıktı htmlspecialchars veya Blade süslü parantezi ile kaçışlanmalı (XSS); ham çıktı dikkatli kullanılmalı — Yasak: /\{!!|echo\s+\$_(?:GET|POST|REQUEST)|print\s+\$_(?:GET|POST|REQUEST)/
- [ ] Kullanıcı girdisiyle dosya yolu oluşturulmamalı (path traversal) — Yasak: /(?:file_get_contents|file_put_contents|fopen|readfile|unlink|include|include_once|require|require_once)\s*\(\s*[^;)]{0,60}(?:\$_(?:GET|POST|REQUEST)|\$request->|request\(\)->)/
- [ ] unserialize ile güvenilmeyen veri işlenmemeli — Yasak: /\bunserialize\s*\(/
- [ ] CSRF koruması form/istek katmanında etkin olmalı — Yasak: /(?:withoutMiddleware\s*\(|VerifyCsrfToken|withoutToken\s*\(|csrf_exempt)/

## 3. Hata Yönetimi
- [ ] Boş catch bloğu ile istisna yutulmamalı ⚙️
- [ ] Hata bastırma operatörü (at işareti) kullanılmamalı — Yasak: /(?:=|\(|,|;|\s)@[a-z_]\w*\s*\(/
- [ ] Genel Exception yerine anlamlı özel istisna tipleri fırlatılmalı — Yasak: /throw\s+new\s+\\?Exception\s*\(/
- [ ] Hatalar merkezi handler'da loglanmalı; kullanıcıya iç detay sızdırılmamalı — Yasak: /(?:echo|print|return|response\s*\(|json\s*\()[^;]{0,80}->getMessage\s*\(\s*\)/

## 4. Laravel
- [ ] Controller'da iş mantığı değil Service/Action katmanı çağrılmalı (thin controller)
- [ ] Toplu atama (mass assignment) için fillable veya guarded tanımlanmalı — Yasak: /(?:create|update|fill|forceFill|forceCreate)\s*\(\s*(?:\$request->all\s*\(|request\s*\(\s*\)->all\s*\(|\$_POST)/
- [ ] N+1 sorgu için with() (eager loading) kullanılmalı — Yasak: /(?:foreach|for|while)\s*\([^)]*\)[^;]{0,80}(?:::(?:where|find|first|all|get)\s*\(|->(?:where|find|first|get|count)\s*\()/
- [ ] İstek doğrulaması Form Request veya validate() ile yapılmalı — Yasak: /\$_(?:POST|GET|REQUEST|FILES)\s*\[/
- [ ] env() yalnız config dosyalarında; kod içinde config() kullanılmalı — Yasak: /\benv\s*\(\s*["']/
- [ ] Controller içinde ham DB::select yerine Eloquent tercih edilmeli — Yasak: /DB::(?:select|statement|unprepared|raw|insert|delete)\s*\(/
- [ ] Uzun işlemler Queue/Job'a taşınmalı; senkron çalıştırılmamalı — Yasak: /(?:set_time_limit\s*\(|\bsleep\s*\(|ini_set\s*\(\s*["']max_execution_time|Mail::(?:send|raw)\s*\()/
- [ ] Route kapanışları yerine controller method'ları kullanılmalı (route cache) — Yasak: /Route::\w+\s*\([^)]*,\s*(?:function\s*\(|fn\s*\()/
- [ ] Yetkilendirme Policy/Gate ile yapılmalı — Yasak: /->(?:role|is_admin|isAdmin|user_type|isSuperAdmin)\s*(?:===|==|!=|!==)\s*["'0-9]/

## 5. Test & Bakım
- [ ] Yeni davranış için Pest/PHPUnit testi eklenmeli — Yasak: /(?:markTestSkipped|markTestIncomplete)\s*\(|->skip\s*\(/
- [ ] Testlerde gerçek servis yerine mock/fake kullanılmalı — Yasak: /=\s*new\s+\w*(?:Service|Repository|Client|Gateway|Api|Manager)\s*\(/
- [ ] Ölü kod ve yorum satırına alınmış blok bırakılmamalı
