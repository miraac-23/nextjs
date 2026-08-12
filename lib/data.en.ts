// lib/data.ts içeriğinin İngilizce karşılıkları.
// Slug'lar ve teknik etiketler bilinçli olarak aynı bırakıldı (rotalar bozulmasın diye).
import type { BlogPost, Education, Experience, Project, SkillGroup } from './data'

export const profileEn = {
  name: 'Miraç Güntoğar',
  role: 'Fullstack Software Developer',
  tagline: 'Java · Spring Boot · React / Next.js',
  location: 'Çankaya / Ankara',
  email: 'mirac.guntogar@gmail.com',
  phone: '+90 530 975 3423',
  birthYear: 1999,
  summary:
    'A fullstack engineer building scalable, maintainable and user-centered systems. I combine Java & Spring Boot microservice architectures with React & Next.js interfaces to deliver modern, performant and secure solutions.',
  about: [
    'I use the knowledge and experience I have gained in software engineering to build scalable, maintainable and user-centered systems. I bring solid fullstack experience across both backend and frontend technologies.',
    'I deliver modern, performant and user-friendly solutions with Java and Spring Boot microservice architectures alongside React and Next.js. Working on nationwide projects such as TAKBİS deepened my expertise in CI/CD pipelines, DevOps alignment and modern software methodologies.',
    'I aim to take ownership of performance- and security-critical systems, create value alongside teams with a strong engineering culture, and keep growing by adapting quickly to new technologies.',
  ],
}

export const socialsEn = [
  { label: 'GitHub', href: 'https://github.com/miraac-23', handle: 'miraac-23', icon: 'github' },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/mira%C3%A7-g%C3%BCnto%C4%9Far-758b461ab/',
    handle: 'miraç-güntoğar',
    icon: 'linkedin',
  },
  {
    label: 'Stack Overflow',
    href: 'https://stackoverflow.com/users/mirac-gundogar',
    handle: 'mirac-gundogar',
    icon: 'stackoverflow',
  },
  {
    label: 'Email',
    href: 'mailto:mirac.guntogar@gmail.com',
    handle: 'mirac.guntogar@gmail.com',
    icon: 'mail',
  },
]

export const statsEn = [
  { value: '4+', label: 'Years Experience' },
  { value: '4', label: 'Featured Projects' },
  { value: 'National', label: 'Scale System' },
  { value: '3.35', label: "Master's GPA" },
]

export const skillGroupsEn: SkillGroup[] = [
  { title: 'Languages', icon: 'code', items: ['Java', 'Kotlin', 'JavaScript', 'TypeScript', 'SQL'] },
  {
    title: 'Backend',
    icon: 'server',
    items: ['Spring Boot', 'Spring Security', 'REST API', 'JWT', 'Microservices'],
  },
  { title: 'Frontend', icon: 'layout', items: ['React', 'Next.js', 'React Native', 'HTML / CSS'] },
  { title: 'Database & DevOps', icon: 'database', items: ['PostgreSQL', 'Docker', 'Git', 'CI/CD'] },
  {
    title: 'Process & Quality',
    icon: 'shield',
    items: ['Agile / Scrum', 'Jira', 'Confluence', 'Clean Code', 'SOLID'],
  },
]

export const experiencesEn: Experience[] = [
  {
    role: 'Fullstack Software Developer',
    company: 'Türksat Uydu Haberleşme Kablo TV ve İşletme A.Ş.',
    period: 'Mar 2024 — Present',
    current: true,
    points: [
      'Fullstack developer in the modernization of TAKBİS, a system actively used across Turkey; contributed to requirement analysis and architectural decision-making.',
      'Built scalable microservices and RESTful APIs with Java & Spring Boot; designed secure JWT-based authentication layers.',
      'Developed performant interfaces with React & Next.js and designed complex data models on PostgreSQL.',
      'Containerization with Docker and CI/CD integration; safeguarded code quality with Clean Code & SOLID principles, running Scrum through Jira & Confluence.',
    ],
  },
  {
    role: 'Fullstack Software Developer',
    company: 'MKK / Gabim A.Ş.',
    period: 'Jun 2022 — Mar 2024',
    points: [
      'Fullstack development of the Member Management System (UYS) for TDUB and the TADEBIS reporting application for foreign sales analysis.',
      'Backend services with Java & Spring Boot, responsive interfaces with React & Next.js; PostgreSQL data modeling and service-to-service integration architecture.',
      'Portable development environments with Docker, version control with Git, and active contribution to Scrum ceremonies.',
    ],
  },
  {
    role: 'Mobile Application Developer · Long-term Internship',
    company: 'Başarsoft',
    period: 'Oct 2021 — Jan 2022',
    points: [
      'Developed native Android apps with Java & Kotlin and hybrid mobile apps with React Native.',
      'Gained experience in UI/UX, performance optimization and code management with Git.',
    ],
  },
  {
    role: 'Web Developer · Internship',
    company: 'Baydaş Yazılım Bilişim',
    period: 'Sep 2020 — Jun 2021',
    points: [
      'Built static and dynamic web interfaces and prototypes with HTML & CSS.',
      'Worked on responsive design and core UI/UX principles.',
    ],
  },
]

export const projectsEn: Project[] = [
  {
    title: 'TAKBİS Modernization',
    subtitle: 'National-scale land registry & cadastre system',
    description:
      'Modernization of the land registry and cadastre platform used across Turkey. A high-volume, security-focused system built on Spring Boot microservices with React/Next.js interfaces.',
    tags: ['Spring Boot', 'Microservices', 'Next.js', 'PostgreSQL', 'CI/CD'],
    highlight: true,
  },
  {
    title: 'UYS — Member Management System',
    subtitle: 'TDUB',
    description:
      'A fullstack platform digitalizing member processes end to end. Secure JWT-based authentication and a service-to-service integration architecture.',
    tags: ['Java', 'Spring Security', 'React', 'JWT'],
  },
  {
    title: 'TADEBIS',
    subtitle: 'Reporting & Analytics',
    description:
      'An application for analyzing and reporting foreign sales data. A performant reporting layer built on top of complex data models.',
    tags: ['Spring Boot', 'PostgreSQL', 'REST API', 'Next.js'],
  },
  {
    title: 'HR Leave Tracking & User Management',
    subtitle: 'Internal Enterprise System',
    description:
      'An internal enterprise system designed from scratch and shipped to production. A leave tracking flow for Human Resources plus an integrated user management module.',
    tags: ['Fullstack', 'React', 'Spring Boot', 'Docker'],
  },
]

export const educationEn: Education[] = [
  {
    degree: "Master's — Management Information Systems",
    school: 'Gazi University',
    period: '2024 — 2025',
    detail: 'GPA: 3.35 / 4.00',
  },
  {
    degree: "Bachelor's — Computer Engineering",
    school: 'Gazi University',
    period: '2018 — 2022',
    detail: 'GPA: 2.81 / 4.00',
  },
  {
    degree: 'High School — Kernek Anatolian High School',
    school: 'Malatya',
    period: '2012 — 2016',
    detail: 'Graduation score: 83 / 100',
  },
]

export const blogPostsEn: BlogPost[] = [
  {
    slug: 'spring-boot-mikroservis-mimarisi',
    title: 'Scalable Microservice Architecture with Spring Boot',
    excerpt:
      'How I drew microservice boundaries in a national-scale system, plus service-to-service communication and resilience patterns.',
    date: '2026-05-12',
    readingTime: '7 min',
    tag: 'Backend',
    cover: 'from-cyan-500/30 to-blue-600/30',
    content: [
      'When designed with the right boundaries, a microservice architecture gives teams the freedom to develop and deploy independently. During the TAKBİS modernization, our hardest problem was drawing those service boundaries in a domain-driven (DDD) way.',
      'Striking the balance between synchronous REST calls and asynchronous messaging was critical. We used REST for flows where the user expects immediate feedback, and an event-driven approach for business processes running in the background.',
      'For resilience we applied circuit breaker, timeout and retry patterns. One slow service must never lock up the whole system; fault isolation is both the biggest promise and the biggest responsibility of microservices.',
      'The takeaway: start small, validate your boundaries with real data, and bake observability (logging, tracing, metrics) into the architecture from day one.',
    ],
  },
  {
    slug: 'jwt-ile-guvenli-kimlik-dogrulama',
    title: 'Designing a Secure Authentication Layer with JWT',
    excerpt:
      'Access/refresh token strategy and common security pitfalls when building stateless authentication with Spring Security + JWT.',
    date: '2026-04-03',
    readingTime: '6 min',
    tag: 'Security',
    cover: 'from-violet-500/30 to-fuchsia-600/30',
    content: [
      'JWT is a powerful tool for stateless authentication, but misused it opens serious security holes. The basic rule: keep access tokens short-lived, and store refresh tokens securely with rotation in place.',
      'With Spring Security we set up a filter chain so every incoming request passes through token validation. Choosing asymmetric RS256 over HS256 as the signing algorithm makes key management far more flexible.',
      'The most common mistake is carrying sensitive data inside the token payload. A JWT is signed but not encrypted; anyone can read the payload.',
      'For revocation you need either a blacklist or a short-lifetime plus refresh-rotation strategy. Security never comes from a single measure — it comes from layered defense.',
    ],
  },
  {
    slug: 'nextjs-performans-optimizasyonu',
    title: 'Real-World Performance Optimization in Next.js',
    excerpt:
      'How I speed up user interfaces with server components, image optimization and deliberate caching.',
    date: '2026-02-18',
    readingTime: '5 min',
    tag: 'Frontend',
    cover: 'from-emerald-500/30 to-teal-600/30',
    content: [
      'Performance is not a feature; it is the foundation of user experience. Keeping server components as the default in the Next.js App Router dramatically reduces the JavaScript shipped to the client.',
      'Images are usually the heaviest payload. Automatic sizing, modern formats and lazy loading via next/image improve initial load time dramatically.',
      'Pick your caching strategy deliberately when fetching data: full caching for static content, revalidation for frequently changing data, and dynamic rendering for user-specific data.',
      'Never optimize without measuring. Add Lighthouse and Web Vitals metrics to your CI pipeline so regressions surface early.',
    ],
  },
  {
    slug: 'docker-ci-cd-akisi',
    title: 'A Frictionless Deployment Flow with Docker and CI/CD',
    excerpt:
      'From containerization to automated deployment: building a repeatable pipeline that carries your dev environment into production.',
    date: '2026-01-09',
    readingTime: '6 min',
    tag: 'DevOps',
    cover: 'from-amber-500/30 to-orange-600/30',
    content: [
      'Containerization is how you retire the phrase "it worked on my machine". With Docker we package the application, its dependencies and its runtime into a single portable image.',
      'Multi-stage builds keep the production image minimal and secure. Build tooling never reaches the final image; only what is needed at runtime remains.',
      'A CI/CD pipeline automates testing, building and image publishing on every commit. Less manual intervention means fewer mistakes and faster delivery.',
      'The goal: every step from merge to production is repeatable, traceable and reversible.',
    ],
  },
]
