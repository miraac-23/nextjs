// Code Review aracının dil katmanı.
//
// Motor modülleri (review.ts, git.ts) saf fonksiyonlardır ve React context'ine erişemez;
// bu yüzden aktif dil modül düzeyinde tutulur. CodeReviewApp render sırasında setCrLang()
// çağırarak dili günceller (React ebeveyni çocuklardan önce render ettiği için güvenlidir).

import type { Lang } from '@/lib/i18n/config'

let current: Lang = 'tr'

export function setCrLang(lang: Lang) {
  current = lang
}

export function crLang(): Lang {
  return current
}

/* ============================ Motor metinleri ============================ */

const ENGINE = {
  tr: {
    exFires: 'Bulguya girer',
    exClean: 'Bulguya girmez',
    exNotEnough: 'Tek başına yeterli değil',
    exNoMatch: 'Desene uymuyor; bu satır için bulgu üretilmez.',
    exRegexHit: 'Satır kuralın desenine uyuyor → bu satır için bulgu açılır.',
    exForbiddenHit: 'Yasak desene uyuyor → bu satır için bulgu açılır.',
    exRequiredOk: 'Zorunlu desen bu satırda görüldü → dosya kuraldan geçer.',
    exRequiredMissing:
      'Zorunlu desen bu satırda yok. Dosyanın HİÇBİR eklenen satırında yoksa dosya için bulgu açılır.',
    exDetectorClean: 'Dedektör tetiklenmez; bu satır için bulgu üretilmez.',
    exDetectorHit: (label: string, message: string) => `“${label}” dedektörü tetiklenir → ${message}`,
    exLimitOverCode: (n: number) => `// ${n}. satırı olan bir dosya`,
    exLimitOverNote: (limit: number) =>
      `Dosyanın ${limit} satırı aştığı diff’ten kanıtlanırsa dosya için tek bir bulgu açılır (satır numarası verilmez).`,
    exLimitUnderCode: (n: number) => `// ${n} satırlık bir dosya`,
    exLimitUnderNote: 'Sınır aşılmadığı sürece bulgu üretilmez.',

    probeEmpty: 'Denemek için bir kod satırı yazın.',
    probeInvalidRegex: 'Kuralın deseni geçersiz.',
    probeRegexHit: (src: string) => `Satır /${src}/ desenine uyuyor → bulgu üretilir.`,
    probeRegexMiss: 'Satır desene uymuyor → bulgu üretilmez.',
    probeForbiddenHit: (src: string) => `Yasak desene uyuyor (/${src}/) → bulgu üretilir.`,
    probeRequiredHit: (src: string) => `Zorunlu desen (/${src}/) bu satırda görüldü → dosya bu kuraldan geçer.`,
    probeRequiredMiss:
      'Zorunlu desen bu satırda yok. Dosyanın HİÇBİR eklenen satırında yoksa bulgu üretilir — tek satırdan kesin sonuç çıkmaz.',
    probeNoForbidden: 'Hiçbir yasak desene uymuyor → bulgu üretilmez.',
    probeDetectorHit: (label: string) => `“${label}” dedektörü tetiklendi → bulgu üretilir.`,
    probeDetectorMiss: 'Hiçbir dedektör tetiklenmedi → bulgu üretilmez.',
    probeLimit: 'Bu kural dosya uzunluğunu ölçer; tek bir satırla denenemez.',
    probeManual: 'Bu kural makine ile denetlenmiyor; denenebilir bir deseni yok.',

    exRegexHeadline: 'Kuralın kendi düzenli ifadesiyle denetleniyor',
    exRegexWhy: 'Bu bir REGEX kuralı: gövdesindeki desen doğrudan çalıştırılır.',
    exRegexCheckLabel: 'Eşleşen satır ihlaldir',
    exRegexCheckMeaning: 'Diff’te eklenen satırlardan biri bu desene uyarsa bulgu üretilir.',

    exPatternHeadline: 'Kural metnine yazılmış açık desenle denetleniyor',
    exPatternWhy:
      'Kuralın metni serbest yazılmış, ama sonuna açık bir desen eklenmiş. Tahmin yapılmaz; yalnızca yazılan desen çalışır.',
    exForbiddenLabel: 'Yasak desen',
    exForbiddenMeaning: 'Eklenen satırlardan biri bu desene uyarsa bulgu üretilir.',
    exRequiredLabel: 'Zorunlu desen',
    exRequiredMeaning: 'Dosyanın eklenen satırlarının hiçbiri bu desene uymuyorsa bulgu üretilir.',

    exDetectorHeadline: 'Yerleşik dedektörle denetleniyor',
    exDetectorWhy: (kw: string) =>
      `Kural metni yerleşik bir dedektörün anahtar kelimesini içeriyor (${kw}), bu yüzden o dedektöre bağlandı.`,
    exScopeFrontend: 'yalnız ön uç dosyaları',
    exScopeBackend: 'yalnız arka uç dosyaları',

    exLimitHeadline: 'Ölçülebilir üst sınır olarak denetleniyor',
    exLimitWhy: (limit: number | null) =>
      `Kural metninde bir üst sınır ifadesi ve sayı geçiyor; en yüksek değer (${limit}) eşik olarak alındı.`,
    exLimitCheckLabel: (limit: number | null) => `En fazla ${limit} satır`,
    exLimitCheckMeaning:
      'Dosya uzunluğu diff’teki hunk başlıklarından ölçülür. Bu bir ALT SINIR olduğu için yalnızca sınırın aşıldığı kanıtlanabildiğinde bulgu üretilir — yanlış pozitif vermez.',

    exManualHeadline: 'Makine ile denetlenemiyor — insan incelemesi gerekir',
    exManualWhy:
      'Kural soyut: doğruluğu tek bir eklenen satıra bakarak anlaşılamıyor (dosya konumu, katmanlar arası tutarlılık, kod tekrarı, çalışma anı davranışı gibi). Ne açık bir desen yazılmış, ne de yerleşik bir dedektörün anahtar kelimesi geçiyor.',
    exManualFix:
      'Denetlenebilir yapmak için kural metninin sonuna açık bir desen ekleyin: "Yasak: /desen/" (eşleşen satır ihlaldir) ya da "Zorunlu: /desen/" (dosyada hiç eşleşme yoksa ihlaldir). Kuralı somut bir kod izine indirgeyemiyorsanız elle kalması doğrudur — uydurma desen yanlış pozitif üretir.',

    progRules: (n: number) => `${n} kural uygulanıyor…`,
    progAi: (file: string) => `Yapay zeka inceliyor: ${file}`,
    progCompile: 'Bulgular derleniyor…',
    violateRegex: (name: string) => `'${name}' kuralını ihlal ediyor; düzeltin veya kaldırın.`,
    violateForbidden: (src: string) => `Bu satır kuralın yasak desenine uyuyor (/${src}/); kurala göre düzeltin.`,
    violateRequired: (src: string) =>
      `Kuralın zorunlu kıldığı desen (/${src}/) bu dosyanın eklenen satırlarında hiç görülmedi.`,
    violateLimit: (lines: number, limit: number) =>
      `Dosya en az ${lines} satır; kuraldaki ${limit} satır üst sınırı aşılmış.`,
    violateLimitFix: 'Dosyayı daha küçük parçalara/bileşenlere bölün.',
    noticeManual: (auto: number, total: number, manual: number) =>
      `${auto}/${total} kural makine ile denetlendi. Kalan ${manual} kural soyut olduğu için (dosya konumu, ` +
      `katmanlar arası tutarlılık, kod tekrarı gibi) tek satırdan denetlenemez; insan incelemesi gerekir. ` +
      `Listelerini "Kurallar" sekmesindeki "Denetim: ✋ Elle" filtresinden görebilirsiniz.`,
    noticeNoAi: 'Yapay zeka seçildi ancak AI bağlı değil. Üstteki "AI Bağlantısı"ndan bir sağlayıcı bağlayın.',
    noticeAiFail: (err: string) => 'AI çağrısı başarısız: ' + err,

    aiUserPrompt: (path: string, lines: string) =>
      `Dosya: ${path}\n\nİncelenecek EKLENEN satırlar (yalnızca bunlar; biçim <satırNo>: <kod>):\n${lines}`,
    aiSystemPrompt:
      "Sen kıdemli bir code reviewer'sın. Sana YALNIZCA bir dosyanın yeni EKLENEN satırları verilecek " +
      '(biçim: <satırNo>: <kod>). Bu satırlarda DERİNLEMESİNE code review yap. Özellikle şunlara odaklan ' +
      've her biri için somut çözüm/öneri ver:\n' +
      '- MANTIK HATALARI: yanlış koşul, off-by-one, null/undefined erişimi, yanlış operatör, kaçırılan durumlar.\n' +
      '- PERFORMANS: gereksiz döngü/kopyalama, N+1 sorgu, ağır/tekrar eden işlem, gereksiz yeniden hesaplama/render.\n' +
      '- OPTİMİZASYON: daha sade ve verimli yazım, erken dönüş, uygun veri yapısı/algoritma, tekrarların giderilmesi.\n' +
      '- GÜVENLİK: gömülü parola/anahtar/token, SQL/komut enjeksiyonu, doğrulanmamış girdi.\n' +
      '- KÖTÜ PRATİK: boş catch, yutulan istisna, ölü kod, sihirli sabit.\n' +
      "Yalnızca verilen eklenen satırları değerlendir; 'line' alanında verilen satır numarasını kullan; " +
      "her bulgu için somut bir 'suggestion' yaz; sorun yoksa boş dizi [] döndür.\n" +
      'Bulguları TÜRKÇE yaz.\n' +
      'Yanıtı SADECE şu JSON dizisi biçiminde ver (markdown ekleme):\n' +
      '[{"ruleName":"...","line":<no>,"severity":"MINOR|MAJOR|CRITICAL","message":"...","suggestion":"..."}]',
  },

  en: {
    exFires: 'Produces a finding',
    exClean: 'No finding',
    exNotEnough: 'Not sufficient on its own',
    exNoMatch: 'Does not match the pattern; no finding is produced for this line.',
    exRegexHit: "The line matches the rule's pattern → a finding is opened for this line.",
    exForbiddenHit: 'Matches the forbidden pattern → a finding is opened for this line.',
    exRequiredOk: 'The required pattern was seen on this line → the file passes the rule.',
    exRequiredMissing:
      'The required pattern is missing here. If NO added line in the file has it, a finding is opened for the file.',
    exDetectorClean: 'The detector does not fire; no finding is produced for this line.',
    exDetectorHit: (label: string, message: string) => `The “${label}” detector fires → ${message}`,
    exLimitOverCode: (n: number) => `// a file with ${n} lines`,
    exLimitOverNote: (limit: number) =>
      `If the diff proves the file exceeds ${limit} lines, a single file-level finding is opened (no line number).`,
    exLimitUnderCode: (n: number) => `// a ${n}-line file`,
    exLimitUnderNote: 'No finding is produced unless the limit is exceeded.',

    probeEmpty: 'Paste a line of code to try it out.',
    probeInvalidRegex: "The rule's pattern is invalid.",
    probeRegexHit: (src: string) => `The line matches /${src}/ → a finding is produced.`,
    probeRegexMiss: 'The line does not match the pattern → no finding.',
    probeForbiddenHit: (src: string) => `Matches the forbidden pattern (/${src}/) → a finding is produced.`,
    probeRequiredHit: (src: string) =>
      `The required pattern (/${src}/) was seen on this line → the file passes this rule.`,
    probeRequiredMiss:
      'The required pattern is missing here. A finding is produced only if NO added line in the file has it — a single line is not conclusive.',
    probeNoForbidden: 'Matches no forbidden pattern → no finding.',
    probeDetectorHit: (label: string) => `The “${label}” detector fired → a finding is produced.`,
    probeDetectorMiss: 'No detector fired → no finding.',
    probeLimit: 'This rule measures file length; it cannot be tried with a single line.',
    probeManual: 'This rule is not machine-checked; it has no pattern to try.',

    exRegexHeadline: "Checked with the rule's own regular expression",
    exRegexWhy: 'This is a REGEX rule: the pattern in its body is executed directly.',
    exRegexCheckLabel: 'A matching line is a violation',
    exRegexCheckMeaning: 'If an added line in the diff matches this pattern, a finding is produced.',

    exPatternHeadline: 'Checked with the explicit pattern written into the rule text',
    exPatternWhy:
      'The rule text is free-form but ends with an explicit pattern. Nothing is guessed; only the written pattern runs.',
    exForbiddenLabel: 'Forbidden pattern',
    exForbiddenMeaning: 'If one of the added lines matches this pattern, a finding is produced.',
    exRequiredLabel: 'Required pattern',
    exRequiredMeaning: "If none of the file's added lines match this pattern, a finding is produced.",

    exDetectorHeadline: 'Checked by a built-in detector',
    exDetectorWhy: (kw: string) =>
      `The rule text contains a built-in detector's keyword (${kw}), so it was bound to that detector.`,
    exScopeFrontend: 'frontend files only',
    exScopeBackend: 'backend files only',

    exLimitHeadline: 'Checked as a measurable upper bound',
    exLimitWhy: (limit: number | null) =>
      `The rule text contains an upper-bound phrase and a number; the highest value (${limit}) was taken as the threshold.`,
    exLimitCheckLabel: (limit: number | null) => `At most ${limit} lines`,
    exLimitCheckMeaning:
      'File length is measured from the hunk headers in the diff. Because this is a LOWER bound, a finding is produced only when the limit is provably exceeded — it never yields false positives.',

    exManualHeadline: 'Cannot be machine-checked — human review required',
    exManualWhy:
      'The rule is abstract: its correctness cannot be judged from a single added line (file placement, cross-layer consistency, code duplication, runtime behaviour and the like). It has neither an explicit pattern nor a built-in detector keyword.',
    exManualFix:
      'To make it checkable, append an explicit pattern to the rule text: "Forbidden: /pattern/" (a matching line is a violation) or "Required: /pattern/" (a violation if the file has no match). If you cannot reduce the rule to a concrete code trace, leaving it manual is the right call — an invented pattern produces false positives.',

    progRules: (n: number) => `Applying ${n} rules…`,
    progAi: (file: string) => `AI is reviewing: ${file}`,
    progCompile: 'Compiling findings…',
    violateRegex: (name: string) => `Violates the '${name}' rule; fix it or remove it.`,
    violateForbidden: (src: string) =>
      `This line matches the rule's forbidden pattern (/${src}/); fix it as the rule requires.`,
    violateRequired: (src: string) =>
      `The pattern required by the rule (/${src}/) was never seen in this file's added lines.`,
    violateLimit: (lines: number, limit: number) =>
      `The file has at least ${lines} lines; the rule's ${limit}-line upper bound is exceeded.`,
    violateLimitFix: 'Split the file into smaller pieces/components.',
    noticeManual: (auto: number, total: number, manual: number) =>
      `${auto}/${total} rules were machine-checked. The remaining ${manual} are abstract (file placement, ` +
      `cross-layer consistency, code duplication and the like) and cannot be checked from a single line; ` +
      `they need human review. You can list them with the "Checking: ✋ Manual" filter on the "Rules" tab.`,
    noticeNoAi: 'AI was selected but no AI is connected. Connect a provider from "AI Connection" above.',
    noticeAiFail: (err: string) => 'AI call failed: ' + err,

    aiUserPrompt: (path: string, lines: string) =>
      `File: ${path}\n\nADDED lines to review (only these; format <lineNo>: <code>):\n${lines}`,
    aiSystemPrompt:
      'You are a senior code reviewer. You will be given ONLY the newly ADDED lines of a file ' +
      '(format: <lineNo>: <code>). Perform a DEEP code review of those lines. Focus especially on the ' +
      'following and give a concrete fix/suggestion for each:\n' +
      '- LOGIC BUGS: wrong conditions, off-by-one, null/undefined access, wrong operator, missed cases.\n' +
      '- PERFORMANCE: needless loops/copies, N+1 queries, heavy or repeated work, redundant recomputation/render.\n' +
      '- OPTIMIZATION: simpler and more efficient code, early returns, better data structure/algorithm, removing duplication.\n' +
      '- SECURITY: hardcoded passwords/keys/tokens, SQL/command injection, unvalidated input.\n' +
      '- BAD PRACTICE: empty catch, swallowed exceptions, dead code, magic constants.\n' +
      "Evaluate only the given added lines; use the provided line number in the 'line' field; " +
      "write a concrete 'suggestion' for every finding; return an empty array [] if there are no issues.\n" +
      'Write the findings in ENGLISH.\n' +
      'Respond ONLY with this JSON array (no markdown):\n' +
      '[{"ruleName":"...","line":<no>,"severity":"MINOR|MAJOR|CRITICAL","message":"...","suggestion":"..."}]',
  },
}

/** Aktif dildeki motor metinleri. */
export function e(): (typeof ENGINE)['tr'] {
  return ENGINE[current]
}

/* ============================ Dedektör çevirileri ============================ */

type DetText = { label: string; message: string; suggestion: string }

/** detectors.ts içindeki metinlerin İngilizce karşılıkları (id ile eşlenir). */
const DETECTORS_EN: Record<string, DetText> = {
  'no-comments': {
    label: 'No comments allowed',
    message: 'A comment was found; this rule forbids comments in code.',
    suggestion:
      'Remove the comment; name things so the code explains itself, or move the explanation into the commit message.',
  },
  'no-console': {
    label: 'console.* forbidden',
    message: 'A console.* call was found (log/debug/info/warn/error).',
    suggestion: 'Remove the console output or use a proper logger/log level.',
  },
  'no-sysout': {
    label: 'System.out / printStackTrace forbidden',
    message: 'Use of System.out/err or printStackTrace was found.',
    suggestion: 'Log through a proper logger (SLF4J/Logback); do not write straight to the console.',
  },
  'no-todo': {
    label: 'TODO / FIXME forbidden',
    message: 'A TODO/FIXME/XXX marker was found.',
    suggestion: 'Finish the work or open an issue and reference it; do not leave it in the code.',
  },
  'no-any': {
    label: "'any' type forbidden",
    message: "The TypeScript 'any' type was used.",
    suggestion: "Use a concrete type, 'unknown' or a generic; 'any' breaks type safety.",
  },
  'no-var': {
    label: "'var' forbidden",
    message: "A variable was declared with 'var'.",
    suggestion: "Use 'const' (or 'let' when reassignment is needed).",
  },
  'no-debugger': {
    label: "'debugger' forbidden",
    message: "A 'debugger' statement was found.",
    suggestion: "Remove the 'debugger' line.",
  },
  'no-alert': {
    label: 'alert/confirm/prompt forbidden',
    message: 'Use of alert/confirm/prompt was found.',
    suggestion: 'Use an in-app component (modal/toast) instead of browser dialogs.',
  },
  'no-hardcoded-secret': {
    label: 'Hardcoded password/key forbidden',
    message: 'A password/key/token value hardcoded into the source was found.',
    suggestion: 'Move secrets into environment variables / secure configuration; never commit them.',
  },
  'no-empty-catch': {
    label: 'Empty catch forbidden',
    message: 'An empty catch block was found (the exception is swallowed).',
    suggestion: 'Log the exception or handle it meaningfully; do not swallow it silently.',
  },
  'no-eqeq': {
    label: 'Use === instead of ==',
    message: "Loose equality ('==' / '!=') was used.",
    suggestion: "Use strict equality ('===' / '!==').",
  },
  'py-print': {
    label: 'Python print() forbidden',
    message: 'Output via print() was found.',
    suggestion: 'Use the logging module; print() should not remain in production code.',
  },
  'go-fmt-print': {
    label: 'Go fmt.Print forbidden',
    message: 'Output via fmt.Print/Println/Printf was found.',
    suggestion: 'Use a structured logger (log/slog); do not leave fmt.Print in production.',
  },
  'cs-console': {
    label: 'C# Console.Write forbidden',
    message: 'Output via Console.Write/WriteLine was found.',
    suggestion: 'Use ILogger; do not write straight to the Console.',
  },
  'php-debug': {
    label: 'PHP var_dump/dd/print_r forbidden',
    message: 'A var_dump/print_r/dd debugging call was found.',
    suggestion: 'Remove the debug output; use a logger (Monolog).',
  },
  'no-panic-throw': {
    label: 'General output/debugging trace',
    message: 'An abrupt termination / debugging call was found (die/exit/panic).',
    suggestion: 'Use proper error handling; do not terminate the process abruptly.',
  },
  'rust-macro-print': {
    label: 'Rust println!/dbg! forbidden',
    message: 'Output via println!/eprintln!/dbg! was found.',
    suggestion: 'Use log/tracing; do not leave macro output in production.',
  },
  'println-puts': {
    label: 'println()/puts forbidden',
    message: 'Output via println()/puts was found.',
    suggestion: 'Use a proper logger; do not write straight to the console.',
  },
}

/** Bir dedektörün aktif dildeki etiketi/mesajı/önerisi. */
export function detText(d: { id: string; label: string; message: string; suggestion: string }): DetText {
  if (current === 'en') {
    const en = DETECTORS_EN[d.id]
    if (en) return en
  }
  return { label: d.label, message: d.message, suggestion: d.suggestion }
}

/* ============================ Hata metinleri (git.ts / commit.ts / llm.ts) ============================ */

const ERRORS = {
  tr: {
    badGitlabUrl: 'Geçersiz GitLab MR linki. Örn: https://gitlab.ornek.com/grup/proje/-/merge_requests/7',
    badGithubUrl: 'Geçersiz GitHub PR linki. Örn: https://github.com/kullanici/proje/pull/42',
    badBitbucketUrl: 'Geçersiz Bitbucket PR linki. Örn: https://bitbucket.org/workspace/proje/pull-requests/12',
    unreachableCors: (name: string) => `${name}’a erişilemedi (tarayıcı CORS engeli olabilir). `,
    unreachableAccess: (name: string) => `${name}’a erişilemedi (CORS/erişim engeli olabilir). `,
    loginFailed: (name: string, status: number, statusText: string) =>
      `${name} ${status} ${statusText} — giriş doğrulanamadı.`,
    gitlabCors: 'GitLab’a erişilemedi (tarayıcı CORS engeli olabilir). Access Token ile girmeyi deneyin. ',
    invalidGrant: 'Kullanıcı adı veya parola hatalı (ya da 2FA açık — Access Token kullanın).',
    loginRejected: (desc: string) => `Giriş reddedildi: ${desc} (password-grant kapalıysa Access Token kullanın).`,
    noToken: 'Token alınamadı.',
    noMrBranch: 'MR kaynak dalı bulunamadı.',
    noPrBranch: 'PR kaynak dalı bulunamadı.',
    noTodoToAdd: 'Eklenecek TODO bulunamadı (hepsi zaten mevcut olabilir).',
    emptyModelReply: 'Model boş yanıt döndü (model adı/kota hatalı olabilir).',
    corsSuffix: ' (CORS/erişim engeli olabilir)',
    connTestPrompt: 'Bağlantı testi.',
  },
  en: {
    badGitlabUrl: 'Invalid GitLab MR link. E.g. https://gitlab.example.com/group/project/-/merge_requests/7',
    badGithubUrl: 'Invalid GitHub PR link. E.g. https://github.com/user/project/pull/42',
    badBitbucketUrl: 'Invalid Bitbucket PR link. E.g. https://bitbucket.org/workspace/project/pull-requests/12',
    unreachableCors: (name: string) => `Could not reach ${name} (a browser CORS block is likely). `,
    unreachableAccess: (name: string) => `Could not reach ${name} (a CORS/access block is likely). `,
    loginFailed: (name: string, status: number, statusText: string) =>
      `${name} ${status} ${statusText} — the sign-in could not be verified.`,
    gitlabCors: 'Could not reach GitLab (a browser CORS block is likely). Try signing in with an Access Token. ',
    invalidGrant: 'Wrong username or password (or 2FA is on — use an Access Token).',
    loginRejected: (desc: string) => `Sign-in rejected: ${desc} (use an Access Token if password-grant is disabled).`,
    noToken: 'Could not obtain a token.',
    noMrBranch: 'The MR source branch was not found.',
    noPrBranch: 'The PR source branch was not found.',
    noTodoToAdd: 'No TODO to add (they may all be present already).',
    emptyModelReply: 'The model returned an empty response (the model name or quota may be wrong).',
    corsSuffix: ' (a CORS/access block is likely)',
    connTestPrompt: 'Connection test.',
  },
}

/** Aktif dildeki hata metinleri. */
export function err(): (typeof ERRORS)['tr'] {
  return ERRORS[current]
}

/* ============================ Git sağlayıcı notları ============================ */

const GIT_NOTES_EN: Record<string, string> = {
  gitlab:
    'Enter your own server address. The token needs full "api" scope (read + comment). You can also sign in with a username and password.',
  github:
    'github.com or an enterprise GitHub Enterprise server. The token needs the "repo" permission (read + comment).',
  bitbucket:
    'Bitbucket Cloud. Requires your username + an App Password (Basic auth). Grant the App Password "Pull requests: read & write".',
}

/** Git sağlayıcısının aktif dildeki açıklama notu. */
export function gitNote(id: string, trNote: string): string {
  return current === 'en' ? GIT_NOTES_EN[id] ?? trNote : trNote
}
