# C# / .NET Code Review Standartları

> Backend · **C# / .NET** (ASP.NET Core / EF Core). Dosya deseni: `*.cs`.
> `- [ ]` maddeleri kural olarak okunur. ⚙️ = otomatik denetlenir.

## 1. Genel Kod Kalitesi
- [ ] Console.WriteLine ile çıktı alınmamalı — ILogger kullanılmalı ⚙️
- [ ] Kodda TODO/FIXME bırakılmamalı ⚙️
- [ ] Gereksiz yorum satırı bulunmamalı ⚙️
- [ ] Sınıf/method/property PascalCase, private alanlar _camelCase, parametreler camelCase olmalı — Yasak: /(?:private\s+(?:readonly\s+|static\s+)*[A-Za-z_][\w<>,\?]*\s+[a-z]\w*\s*[;=]|(?:public|protected|internal)\s+(?:static\s+)?(?:async\s+)?[A-Za-z_][\w<>,\?]*\s+[a-z]\w*\s*\()/
- [ ] Sihirli sabitler yerine const/enum kullanılmalı — Yasak: /(?:==|!=|>=|<=|>|<)\s*[0-9]{3,}/
- [ ] var yalnız tip sağdan açıkça belliyken kullanılmalı; belirsizse açık tip yazılmalı — Yasak: /\bvar\s+\w+\s*=\s*(?!new\b)[A-Za-z_][\w.]*\s*\(/
- [ ] Kullanılmayan using/alan/parametre kaldırılmalı

## 2. Null Güvenliği & Modern C#
- [ ] Nullable reference types (#nullable enable) etkin olmalı — Yasak: /#nullable\s+disable/
- [ ] Null kontrolünde ?. , ?? , is null kullanılmalı; gereksiz null-forgiving (!) yasak — Yasak: /[\w\]\)]!\s*[.;,)]/
- [ ] String karşılaştırmasında kültür/duyarlılık (StringComparison) belirtilmeli — Yasak: /(?:ToLower|ToUpper|ToLowerInvariant|ToUpperInvariant)\s*\(\s*\)\s*(?:==|!=|\.(?:Equals|Contains|StartsWith|EndsWith))/
- [ ] Değişmez veriler için record/readonly yapılar tercih edilmeli — Yasak: /public\s+(?:string|int|long|decimal|double|bool|DateTime|Guid)\??\s+\w+\s*\{\s*get;\s*set;\s*\}/
- [ ] Pattern matching (switch expression) uygun yerde kullanılmalı — Yasak: /\bis\s+[A-Z]\w*\s*\)|\.GetType\s*\(\s*\)\s*==\s*typeof/

## 3. Hata Yönetimi
- [ ] Boş catch bloğu ile istisna yutulmamalı ⚙️
- [ ] catch(Exception) ile genel yakalama yerine belirli tipler yakalanmalı — Yasak: /catch\s*\(\s*(?:System\.)?Exception\b/
- [ ] İstisna yeniden fırlatılırken throw; kullanılmalı, throw ex; değil (stack kaybolur) — Yasak: /throw\s+\w+\s*;/
- [ ] using / await using ile IDisposable kaynaklar serbest bırakılmalı — Yasak: /^\s*(?:var|[A-Z]\w*)\s+\w+\s*=\s*new\s+(?:SqlConnection|SqlCommand|StreamReader|StreamWriter|FileStream|MemoryStream|HttpClient|HttpRequestMessage|HttpResponseMessage)\s*\(/
- [ ] Akış kontrolü için istisna kullanılmamalı — Yasak: /catch\s*(?:\([^)]*\))?\s*\{\s*(?:return|break|continue)\b/

## 4. Async & Performans
- [ ] async metotlarda .Result veya .Wait() ile bloklama yapılmamalı (deadlock) — Yasak: /\.(?:Result\b|Wait\s*\(\s*\)|GetAwaiter\s*\(\s*\)\s*\.\s*GetResult)/
- [ ] async metotlar Task döndürmeli; async void yalnız event handler'da — Yasak: /\basync\s+void\s+\w/
- [ ] Kütüphane kodunda ConfigureAwait(false) kullanılmalı — Yasak: /ConfigureAwait\s*\(\s*true\s*\)/
- [ ] CancellationToken uygun şekilde alınıp iletilmeli — Yasak: /CancellationToken\.None/
- [ ] EF Core sorgularında N+1 için Include/projeksiyon kullanılmalı — Yasak: /(?:for|foreach|while)\s*\([^)]*\)[^;]{0,80}\.(?:First|Single|Where|Find|Any|Count|ToList)(?:OrDefault)?(?:Async)?\s*\(/
- [ ] IQueryable üzerinde erken ToList() ile gereksiz materyalizasyon yapılmamalı — Yasak: /\.To(?:List|Array)\s*\(\s*\)\s*\.\s*(?:Where|Select|OrderBy|First|Single|Any|Count|Skip|Take)/
- [ ] Döngü içinde string birleştirme yerine StringBuilder kullanılmalı — Yasak: /(?:for|foreach|while)\s*\([^)]*\)[^;]{0,60}\w+\s*\+=\s*[^;]*"/

## 5. Güvenlik (ASP.NET Core)
- [ ] Parola/secret/token/api key koda gömülmemeli; Configuration/User Secrets/Key Vault kullanılmalı ⚙️
- [ ] SQL için parametreli sorgu/ORM kullanılmalı; string birleştirme yasak — Yasak: /\$?@?"\s*(?:SELECT|INSERT|UPDATE|DELETE|select|insert|update|delete)\b[^"]*(?:\{|"\s*\+)/
- [ ] Girdi model validation (DataAnnotations/FluentValidation) ile doğrulanmalı — Yasak: /Request\.(?:Form|Query|Headers)\s*\[/
- [ ] Controller'lar ince olmalı; iş mantığı service katmanında yer almalı
- [ ] Yetkilendirme Authorize attribute ile yapılmalı; endpoint'ler açıkta bırakılmamalı — Yasak: /\[AllowAnonymous\]/
- [ ] DI ile servisler doğru yaşam süresiyle (Scoped/Transient/Singleton) kaydedilmeli — Yasak: /AddSingleton\s*<[^>]*(?:DbContext|Repository|UnitOfWork|HttpContext)[^>]*>/

## 6. Test & Bakım
- [ ] Yeni davranış için birim testi (xUnit/NUnit) eklenmeli — Yasak: /\[Ignore[\s(\]]|Skip\s*=\s*"/
- [ ] Bağımlılıklar interface üzerinden mock'lanabilir olmalı — Yasak: /=\s*new\s+\w*(?:Service|Repository|Client|Manager|Provider)\s*\(/
- [ ] Ölü kod ve yorum satırına alınmış kod bloğu bırakılmamalı
