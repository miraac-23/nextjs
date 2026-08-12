// lib/presentations.ts içeriğinin İngilizce karşılıkları.
// slug ve embedUrl aynı kalır — sunum uygulamalarının kendisi Türkçedir.
import type { Presentation } from './presentations'

export const presentationsEn: Presentation[] = [
  {
    slug: 'java-spring-kapsamli-egitim',
    title: 'Java & Spring — Comprehensive Learning Deck',
    subtitle: 'From core language to production microservices',
    description:
      'An interactive deck spanning Java fundamentals, the depths of the JVM, the Spring philosophy and production microservices with Spring Boot. Every topic comes with concept cards (what it is / where it comes from / how to use it), everyday analogies, click-to-reveal Q&A and end-of-section recaps.',
    tags: ['Java', 'JVM', 'Spring', 'Spring Boot', 'Microservices'],
    cover: 'from-amber-500/30 via-orange-500/20 to-cyan-600/30',
    badge: 'Interactive Deck',
    embedUrl: '/sunum/index.html',
    stats: [
      { value: '6', label: 'Main Sections' },
      { value: '110+', label: 'Topics' },
      { value: '8→25', label: 'Java Versions' },
    ],
    topics: [
      'Java Core & Advanced',
      'Java Version Analysis (8 → 25)',
      'Spring Framework',
      'Spring Boot',
      'Spring vs Spring Boot',
      'Spring Boot Version Analysis',
    ],
  },
  {
    slug: 'rate-limit-kota-yonetimi',
    title: 'Rate Limiting & Quota Management — Architecture Deck',
    subtitle: 'High-traffic request control, end to end',
    description:
      'A ground-up walkthrough of a platform where requests are evaluated in one place by user, organization, application, service, endpoint and API key — and cut off before ever reaching the downstream service once a limit is exceeded. Every concept, from the Token Bucket to race conditions, from Redis + Lua atomicity to rule propagation with Kafka/Debezium and the quota wallet, is shown with live animations; rate limit and quota scenarios come with hands-on demos.',
    tags: ['Spring Cloud Gateway', 'Redis + Lua', 'Kafka + Debezium', 'PostgreSQL', 'Elasticsearch'],
    cover: 'from-cyan-500/30 via-indigo-500/20 to-violet-600/30',
    badge: 'Interactive Deck',
    embedUrl: '/sunum-rate-limit/index.html',
    stats: [
      { value: '32', label: 'Slides' },
      { value: '6', label: 'Decision Axes' },
      { value: '5', label: 'Algorithms' },
    ],
    topics: [
      'Case & problem — why is it needed?',
      'Two axes: rate limit vs quota',
      'Algorithms & a live Token Bucket',
      'Atomicity, race conditions, key anatomy',
      'Redis · PostgreSQL · Kafka/CDC · Elasticsearch',
      'Quota wallet, billing and resilience',
      'Hands-on demos & measurements',
    ],
  },
  {
    slug: 'api-gateway-merkezi-trafik-yonetimi',
    title: 'API Gateway & Centralized Traffic Management — Architecture Deck',
    subtitle: 'From fundamentals to expert level, a four-stage journey',
    description:
      'A deck that walks you from "what is a gateway?" to production realities and the product-vs-custom gateway decision — no level picking, just a guided path through Basics → Application → Advanced → Expert. Filter chains, identity, quotas, resilience and observability are told through live canvas animations; the circuit breaker race, deployment strategies and topology scenarios come as interactive scenes you can measure side by side.',
    tags: ['API Gateway', 'Spring Cloud Gateway', 'Resilience4j', 'Circuit Breaker', 'Observability'],
    cover: 'from-emerald-500/30 via-sky-500/20 to-fuchsia-600/30',
    badge: 'Interactive Deck',
    embedUrl: '/sunum-api-gateway/index.html',
    stats: [
      { value: '46', label: 'Slides' },
      { value: '4', label: 'Stages' },
      { value: '30+', label: 'Live Scenes' },
    ],
    topics: [
      'Case & problem — repeated cross-cutting work',
      'Basics: gateway, proxy/LB/mesh differences, 16 stops',
      'Application: routing, discovery, JWT, quota, versioning',
      'Advanced: timeout, circuit breaker, load shedding, canary',
      'Resilience4j decorator chain & parameters',
      'SPOF, blast radius, observability and security',
      'Expert: product landscape, comparison arena',
      'Custom gateways, anti-patterns and a PoC plan',
    ],
  },
  {
    slug: 'trafik-polisi-operasyon-takip-sistemi',
    title: 'Traffic Police Operations & Tracking System — Architecture Deck',
    subtitle: 'An operations centre that sees the field live and keeps dispatch consistent',
    description:
      "A ground-up walkthrough of an operations centre where the positions of 240 traffic officers change every few seconds. It starts with the mistakes radio-based dispatch produces, then moves on to a monthly-partitioned location table, the search that collapses without a trigram index, the race condition where two operators assign the same officer at the same moment, and the three-layer locking strategy that resolves it. The Kafka buffer, multi-instance SSE over Redis pub/sub, virtual threads, idempotency and the Redis + Lua token bucket are shown with live canvas scenes; partition pruning, the index race, double dispatch and rate limiting come with hands-on demos.",
    tags: ['Java 21', 'Spring Boot', 'PostgreSQL', 'Redis + Lua', 'Apache Kafka', 'SSE', 'React + MUI'],
    cover: 'from-amber-500/30 via-blue-500/20 to-emerald-600/30',
    badge: 'Interactive Deck',
    embedUrl: '/sunum-traffic-ops/index.html',
    stats: [
      { value: '32', label: 'Slides' },
      { value: '4', label: 'Stages' },
      { value: '10', label: 'Live Scenes' },
    ],
    topics: [
      'Case & problem — dispatching without visibility',
      'Roles, the end-to-end flow and the operations dashboard',
      'Domain-based packaging and client contracts',
      'Monthly-partitioned location table & partition pruning',
      'Index types: B-tree, trigram GIN, BRIN, partial UNIQUE',
      'Race conditions, row locks, lock ordering and deadlocks',
      'JWT rotation, SSE tickets and authorization',
      'Multi-instance SSE over Redis pub/sub, the Kafka ingest buffer',
      'Virtual threads, idempotency and a Lua token bucket',
    ],
  },
]

export function getPresentationEn(slug: string): Presentation | undefined {
  return presentationsEn.find((p) => p.slug === slug)
}
