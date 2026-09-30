// Karar ucu gövde doğrulaması.
//
// Ayrı dosyada: ana şema (lib/sunum/schema.ts) sunum modelini tanımlıyor, bu ise
// dış servise proxy'lenecek soru partilerini. İkisini karıştırmak ana şemayı
// gereksiz büyütürdü.

import { z } from 'zod'

/** Jev bağlam sınırı 64k token ≈ 180k karakter; bir parti bunu aşamaz. */
const MAX_STATE = 180_000
/** Bir partideki en fazla soru. 12 slayt × 3 soru = 36; pay bırakıldı. */
const MAX_QUESTIONS = 60

const choiceQuestion = z.object({
  type: z.literal('choice'),
  instructions: z.string().min(1).max(600),
  criteria: z.record(z.string().max(64), z.string().max(400)),
})

const scoreQuestion = z.object({
  type: z.literal('score'),
  instructions: z.string().min(1).max(600),
  // Jev 2–10 seviye kabul ediyor.
  criteria: z.array(z.string().max(400)).min(2).max(10),
})

const noulQuestion = z.object({
  type: z.literal('noul'),
  instructions: z.string().min(1).max(600),
  criteria: z.object({ true: z.string().max(400), false: z.string().max(400) }).optional(),
})

export const questionSchema = z.discriminatedUnion('type', [choiceQuestion, scoreQuestion, noulQuestion])

export const decideRequestSchema = z.object({
  batches: z
    .array(
      z.object({
        state: z.string().min(1).max(MAX_STATE),
        questions: z.record(z.string().max(64), questionSchema).refine(
          (q) => Object.keys(q).length > 0 && Object.keys(q).length <= MAX_QUESTIONS,
          { message: `questions: 1-${MAX_QUESTIONS} arası olmalı` },
        ),
      }),
    )
    .min(1)
    .max(4),
})

export type DecideRequestBody = z.infer<typeof decideRequestSchema>
