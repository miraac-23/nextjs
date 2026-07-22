# Node.js Backend Code Review Standartları

> Backend · **Node.js** (Express / NestJS / TypeScript). Dosya deseni: `*.ts`.
> `- [ ]` maddeleri kural olarak okunur. ⚙️ = otomatik denetlenir.

## 1. Genel Kod Kalitesi
- [ ] console.log/console.debug ile çıktı alınmamalı — pino/winston logger kullanılmalı ⚙️
- [ ] Kodda TODO/FIXME bırakılmamalı ⚙️
- [ ] Gereksiz yorum satırı bulunmamalı ⚙️
- [ ] TypeScript `any` tipi kullanılmamalı; somut tip/unknown tercih edilmeli ⚙️
- [ ] `var` yerine const/let kullanılmalı ⚙️
- [ ] debugger ifadesi bırakılmamalı ⚙️
- [ ] Gevşek eşitlik (==) yerine katı eşitlik (===) kullanılmalı ⚙️
- [ ] Modül üstünde tsconfig strict açık olmalı; ts-ignore gelişigüzel kullanılmamalı — Yasak: /@ts-(ignore|nocheck|expect-error)\b/

## 2. Async & Hata Yönetimi
- [ ] async fonksiyonlarda hatalar try/catch veya merkezi error middleware ile ele alınmalı — Yasak: /\.(get|post|put|patch|delete)\s*\(\s*["'][^"']*["']\s*,\s*async\s*\(/
- [ ] Boş catch bloğu ile hata yutulmamalı ⚙️
- [ ] Promise'ler await edilmeli; floating promise bırakılmamalı — Yasak: /^\s*(?!(await|return|const|let|var|export|import|yield)\b)[A-Za-z_$][^;=\n]*\.then\s*\(/
- [ ] Promise.all ile paralelleştirilebilir işler sırayla await edilmemeli — Yasak: /await\s[^;\n]{1,80};\s*(const|let|var)[^;\n]{0,60}=\s*await\s/
- [ ] process.exit( ile ani sonlandırma yapılmamalı ⚙️
- [ ] unhandledRejection/uncaughtException global olarak ele alınmalı — Yasak: /process\.on\s*\(\s*["']\s*(uncaughtException|unhandledRejection)\s*["']\s*,\s*(async\s*)?\(\s*\)\s*=>/
- [ ] Callback yerine async/await tercih edilmeli; callback hell olmamalı — Yasak: /,\s*(async\s*)?function\s*\(\s*(err|error)\b|,\s*\(\s*(err|error)\s*,\s*[\w$]+\s*\)\s*=>/

## 3. Güvenlik (Express/Nest)
- [ ] Parola/secret/token/api key koda gömülmemeli; process.env kullanılmalı ⚙️
- [ ] SQL/NoSQL sorguları parametreli olmalı; string birleştirme ile yazılmamalı — Yasak: /\.(query|execute|raw|createQueryBuilder)\s*\([^)]*(\$\{|["']\s*\+\s*[A-Za-z_$])/
- [ ] Kullanıcı girdisi (DTO/zod/class-validator) ile doğrulanmalı — Yasak: /\.(create|update|save|insert|findOne|delete)\s*\(\s*req\.(body|query|params)\b/
- [ ] eval( ve child_process ile doğrulanmamış komut çalıştırılmamalı — Yasak: /(^|[^.\w])eval\s*\(|new\s+Function\s*\(|require\s*\(\s*["']child_process["']\s*\)|\bexec\s*\(\s*[^)]*\$\{/
- [ ] helmet, rate-limit ve CORS politikaları yapılandırılmalı — Yasak: /origin\s*:\s*["']\*["']|\bcors\s*\(\s*\)|enableCors\s*\(\s*\)/
- [ ] Hata yanıtlarında stack trace / iç detay dışarı sızdırılmamalı
- [ ] JWT/secret doğrulaması sunucu tarafında yapılmalı; süre (exp) kontrol edilmeli

## 4. Mimari & API Tasarımı
- [ ] Controller ince olmalı; iş mantığı service katmanında yer almalı
- [ ] HTTP durum kodları anlamlı kullanılmalı (200/201/400/401/404/409/500) — Yasak: /\.status\s*\(\s*(200|201)\s*\)\s*\.\s*(json|send)\s*\(\s*\{\s*(error|errors|errorCode|errorMessage)\b/
- [ ] Senkron ağır işlemler event loop'u bloklamamalı; worker/queue kullanılmalı — Yasak: /\b(readFileSync|writeFileSync|appendFileSync|readdirSync|statSync|execSync|spawnSync|deflateSync|gzipSync|randomBytesSync|hashSync)\s*\(/
- [ ] Bağımlılıklar DI ile enjekte edilmeli (Nest module/provider) — Yasak: /=\s*new\s+[A-Z][\w$]*(Service|Repository|Client|Gateway|Handler|Manager)\s*\(/
- [ ] Konfigürasyon merkezi config servisiyle yönetilmeli, dağınık process.env değil — Yasak: /process\.env\s*(\.[A-Z_]{2,}|\[\s*["'][A-Z_]{2,})/
- [ ] Girdi/çıktı sözleşmeleri (DTO) tanımlı ve tiplenmiş olmalı — Yasak: /@(Body|Query|Param)\s*\([^)]*\)\s*[\w$]+\s*:\s*(any|object|Record\s*<)|\breq\s*:\s*any\b/

## 5. Performans & Bakım
- [ ] DB bağlantısı havuzlanmalı (pool); her istekte yeni bağlantı açılmamalı — Yasak: /new\s+(PrismaClient|MongoClient|Sequelize|Connection|DataSource)\s*\(|\.(createConnection|connect)\s*\(\s*\)\s*;?\s*$/
- [ ] Döngü içinde await ile seri DB çağrısı yerine toplu sorgu kullanılmalı — Yasak: /(for\s*\([^)]*\)|while\s*\([^)]*\))\s*\{?[^\n]*\bawait\b|\.forEach\s*\(\s*async\b/
- [ ] Yeni davranış için birim/entegrasyon testi (jest) eklenmeli — Yasak: /\b(describe|it|test)\s*\.\s*(skip|only|todo)\s*\(|\bx(it|describe)\s*\(|\bfdescribe\s*\(/
- [ ] Ölü kod ve kullanılmayan bağımlılıklar kaldırılmalı — Yasak: /^\s*\/\/\s*(const|let|var|function|class|import|export|return|await|if\s*\(|for\s*\()/
