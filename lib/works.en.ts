// lib/works.ts içeriğinin İngilizce karşılıkları.
// NOT: Bu modül lib/lab.ts'i (dolaylı olarak) içerir; yalnızca sunucu bileşenlerinden
// import edilmeli, sonuç WorksSection'a prop olarak geçirilmelidir.
import { works, type Work } from './works'

export const worksEn: Work[] = [
  {
    ...works[0],
    title: 'Java & Spring Interactive Learning Portal',
    subtitle: 'A learning lab that runs in the browser',
    description:
      "A comprehensive learning lab from Java to Spring Boot. The original ran code live against a React + Spring Boot backend; in this version I moved every explanation and example to the frontend — no JVM required, each example ships with its output precomputed.",
    tags: ['Java', 'Spring', 'Spring Boot', 'Next.js', 'Interactive'],
    badge: 'Interactive Portal',
    stats: [
      { value: works[0].stats[0].value, label: 'Topics' },
      { value: '5', label: 'Categories' },
      { value: 'Real', label: 'JVM Output' },
    ],
  },
]
