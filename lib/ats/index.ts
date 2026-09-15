// ATS modülünün genel API'si. Arayüz bileşenleri yalnızca buradan içe aktarır.
//
//   analyze(input: AtsInput): AtsReport                        → ./analyze.ts
//   fromCv(data, settings, opts?: { pages }): { doc; structured; template }
//                                                              → ./from-cv.ts (skor seçili şablonun yerleşimine göre)
//   parseFile(file: File): Promise<AtsDocument>                → ./parse/index.ts (tarayıcıda çalışır)
//   AtsParseError (code: AtsParseErrorCode)                    → ./parse/index.ts
//   structuredToCv(structured): CvData                         → ./to-cv.ts (yüklenen CV'yi Stüdyo'ya aktarır)

export * from './types'
export { analyze } from './analyze'
export { fromCv } from './from-cv'
export { parseFile, AtsParseError } from './parse'
export { structuredToCv } from './to-cv'
