// ATS skor motoru — kaynaktan bağımsız sözleşme.
// Kaynaklar: CV Stüdyosu'nda oluşturulan CV (from-cv.ts), yüklenen PDF/DOCX/TXT (parse/*).
// Hepsi önce `AtsDocument`e çevrilir, sonra `analyze()` aynı kurallarla puanlar.

export type AtsLang = 'tr' | 'en'
export type AtsSource = 'builder' | 'pdf' | 'docx' | 'txt'

/** Belgeden okunan tek satır. PDF/DOCX parser'ları biçim ipuçlarını da doldurur. */
export type AtsLine = {
  text: string
  page: number
  /** pt cinsinden; bilinmiyorsa undefined. */
  fontSize?: number
  bold?: boolean
  fontName?: string
  /** PDF: sayfa üst kenarından mm; DOCX/TXT: undefined. */
  y?: number
  /** PDF: sol kenardan mm. */
  x?: number
}

/**
 * Yerleşim sinyalleri. `undefined` → "ölçülemedi" (motor bu kontrolü 'info' olarak
 * işaretler, puan kırmaz). Sayılar tespit edilen öğe adedidir.
 */
export type LayoutSignals = {
  /** Seçilebilir/aranabilir metin var mı? (taranmış/görsel PDF → false) */
  textBased: boolean
  /** Tespit edilen metin sütunu sayısı (1 = tek kolon). */
  columns?: number
  tables?: number
  textBoxes?: number
  /** Gömülü görsel (fotoğraf, logo, grafik) sayısı. */
  images?: number
  /** Vektörel çizimle yapılmış grafik/skill bar/progress bar benzeri şekil sayısı (PDF). */
  graphics?: number
  /** Header/footer alanında bulunan kritik bilgi parçaları (e-posta, telefon, ad...). */
  headerFooterCritical?: string[]
  /** Kullanılan font aileleri (ör. "Arial", "Calibri", "Roboto"). */
  fonts?: string[]
  /** En çok kullanılan (gövde) font boyutu, pt. */
  bodyFontSizePt?: number
  /** Bölüm başlıklarının font boyutu, pt. */
  headingFontSizePt?: number
  /** Ad soyadın font boyutu, pt. */
  nameFontSizePt?: number
  /** Sayfa kenar boşlukları, mm. */
  marginsMm?: { top?: number; right?: number; bottom?: number; left?: number }
  /** Arka plan koyu mu (açık zemin standardına aykırı)? */
  darkBackground?: boolean
  /** Belge sayfasının genişliği (mm) — kenar boşluğu yorumlamak için. */
  pageWidthMm?: number
  /** Dekoratif/bilgi taşıyan ikon sayısı (ör. iletişim ikonları, ikon fontu glifleri). */
  icons?: number
  /** Standart dışı (dekoratif) madde işareti kullanılıyor mu (ok, onay işareti, kare…)? */
  decorativeBullets?: boolean
  /** Vurgu renginin beyaz zemine kontrast oranı (WCAG). Yalnızca builder kaynağında kesin bilinir. */
  accentContrast?: number
}

export type AtsDocument = {
  source: AtsSource
  fileName?: string
  /** Parser'ın okuduğu doğal sıradaki düz metin; satırlar "\n" ile ayrılır. */
  text: string
  lines: AtsLine[]
  pageCount: number
  layout: LayoutSignals
}

/* ---------------------------- yapılandırılmış CV ---------------------------- */

export type ResumeSectionKind =
  | 'contact'
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'languages'
  | 'awards'
  | 'interests'
  | 'references'
  | 'other'

export type ResumeSection = {
  kind: ResumeSectionKind
  /** Belgede yazan başlık metni. */
  heading: string
  /** Başlık tanınan standart başlıklardan biri mi (TR ya da EN)? */
  standard: boolean
  /** Bölüm gövdesi (başlık hariç) düz metin. */
  body: string
  /** `text` içindeki satır aralığı [başlangıç, bitiş) — parser görünümünde vurgulamak için. */
  lineRange?: [number, number]
}

export type ResumeExperience = {
  title: string
  company: string
  location: string
  start: string
  end: string
  current: boolean
  bullets: string[]
  /** Madde dışı açıklama metni. */
  description: string
}

export type ResumeEducation = { degree: string; school: string; location: string; start: string; end: string }

export type StructuredResume = {
  name: string
  title: string
  contact: {
    email: string
    phone: string
    location: string
    linkedin: string
    github: string
    website: string
  }
  summary: string
  sections: ResumeSection[]
  experience: ResumeExperience[]
  education: ResumeEducation[]
  /** Düz yetenek listesi (gruplar açılmış). */
  skills: string[]
  skillGroups: { label: string; items: string[] }[]
  projects: { name: string; description: string; tech: string[]; bullets: string[] }[]
  certifications: string[]
  languages: string[]
  /** Belgenin dili (başlık/metin sezgisiyle). */
  lang: AtsLang
}

/* ---------------------------------- rapor ---------------------------------- */

export type AtsStatus = 'pass' | 'warn' | 'fail' | 'info'

/**
 * Yaygın kabul gören CV skorlama modeli (Jobscan / Resume Worded yapısı) + kullanıcının ATS kuralları:
 *   formatting    → Biçim & ATS uyumluluğu (parse edilebilirlik, tek kolon, tablo/görsel/ikon, font, boyut, kenar boşluğu)
 *   searchability → Aranabilirlik (iletişim, özet, standart başlıklar, unvan eşleşmesi, tarih biçimi, eğitim, sıralama)
 *   hardSkills    → Hard skills — ilandaki teknik/mesleki anahtar kelimeler, bağlam içinde kullanım, kısaltmalar
 *   softSkills    → Soft skills — ilandaki kişisel yetkinlikler
 *   recruiterTips → İşe alımcı ipuçları (ölçülebilir sonuçlar, eylem fiilleri, madde yapısı, ton, klişeler, uzunluk)
 */
export type AtsCategoryKey = 'formatting' | 'searchability' | 'hardSkills' | 'softSkills' | 'recruiterTips'

/** Kullanıcıyı düzeltme için CV Stüdyosu'nda nereye götürelim? (yalnızca builder kaynağında anlamlı) */
export type AtsFixTarget = 'details' | 'design' | 'sections' | 'job' | 'template'

export type AtsCheck = {
  /** Kararlı kimlik, ör. 'single-column', 'no-tables', 'standard-font'. */
  id: string
  category: AtsCategoryKey
  status: AtsStatus
  /** Yerelleştirilmiş kısa başlık. */
  title: string
  /** Ne bulundu — yerelleştirilmiş açıklama. */
  detail: string
  /** Nasıl düzeltilir — yerelleştirilmiş öneri (pass için boş olabilir). */
  fix?: string
  /** Bu kontrolün toplam puana katkısı (maksimum). */
  weight: number
  earned: number
  fixTarget?: AtsFixTarget
  /** Kullanıcının istediği 20 maddelik çıktı kontrol listesine karşılık geliyorsa true. */
  checklist?: boolean
}

export type AtsCategoryScore = {
  key: AtsCategoryKey
  label: string
  /** 0–100 */
  score: number
  earned: number
  max: number
}

export type AtsKeywordHit = { term: string; count: number; inExperience: boolean; inSkills: boolean; soft: boolean }

export type AtsKeywordReport = {
  /** İş ilanı verildi mi? Verilmediyse kategori ağırlığı diğerlerine dağıtılır. */
  provided: boolean
  /** İlandan çıkarılan anahtar kelimeler (önem sırasıyla). */
  extracted: { term: string; importance: 'high' | 'medium' | 'low'; group: string; soft: boolean }[]
  matched: AtsKeywordHit[]
  missing: { term: string; importance: 'high' | 'medium' | 'low'; group: string; soft: boolean }[]
  /** Yalnızca Skills bölümünde geçen, deneyim bağlamında hiç kullanılmayan terimler. */
  skillsOnly: string[]
  /** Aşırı tekrar edilen (keyword stuffing şüphesi) terimler. */
  stuffing: string[]
  /** CV unvanı ilandaki unvanla örtüşüyor mu? null → ilan/unvan yok. */
  titleMatch: boolean | null
  /** Açılımı verilmemiş kısaltmalar (ilk kullanımda). */
  unexplainedAcronyms: string[]
  /** 0–100 hard skill eşleşme oranı. */
  matchRate: number
  /** 0–100 soft skill eşleşme oranı (ilanda soft skill yoksa 0). */
  softMatchRate: number
  /** CV'de geçen klişe/boş ifadeler ("team player", "çalışkan", "dinamik"…). */
  buzzwords: string[]
}

export type AtsGrade = 'excellent' | 'good' | 'fair' | 'poor'

export type AtsReport = {
  /** 0–100 genel skor. */
  score: number
  grade: AtsGrade
  gradeLabel: string
  /** Tek cümlelik yerelleştirilmiş özet. */
  headline: string
  categories: AtsCategoryScore[]
  checks: AtsCheck[]
  keywords: AtsKeywordReport
  /** En etkili 3–6 iyileştirme önerisi (puan kaybına göre sıralı). */
  topFixes: AtsCheck[]
  parsed: StructuredResume
  /** ATS'nin okuduğu düz metin. */
  text: string
  stats: {
    words: number
    bullets: number
    quantifiedBullets: number
    pages: number
    experienceYears: number | null
    sectionsFound: number
  }
  source: AtsSource
  /** Builder kaynağında seçili şablon — skorun hangi yerleşime göre hesaplandığını gösterir. */
  template?: { id: string; name: string; family: 'ats' | 'design' }
  generatedAt: number
}

export type AtsInput = {
  doc: AtsDocument
  /** Rapor metinlerinin dili (arayüz dili). */
  lang: AtsLang
  jobDescription?: string
  /** Hedef pozisyon unvanı (opsiyonel; verilmezse ilandan çıkarılmaya çalışılır). */
  targetTitle?: string
  /** Builder kaynağında yapı kesin bilinir; verilirse metinden sezgisel ayrıştırma yerine kullanılır. */
  structured?: StructuredResume
  /** Builder kaynağında seçili şablon; rapora aynen taşınır (`report.template`) ve düzeltme önerilerini yönlendirir. */
  template?: { id: string; name: string; family: 'ats' | 'design' }
}

export type AtsParseErrorCode = 'unsupported' | 'too-large' | 'encrypted' | 'empty' | 'corrupt'
