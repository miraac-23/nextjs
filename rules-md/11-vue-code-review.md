# Vue.js Code Review Standartları

> Frontend · **Vue 3** (Composition API / `<script setup>`). Dosya deseni: `*.vue`.
> `- [ ]` maddeleri kural olarak okunur. ⚙️ = otomatik denetlenir.

## 1. Genel Kod Kalitesi
- [ ] console.log ile çıktı alınmamalı ⚙️
- [ ] Kodda TODO/FIXME bırakılmamalı ⚙️
- [ ] Gereksiz yorum satırı bulunmamalı ⚙️
- [ ] TypeScript `any` tipi kullanılmamalı ⚙️
- [ ] `var` yerine const/let kullanılmalı ⚙️
- [ ] debugger ve alert( bırakılmamalı ⚙️
- [ ] Sihirli sabitler yerine adlandırılmış sabit/enum kullanılmalı — Yasak: /(?:===|!==|>=|<=)\s*-?\d{2,}\b/

## 2. Vue Bileşen Standartları
- [ ] <script setup> ve Composition API tercih edilmeli — Yasak: /^\s*(?:methods|computed|watch)\s*:\s*\{|^\s*(?:data|created|mounted|beforeDestroy)\s*\(\s*\)\s*\{/
- [ ] Prop'lar tip ve gereklilikleriyle tanımlanmalı; prop doğrudan mutasyona uğratılmamalı — Yasak: /defineProps\s*\(\s*\[|\bprops\.[A-Za-z0-9_]+\s*=[^=>]/
- [ ] v-for ile birlikte benzersiz ve stabil :key kullanılmalı (index key değil) — Yasak: /:key="(?:index|idx|i|[A-Za-z0-9_]*Index)"/
- [ ] v-if ve v-for aynı elemanda birlikte kullanılmamalı — Yasak: /v-for=[^>]*\sv-if=|v-if=[^>]*\sv-for=/
- [ ] Ağır hesaplamalar için computed kullanılmalı; template içinde metot çağrısıyla tekrarlanmamalı — Yasak: /\{\{[^}]*\.(?:filter|map|sort|reduce)\s*\(/
- [ ] Yan etkiler watch/onMounted içinde; render sırasında yapılmamalı — Yasak: /computed\s*\(\s*(?:async\s*)?\(\s*\)\s*=>\s*\{[^}]*(?:await\s|axios\.|fetch\s*\(|\.value\s*=[^=])/
- [ ] Bileşen tek sorumluluğa sahip olmalı; çok büyük bileşenler bölünmeli
- [ ] Emit edilen event'ler defineEmits ile tiplenmeli — Yasak: /defineEmits\s*\(\s*\[/
- [ ] ref/reactive doğru seçilmeli; reactive nesne destructuring ile reaktifliğini kaybetmemeli — Yasak: /(?:const|let)\s*\{[^}]*\}\s*=\s*(?:reactive\s*\(|props\b)/

## 3. Durum Yönetimi & Veri Akışı
- [ ] Global durum için Pinia kullanılmalı; prop drilling'ten kaçınılmalı — Yasak: /export\s+const\s+[A-Za-z0-9_]*[Ss]tore\s*=\s*reactive\s*\(/
- [ ] Store mutasyonları action'lar üzerinden yapılmalı — Yasak: /\b[A-Za-z0-9_]*[Ss]tore\.[A-Za-z0-9_$]+(?:\.[A-Za-z0-9_$]+)*\s*=[^=>]/
- [ ] API çağrıları bileşen içinde dağıtılmak yerine composable/servis katmanında toplanmalı — Yasak: /\baxios\s*\.\s*(?:get|post|put|patch|delete)\s*\(|\bfetch\s*\(\s*["']/
- [ ] Async veri yüklemede loading/error durumları ele alınmalı

## 4. Güvenlik & Performans
- [ ] v-html ile doğrulanmamış/kaçışlanmamış içerik basılmamalı (XSS) — Yasak: /v-html\s*=/
- [ ] Parola/secret/token/api key bileşene gömülmemeli ⚙️
- [ ] Büyük listelerde sanallaştırma/sayfalama kullanılmalı
- [ ] Ağır bileşenler defineAsyncComponent ile lazy yüklenmeli — Yasak: /import\s+[^;]*from\s*["']{1}(?:echarts|chart\.js|monaco-editor|pdfjs-dist|three|@fullcalendar)/
- [ ] watch içinde gereksiz derin (deep) izleme yapılmamalı — Yasak: /deep\s*:\s*true/
- [ ] Bellek sızıntısına karşı event listener/timer onUnmounted'da temizlenmeli
