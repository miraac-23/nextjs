// Anahtar kelime sözlüğü + iş ilanından anahtar kelime/unvan çıkarımı + CV'de eşleştirme.
// Sözlük satırı: "Kanonik|grup|takma ad|takma ad…"
//   ~Ad   → orijinal metinde BÜYÜK/küçük harfe duyarlı tam eşleşme (Go, R, REST, SAP…)
//   ad*   → önek eşleşmesi (Türkçe ekler: "mikroservis*" → "mikroservislerde")

import { fold, isWordChar } from './text'

export type KwGroup =
  | 'language'
  | 'framework'
  | 'library'
  | 'database'
  | 'cloud'
  | 'devops'
  | 'tool'
  | 'methodology'
  | 'certification'
  | 'domain'
  | 'soft'
  | 'role'

const G: Record<string, KwGroup> = {
  L: 'language', F: 'framework', B: 'library', D: 'database', C: 'cloud', O: 'devops', T: 'tool',
  M: 'methodology', X: 'certification', N: 'domain', S: 'soft', R: 'role',
}

const RAW = `
Java|L|java se|core java
Kotlin|L
Python|L|python3
Go|L|~Go|golang
Rust|L
C|L|~C
C++|L|cpp
C#|L|csharp|c sharp
JavaScript|L|js|ecmascript|es6|javascript es6
TypeScript|L|~TS
PHP|L
Ruby|L
Scala|L
Swift|L|~Swift
Objective-C|L|objective c
Dart|L
Perl|L
R|L|~R
MATLAB|T
Elixir|L
Haskell|L
Lua|L
Groovy|L
Bash|L|~Bash|shell scripting|bash scripting|shell script
PowerShell|L
VBA|L
ABAP|L
COBOL|L
Solidity|L
SQL|D|~SQL|sql queries
PL/SQL|D|plsql
T-SQL|D|tsql|transact-sql
NoSQL|D
HTML|L|html5
CSS|L|css3
Sass|B|scss
Spring Boot|F|springboot|spring-boot
Spring Framework|F|spring|spring mvc|spring core
Spring Cloud|F
Spring Security|F
Spring Batch|F
Spring Data JPA|F|spring data
Hibernate|F
JPA|F|java persistence api
Quarkus|F
Micronaut|F
Jakarta EE|F|java ee|j2ee|jee|java ee 8
Vert.x|F|vertx
Django|F|django rest framework|drf
Flask|F
FastAPI|F|fast api
Ruby on Rails|F|rails|ror
Laravel|F
Symfony|F
.NET|F|dotnet|.net core|.net framework|asp.net|asp.net core|asp.net mvc|net core
Entity Framework|F|ef core|entity framework core
Blazor|F
Node.js|F|nodejs|node|node js
Express.js|F|expressjs|express js|~Express
NestJS|F|nest.js|nest js
React|F|react.js|reactjs|react js
Next.js|F|nextjs|next js
Angular|F|angularjs|angular.js
Vue.js|F|vue|vuejs|vue js|vue 3
Nuxt.js|F|nuxt|nuxtjs
Svelte|F|sveltekit
Redux|B|redux toolkit|redux-saga
React Native|F
Flutter|F
SwiftUI|F
Jetpack Compose|F
Ionic|F
Electron|F|electron.js
jQuery|B
Bootstrap|B
Tailwind CSS|B|tailwind|tailwindcss
Material UI|B|mui|material-ui
Webpack|T
Vite|T
GraphQL|F
Apollo|B|apollo graphql|apollo client
gRPC|F|grpc|protobuf|protocol buffers
REST API|F|~REST|restful|rest api|rest apis|restful api|restful apis|restful services|rest services|restful web services|rest servis*|restful servis*
SOAP|F|~SOAP|soap web services
WebSocket|F|websockets|web socket
OpenAPI|T|swagger|openapi 3
Microservices|M|microservice|micro-services|micro services|microservice architecture|microservices architecture|mikroservis*|mikro servis*
Event-Driven Architecture|M|event-driven|event driven|eda|olay gudumlu*|olay tabanli*
CQRS|M
Event Sourcing|M
DDD|M|domain-driven design|domain driven design
Clean Architecture|M|clean code|temiz kod*|temiz mimari*
Hexagonal Architecture|M|ports and adapters
SOLID|M|~SOLID|solid principles|solid prensipleri*
Design Patterns|M|tasarim desen*|tasarim kaliplari*
OOP|M|object-oriented programming|object oriented programming|object-oriented|object oriented|nesne yonelimli*
Functional Programming|M|fonksiyonel programlama*
TDD|M|test-driven development|test driven development
BDD|M|behavior-driven development|behaviour-driven development
Unit Testing|M|unit test*|birim test*
Integration Testing|M|integration test*|entegrasyon test*
End-to-End Testing|M|e2e|end-to-end test*|end to end test*|uctan uca test*
Test Automation|M|automation testing|automated testing|test otomasyon*
JUnit|B|junit 5|junit5|junit 4
Mockito|B
Testcontainers|B|test containers
Jest|B
Cypress|T
Selenium|T|selenium webdriver
Playwright|T
Cucumber|T
Postman|T
JMeter|T|apache jmeter
pytest|B
TestNG|B
Mocha|B
SonarQube|T|sonar|sonarcloud
Pandas|B
NumPy|B
scikit-learn|B|sklearn|scikit learn
TensorFlow|B
PyTorch|B
Keras|B
OpenCV|B
Hugging Face|B|huggingface
LangChain|B
Apache Spark|B|~Spark|pyspark
Hadoop|B|apache hadoop|hdfs
Apache Airflow|T|airflow
dbt|T|~dbt
Lombok|B
MapStruct|B
RxJS|B
D3.js|B|d3
PostgreSQL|D|postgres|postgre|postgre sql|postgresql 15
MySQL|D
MariaDB|D
Oracle Database|D|oracle|oracle db|oracle database|oracle 19c
Microsoft SQL Server|D|sql server|mssql|ms sql|ms sql server
SQLite|D
MongoDB|D|mongo|mongo db
Redis|D
Elasticsearch|D|elastic search|opensearch
Cassandra|D|apache cassandra
DynamoDB|D|dynamo db
Couchbase|D
Neo4j|D
Firebase|C|firestore
InfluxDB|D
ClickHouse|D
Snowflake|D
BigQuery|D|google bigquery
Amazon Redshift|D|redshift
Hazelcast|D
Memcached|D
Liquibase|T
Flyway|T
Apache Kafka|O|kafka|kafka streams|confluent kafka
RabbitMQ|O|rabbit mq
ActiveMQ|O|active mq|artemis
IBM MQ|O|websphere mq
Amazon SQS|C|sqs
Amazon SNS|C|sns
Google Pub/Sub|C|pub/sub|pubsub
NATS|O|~NATS
MQTT|O
AWS|C|~AWS|amazon web services
Microsoft Azure|C|azure
Google Cloud Platform|C|gcp|google cloud
AWS Lambda|C|lambda functions|aws lambda
Amazon EC2|C|ec2
Amazon S3|C|~S3|aws s3
Amazon EKS|C|eks
Amazon ECS|C|ecs|fargate
Amazon RDS|C|rds|aurora
AWS CloudFormation|C|cloudformation
Azure DevOps|O|azure pipelines|vsts|tfs
Serverless|C|serverless architecture
OpenShift|C|red hat openshift
Heroku|C
DigitalOcean|C|digital ocean
Cloudflare|C
Vercel|C
Docker|O|dockerfile|docker compose|docker-compose|containerization|containerisation|konteyner*
Kubernetes|O|k8s|kubectl|kubernetes cluster
Helm|O|helm charts
Terraform|O
Ansible|O
Puppet|O|~Puppet
Chef|O|~Chef
Jenkins|O|jenkins pipeline|jenkinsfile
GitLab CI|O|gitlab ci/cd|gitlab-ci|gitlab pipelines|gitlab ci cd
GitHub Actions|O|github action
CircleCI|O|circle ci
Travis CI|O|travisci
Argo CD|O|argocd
TeamCity|O
CI/CD|O|ci/cd|ci cd|cicd|ci-cd|continuous integration|continuous delivery|continuous deployment|surekli entegrasyon*|surekli dagitim*|surekli teslim*
DevOps|O
DevSecOps|O
GitOps|O
Infrastructure as Code|O|iac|infrastructure-as-code|kod olarak altyapi*
Prometheus|O
Grafana|O
ELK Stack|O|elk|elk stack|kibana|logstash|elastic stack
Datadog|O
New Relic|O|newrelic
Splunk|O
OpenTelemetry|O|otel|open telemetry
Jaeger|O
Istio|O
Service Mesh|O
Nginx|O
Apache Tomcat|O|tomcat
Linux|O|ubuntu|centos|red hat enterprise linux|rhel|debian
Unix|O
Maven|T|apache maven
Gradle|T
npm|T|~npm|yarn|pnpm
Keycloak|T
OAuth 2.0|F|oauth|oauth2|oauth 2|oauth 2.0
OpenID Connect|F|oidc|openid
JWT|F|json web token|json web tokens
SSO|F|single sign-on|single sign on
LDAP|F|active directory
SAML|F
HashiCorp Vault|O|~Vault|hashicorp vault
SRE|O|site reliability engineering
Observability|O|monitoring and observability|izlenebilirlik*
High Availability|N|yuksek erisilebilirlik*
Distributed Systems|N|distributed system|dagitik sistem*
System Design|N|sistem tasarimi*
Software Architecture|N|yazilim mimarisi*
Data Structures & Algorithms|N|data structures|algorithms|veri yapilari*|algoritma*
Performance Optimization|N|performance tuning|performans optimizasyon*|performans iyilestirme*
Git|T|git flow|gitflow
GitHub|T
GitLab|T
Bitbucket|T
Jira|T|atlassian jira
Confluence|T
Trello|T
Asana|T
Notion|T|~Notion
Figma|T
Sketch|T|~Sketch
Adobe XD|T
Adobe Photoshop|T|photoshop
Adobe Illustrator|T|illustrator
Adobe InDesign|T|indesign
Adobe After Effects|T|after effects
Adobe Premiere Pro|T|premiere pro
Canva|T
IntelliJ IDEA|T|intellij
Visual Studio Code|T|vs code|vscode
Visual Studio|T
Microsoft Excel|T|excel|ms excel|advanced excel|ileri excel*|ileri seviye excel*
Power BI|T|powerbi|power-bi
Tableau|T
Looker|T|looker studio|google data studio
Google Analytics|T|ga4
Google Ads|T|adwords
SAP|T|~SAP|sap erp|sap s/4hana|s/4hana|sap fico|sap mm|sap sd
Salesforce|T|salesforce crm
HubSpot|T
Microsoft Office|T|ms office|office 365|microsoft 365|m365|ms office programlari*
Microsoft PowerPoint|T|powerpoint
Microsoft Dynamics|T|dynamics 365
AutoCAD|T
SolidWorks|T
SPSS|T|ibm spss
Jupyter|T|jupyter notebook
WordPress|T
Shopify|T
Magento|T
Unity|T|unity3d
Unreal Engine|T|~Unreal
Android|F|android sdk
iOS|F|~iOS
Windows Server|O
VMware|O|vsphere|esxi
Cisco|T|cisco ios
Wireshark|T
Burp Suite|T
Metasploit|T
Zabbix|O
Nagios|O
SIEM|N
Agile|M|agile methodologies|agile methodology|cevik*
Scrum|M
Kanban|M
Waterfall|M
Lean|M|~Lean
SAFe|M|~SAFe|scaled agile
Six Sigma|M|lean six sigma|alti sigma*
ITIL|M|itil v4
OKR|M|~OKR|okrs
KPI|N|~KPI|~KPIs|key performance indicators
Code Review|M|code reviews|kod inceleme*|kod gozden gecirme*
Pair Programming|M
Design Thinking|M
SDLC|M|software development life cycle|software development lifecycle|yazilim gelistirme yasam dongusu*
Version Control|M|versiyon kontrol*|surum kontrol*
Requirements Analysis|N|gereksinim analizi*|requirements gathering|ihtiyac analizi*
AWS Certified Solutions Architect|X|aws solutions architect|aws certified solutions architect associate
AWS Certified Developer|X|aws developer associate
AWS Certified Cloud Practitioner|X|cloud practitioner
Microsoft Certified: Azure Fundamentals|X|az-900|azure fundamentals
Microsoft Certified: Azure Administrator|X|az-104|azure administrator
CKA|X|certified kubernetes administrator
CKAD|X|certified kubernetes application developer
OCP|X|oracle certified professional
PMP|X|project management professional
PRINCE2|X|prince 2
CSM|X|certified scrummaster|certified scrum master
PSM|X|professional scrum master|psm i
ISTQB|X|istqb foundation|istqb certified tester
CISSP|X
CEH|X|certified ethical hacker
CompTIA Security+|X|security+|comptia security plus
CCNA|X
CCNP|X
CPA|X|certified public accountant
CFA|X|chartered financial analyst
ACCA|X
SMMM|X|serbest muhasebeci mali musavir*
CISA|X
Machine Learning|N|~ML|makine ogrenme*|machine-learning
Deep Learning|N|derin ogrenme*
Artificial Intelligence|N|~AI|yapay zeka*|yapay zeka
NLP|N|natural language processing|dogal dil isleme*
Computer Vision|N|goruntu isleme*|bilgisayarli goru*
LLM|N|large language models|large language model|llms
Generative AI|N|genai|gen ai|uretken yapay zeka*
Data Analysis|N|data analytics|veri analiz*|data analyst
Data Science|N|veri bilim*
Data Engineering|N|veri muhendisligi*
Big Data|N|buyuk veri*
ETL|N|elt|etl pipelines|extract transform load
Data Warehouse|N|data warehousing|veri ambari*|data lake
Data Visualization|N|veri gorsellestirme*|data visualisation
Business Intelligence|N|~BI|is zekasi*
Statistics|N|statistical analysis|istatistik*
A/B Testing|N|a/b test*|ab testing|split testing
Cybersecurity|N|cyber security|information security|siber guvenlik*|bilgi guvenligi*|infosec
Penetration Testing|N|pentest|pentesting|penetration test*|sizma test*
Network Security|N|ag guvenligi*
OWASP|N|owasp top 10
Fintech|N|financial technology
Banking|N|bankacilik*|banking domain
Payment Systems|N|payments|payment processing|odeme sistem*
E-commerce|N|ecommerce|e-ticaret*|eticaret*|e ticaret*
Blockchain|N|web3
SaaS|N|~SaaS|software as a service
Embedded Systems|N|embedded software|gomulu sistem*|gomulu yazilim*
IoT|N|~IoT|internet of things|nesnelerin interneti*
Mobile Development|N|mobile app development|mobil uygulama gelistirme*|mobil gelistirme*
Web Development|N|web gelistirme*|web application development
Software Development|N|yazilim gelistirme*|software engineering|yazilim muhendisligi*
Backend Development|N|backend|back-end|back end|backend development|arka uc*
Frontend Development|N|frontend|front-end|front end|frontend development|on yuz*
Full Stack|N|fullstack|full-stack|full stack development
UX Design|N|~UX|user experience|ux design|ux research|kullanici deneyimi*
UI Design|N|~UI|user interface design|ui design|ui/ux|kullanici arayuzu*
Responsive Design|N|responsive web design|duyarli tasarim*
Accessibility|N|wcag|a11y|erisilebilirlik*
SEO|N|search engine optimization|arama motoru optimizasyonu*
SEM|N|search engine marketing
Digital Marketing|N|dijital pazarlama*|online marketing
Content Marketing|N|icerik pazarlama*|content strategy
Social Media Marketing|N|social media management|sosyal medya yonetimi*|sosyal medya pazarlama*
Performance Marketing|N|performans pazarlama*
CRM|N|customer relationship management|musteri iliskileri yonetimi*
ERP|N|enterprise resource planning|kurumsal kaynak planlama*
Project Management|N|proje yonetimi*|project planning|proje planlama*
Product Management|N|urun yonetimi*|product ownership
Program Management|N|program yonetimi*
Stakeholder Management|N|paydas yonetimi*|stakeholder communication|paydas iletisimi*
Budgeting|N|budget management|budget planning|butce yonetimi*|butce planlama*|butceleme*
Forecasting|N|financial forecasting|tahminleme*|demand forecasting|talep tahmini*
Financial Analysis|N|finansal analiz*|financial modeling|financial modelling|finansal modelleme*
Financial Reporting|N|finansal raporlama*|mali raporlama*
Accounting|N|muhasebe*|general ledger|genel muhasebe*
IFRS|N|ufrs|tfrs|international financial reporting standards
US GAAP|N|gaap
Auditing|N|audit|internal audit|ic denetim*|denetim*
Taxation|N|tax|vergi mevzuat*|vergi beyan*
Payroll|N|bordro*
Risk Management|N|risk yonetimi*|risk analysis|risk analizi*
Compliance|N|regulatory compliance|mevzuat uyum*|uyum yonetimi*
AML|N|anti-money laundering|kara para*
KYC|N|know your customer
Procurement|N|purchasing|satin alma*|satinalma*|sourcing
Supply Chain Management|N|supply chain|tedarik zinciri*
Logistics|N|lojistik*
Inventory Management|N|stok yonetimi*|stok kontrol*|envanter yonetimi*|inventory control
Warehouse Management|N|depo yonetimi*|wms
Import/Export|N|foreign trade|dis ticaret*|ithalat*|ihracat*|international trade
Customs|N|gumruk*|customs clearance
B2B Sales|N|b2b|b2b satis*|kurumsal satis*
B2C|N|b2c satis*
Business Development|N|is gelistirme*
Key Account Management|N|key account|kilit musteri*|anahtar musteri*
Account Management|N|musteri portfoy yonetimi*
Lead Generation|N|lead gen|potansiyel musteri*
Negotiation|N|muzakere*|pazarlik*
Customer Success|N|musteri basarisi*
Customer Service|N|customer support|musteri hizmetleri*|musteri destek*
Customer Relations|N|musteri iliskileri*|client relations|client relationship management
Market Research|N|pazar arastirma*|market analysis|pazar analizi*
Sales Management|N|satis yonetimi*|sales strategy|satis stratejisi*
Recruitment|N|talent acquisition|recruiting|ise alim*|yetenek kazanimi*
Human Resources|N|~HR|insan kaynaklari*|hr management
Onboarding|N|oryantasyon*|ise alistirma*
Performance Management|N|performans yonetimi*|performance appraisal
Training & Development|N|learning and development|~L&D|egitim ve gelisim*
Employee Relations|N|calisan iliskileri*
Quality Assurance|N|~QA|kalite guvence*
Quality Control|N|~QC|kalite kontrol*
ISO 9001|X|iso9001
ISO 27001|X|iso27001|iso/iec 27001
Lean Manufacturing|N|yalin uretim*
Production Planning|N|uretim planlama*|production scheduling
Process Improvement|N|surec iyilestirme*|continuous improvement|surekli iyilestirme*|kaizen
Business Analysis|N|is analizi*|business analyst|is analisti*
Process Management|N|surec yonetimi*|business process management|~BPM
Operations Management|N|operasyon yonetimi*|operations management
Team Leadership|N|team lead|team leadership|takim liderligi*|ekip liderligi*|ekip yonetimi*|takim yonetimi*|people management
Public Relations|N|halkla iliskiler*
Event Management|N|etkinlik yonetimi*|organizasyon yonetimi*
Copywriting|N|metin yazarligi*
Graphic Design|N|grafik tasarim*
Video Editing|N|video montaj*|video kurgu*
Technical Writing|N|teknik dokumantasyon*|technical documentation|teknik yazarlik*
Translation|N|ceviri*|tercume*|localization|lokalizasyon*
Communication Skills|S|communication|communication skills|verbal communication|written communication|iletisim becerileri*|etkili iletisim*|iletisim yetenegi*|guclu iletisim*
Problem Solving|S|problem-solving|problem solving|problem solver|problem cozme*|sorun cozme*
Teamwork|S|team player|teamwork|team work|team-oriented|takim calismasi*|ekip calismasi*|takim oyuncusu*
Collaboration|S|collaboration|collaborative|cross-functional collaboration|cross functional collaboration|isbirligi*|is birligi*
Leadership|S|leadership|leadership skills|liderlik*
Mentoring|S|mentoring|mentorship|mentor*|mentorluk*|kocluk*|coaching
Stakeholder Management|S|stakeholder management|stakeholder communication|managing stakeholders|paydas yonetimi*|paydaslarla iletisim*
Time Management|S|time management|prioritization|prioritisation|zaman yonetimi*|onceliklendirme*
Analytical Thinking|S|analytical skills|analytical thinking|analytical mindset|analitik dusunme*|analitik beceri*|analitik bakis*
Critical Thinking|S|critical thinking|elestirel dusunme*
Attention to Detail|S|attention to detail|detail-oriented|detail oriented|detay odakli*|detaylara onem*|detaylara dikkat*
Adaptability|S|adaptability|flexibility|adaptable|uyum saglama*|uyum yetenegi*|esneklik*
Customer Focus|S|customer focus|customer-focused|customer focused|customer-centric|customer centric|customer-oriented|client-focused|musteri odakli*|musteri odaklilik*
Ownership|S|ownership|sense of ownership|accountability|sahiplenme*|sorumluluk alma*
Presentation Skills|S|presentation skills|sunum becerileri*|sunum yetenegi*|public speaking|topluluk onunde konusma*
Negotiation|S|negotiation|negotiation skills|muzakere*|pazarlik becerisi*
Creativity|S|creativity|creative thinking|yaraticilik*|yaratici dusunme*
Conflict Resolution|S|conflict resolution|conflict management|catisma yonetimi*|catisma cozme*
Decision Making|S|decision making|decision-making|karar verme*
Interpersonal Skills|S|interpersonal skills|interpersonal|kisilerarasi iliski*|kisiler arasi iliski*
Emotional Intelligence|S|emotional intelligence|duygusal zeka*
Organizational Skills|S|organizational skills|organisational skills|organizasyon becerisi*|planlama becerisi*
Software Engineer|R|yazilim muhendisi*
Software Developer|R|yazilim gelistirici*|yazilim uzmani*
Full Stack Developer|R|full stack developer|full-stack developer|fullstack developer|full stack engineer|full-stack engineer|full stack software developer|full stack yazilim gelistirici*|full stack gelistirici*
Backend Developer|R|back-end developer|backend engineer|back-end engineer|backend software engineer|backend gelistirici*|backend yazilim gelistirici*
Frontend Developer|R|front-end developer|frontend engineer|front-end engineer|frontend gelistirici*|front-end gelistirici*
Java Developer|R|java software engineer|java engineer|java gelistirici*|java yazilim gelistirici*
Mobile Developer|R|mobile engineer|android developer|ios developer|mobil uygulama gelistirici*|mobil gelistirici*
DevOps Engineer|R|devops muhendisi*|devops uzmani*
Data Scientist|R|veri bilimci*
Data Analyst|R|veri analisti*
Data Engineer|R|veri muhendisi*
QA Engineer|R|test engineer|qa automation engineer|software test engineer|test muhendisi*|test uzmani*|qa muhendisi*
Product Manager|R|urun yoneticisi*|product owner|urun sahibi*
Project Manager|R|proje yoneticisi*|proje muduru*
Business Analyst|R|is analisti*
UX Designer|R|ui/ux designer|ux/ui designer|product designer|urun tasarimcisi*
Scrum Master|R
Solutions Architect|R|solution architect|cozum mimari*
Software Architect|R|yazilim mimari*
Engineering Manager|R|muhendislik muduru*
Tech Lead|R|technical lead|teknik lider*|takim lideri*
Sales Manager|R|satis muduru*|satis yoneticisi*
Accountant|R|muhasebeci*|muhasebe uzmani*
Financial Analyst|R|finansal analist*|mali analist*
HR Specialist|R|insan kaynaklari uzmani*|ik uzmani*|hr business partner|recruiter
Marketing Manager|R|pazarlama muduru*|pazarlama yoneticisi*
Digital Marketing Specialist|R|dijital pazarlama uzmani*
Logistics Specialist|R|lojistik uzmani*
System Administrator|R|sysadmin|sistem yoneticisi*|system engineer|sistem muhendisi*
Network Engineer|R|ag muhendisi*|network uzmani*
Security Analyst|R|cyber security analyst|siber guvenlik uzmani*|soc analyst
Cloud Engineer|R|cloud architect|bulut muhendisi*
Machine Learning Engineer|R|ml engineer|makine ogrenmesi muhendisi*
`

export type KwEntry = {
  term: string
  group: KwGroup
  /** Katlanmış, harfe duyarsız takma adlar. */
  aliases: { text: string; prefix: boolean }[]
  /** Harfe duyarlı (orijinal metin) takma adlar. */
  cs: string[]
}

export const KW_ENTRIES: KwEntry[] = []
const BY_TERM: Record<string, KwEntry> = {}

RAW.split('\n').forEach((row) => {
  const parts = row.trim().split('|')
  if (parts.length < 2) return
  const [term, g, ...rest] = parts
  const entry: KwEntry = { term, group: G[g] || 'domain', aliases: [], cs: [] }
  let canonCs = false
  const seen: Record<string, true> = {}
  const add = (a: string) => {
    const raw = a.trim()
    if (!raw) return
    if (raw.charAt(0) === '~') {
      const v = raw.slice(1)
      if (v === term) canonCs = true
      entry.cs.push(v)
      return
    }
    const prefix = raw.charAt(raw.length - 1) === '*'
    const text = fold(prefix ? raw.slice(0, -1) : raw)
    if (seen[text]) return
    seen[text] = true
    entry.aliases.push({ text, prefix })
  }
  rest.forEach(add)
  if (!canonCs) add(term)
  KW_ENTRIES.push(entry)
  BY_TERM[fold(term)] = entry
})

export function entryByTerm(term: string): KwEntry | undefined {
  return BY_TERM[fold(term)]
}

/* ---------------------------------- tarama ---------------------------------- */

export type TermHit = { entry: KwEntry; start: number; end: number }

function leftOk(src: string, i: number, short: boolean): boolean {
  if (i === 0) return true
  const p = src.charAt(i - 1)
  if (isWordChar(p)) return false
  if ((p === '.' || p === '#' || p === '+') && isWordChar(src.charAt(i - 2))) return false
  if (short && (p === '-' || p === '/' || p === '&') && isWordChar(src.charAt(i - 2))) return false
  return true
}

function rightOk(src: string, j: number, short: boolean): boolean {
  if (j >= src.length) return true
  const n = src.charAt(j)
  if (isWordChar(n) || n === '+' || n === '#') return false
  if (n === '.' && isWordChar(src.charAt(j + 1))) return false
  if (short && (n === '-' || n === '&' || n === '/') && isWordChar(src.charAt(j + 1))) return false
  return true
}

function prefixOk(src: string, j: number): boolean {
  // Türkçe ek en fazla ~8 harf olabilir ("mikroservislerimizde")
  let k = j
  while (k < src.length && isWordChar(src.charAt(k))) k++
  return k - j <= 9
}

/**
 * Metindeki sözlük terimlerini bulur. Çakışan eşleşmelerde uzun olan kazanır; unvan
 * (role) eşleşmeleri diğer terimleri bloklamaz ("Java Developer" → Java da sayılır).
 */
export function scanTerms(original: string, folded?: string): TermHit[] {
  const f = folded ?? fold(original)
  const raw: TermHit[] = []
  for (let e = 0; e < KW_ENTRIES.length; e++) {
    const entry = KW_ENTRIES[e]
    for (let a = 0; a < entry.aliases.length; a++) {
      const al = entry.aliases[a]
      const short = al.text.length <= 2
      let from = f.indexOf(al.text)
      while (from >= 0) {
        const to = from + al.text.length
        if (leftOk(f, from, short) && (al.prefix ? prefixOk(f, to) : rightOk(f, to, short))) {
          raw.push({ entry, start: from, end: to })
        }
        from = f.indexOf(al.text, from + 1)
      }
    }
    for (let c = 0; c < entry.cs.length; c++) {
      const v = entry.cs[c]
      const short = v.length <= 2
      let from = original.indexOf(v)
      while (from >= 0) {
        const to = from + v.length
        if (leftOk(original, from, short) && rightOk(original, to, short)) raw.push({ entry, start: from, end: to })
        from = original.indexOf(v, from + 1)
      }
    }
  }
  if (raw.length < 2) return raw
  raw.sort((x, y) => y.end - y.start - (x.end - x.start) || x.start - y.start)
  const kept: TermHit[] = []
  const keptBlocking: TermHit[] = []
  const keptRoles: TermHit[] = []
  for (const h of raw) {
    const pool = h.entry.group === 'role' ? keptRoles : keptBlocking
    let clash = false
    for (const k of pool) {
      if (h.start < k.end && k.start < h.end) {
        clash = true
        break
      }
    }
    if (clash) continue
    pool.push(h)
    kept.push(h)
  }
  kept.sort((x, y) => x.start - y.start)
  return kept
}

export function countTerms(hits: TermHit[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const h of hits) out[h.entry.term] = (out[h.entry.term] || 0) + 1
  return out
}

/* ------------------------------ iş ilanı çıkarımı ------------------------------ */

const STOP =
  'a an the and or but if of to in on at by for with from as is are was were be been being this that these those it its we our you your they their them he she his her i me my us will would can could should shall may might must do does did done have has had having not no nor so than too very just also such via per etc about into over under within without across between through during before after above below up down out off again further then once here there when where why how all any both each few more most other some own same only well new use using used able ability who whom which what whose while' +
  ' ve veya ile icin gibi da de ki bu su o bir biz siz onlar olan olarak olmak olup ise ama fakat ancak cok daha en her hem ya yada ayrica kadar sonra once uzerinde uzere icinde arasinda gore dair olan olanlar olmasi sahip tercihen tercih sebebi nedeni konusunda alaninda yonelik iliskin icerisinde sayesinde birlikte tum butun bazi hangi nasil neden nerede bizim sizin onun kendi mi mu var yok degil'
const GENERIC =
  'experience experienced years year yrs team teams work working works job role position candidate candidates company companies client clients customer customers business ability skills skill knowledge strong solid good great excellent proven understanding familiarity familiar proficiency proficient requirements requirement responsibilities responsibility qualifications qualification preferred plus bonus nice looking seeking join opportunity environment culture benefits salary office remote hybrid based location full time part including include includes etc degree bachelor master related field equivalent minimum least least product products service services solution solutions project projects development develop developing developer developers engineer engineers engineering software application applications system systems technology technologies tools tool platform platforms support help ensure make build building maintain maintaining design designing implement implementing create creating manage managing management high quality level levels best practices practice day days world global leading fast growing growth mission people members member across multiple various within new modern key core major large scale scalable robust reliable efficient effective strong written verbal english turkish fluent communication written must required requires required' +
  ' deneyim deneyimli tecrube tecrubeli yil yillik is isler ekip ekibi ekibimize takim pozisyon pozisyonu pozisyonumuz aday adaylar sirket sirketimiz firma firmamiz musteri bilgi bilgisi bilgili sahibi sahip olan iyi guclu yetkin yetkinlik beceri becerisi nitelikler nitelikli aranan gerekli zorunlu tercihen avantaj arti gorev gorevler sorumluluk sorumluluklar calisma calisacak calismak alan alaninda lisans mezun mezunu universite universitelerin bolum bolumlerinden ilgili muhendislik gelistirme gelistirmek gelistiren yazilim sistem sistemleri proje projeler uygulama uygulamalar teknoloji teknolojiler cozum hizmet yuksek seviye seviyede konusunda konularinda turkce ingilizce iletisim olmak olan'

const STOP_SET: Record<string, true> = {}
;(STOP + ' ' + GENERIC).split(/\s+/).forEach((w) => w && (STOP_SET[w] = true))

const REQ_HEADER = /^(?:requirements?|qualifications?|required|must have|must-haves?|what you(?:'| wi)ll? (?:need|bring)|what we(?:'re| are) looking for|who you are|minimum qualifications|basic qualifications|required skills|aranan nitelikler|genel nitelikler|nitelikler|beklentilerimiz|gereksinimler|aranan ozellikler|is tanimi ve nitelikler|olmazsa olmazlar)\b/
const NICE_HEADER = /^(?:nice to have|nice-to-have|preferred(?: qualifications)?|bonus(?: points)?|pluses|it(?:'s| is|'d be) a plus|good to have|tercih sebebi|tercih nedeni|tercihen|avantaj saglayacak|arti olarak)\b/
const OTHER_HEADER = /^(?:responsibilities|about (?:us|the role|the company|you)|what you(?:'| wi)ll do|benefits|perks|what we offer|the role|job description|is tanimi|sorumluluklar|gorev tanimi|hakkimizda|neler sunuyoruz|yan haklar|sirket hakkinda)\b/
const REQ_INLINE =
  /\b(?:must|required|requires|requirement|proficien\w*|strong|solid|expert\w*|hands-on|in-depth|deep knowledge|knowledge of|experience (?:with|in)|mandatory|essential|at least|minimum|gerekli|zorunlu|hakim|deneyimli|tecrubeli|bilgi sahibi|olmazsa olmaz|aranan|en az|yetkin|iyi derecede|ileri derecede)\b/
const NICE_INLINE = /\b(?:nice to have|a plus|is a plus|bonus|preferred|advantage\w*|desirable|tercih sebebi|tercih nedeni|tercihen|avantaj\w*|arti)\b/

export type ExtractedKeyword = {
  term: string
  importance: 'high' | 'medium' | 'low'
  group: string
  /** Kişisel yetkinlik (soft skill) mi? Hard skill eşleşme oranına katılmaz. */
  soft: boolean
  entry?: KwEntry
  /** Sözlük dışı terimler için katlanmış arama metni. */
  key: string
}

/** İlandaki anahtar kelimeleri önem sırasıyla çıkarır. */
export function extractJobKeywords(jd: string, jobTitle?: string): ExtractedKeyword[] {
  const text = (jd || '').replace(/\r/g, '')
  if (!text.trim()) return []
  const folded = fold(text)
  const lines = folded.split('\n')

  // satır bazında bağlam: gereklilik / tercih / nötr
  const lineMode: ('req' | 'nice' | 'neutral')[] = []
  let mode: 'req' | 'nice' | 'neutral' = 'neutral'
  const lineStarts: number[] = []
  let off = 0
  for (const l of lines) {
    lineStarts.push(off)
    off += l.length + 1
    const t = l.replace(/^[\s•\-*▪–·●]+/, '').trim()
    const short = t.split(/\s+/).length <= 7 && t.length <= 60
    if (short && REQ_HEADER.test(t)) mode = 'req'
    else if (short && NICE_HEADER.test(t)) mode = 'nice'
    else if (short && OTHER_HEADER.test(t)) mode = 'neutral'
    let m = mode
    if (NICE_INLINE.test(t)) m = 'nice'
    else if (REQ_INLINE.test(t)) m = 'req'
    lineMode.push(m)
  }
  const lineOf = (pos: number): number => {
    let lo = 0
    let hi = lineStarts.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (lineStarts[mid] <= pos) lo = mid
      else hi = mid - 1
    }
    return lo
  }

  const titleF = fold(jobTitle || '')
  const hits = scanTerms(text, folded)
  type Agg = { entry: KwEntry; count: number; req: number; nice: number; neutral: number; first: number }
  const agg: Record<string, Agg> = {}
  const covered: [number, number][] = []
  for (const h of hits) {
    covered.push([h.start, h.end])
    const a = agg[h.entry.term] || (agg[h.entry.term] = { entry: h.entry, count: 0, req: 0, nice: 0, neutral: 0, first: h.start })
    a.count++
    a[lineMode[lineOf(h.start)]]++
  }

  const out: (ExtractedKeyword & { score: number; first: number })[] = []
  for (const k of Object.keys(agg)) {
    const a = agg[k]
    const soft = a.entry.group === 'soft'
    const inTitle = titleF && a.entry.aliases.some((al) => titleF.indexOf(al.text) >= 0)
    const score = a.count + a.req * 2 + (inTitle ? 3 : 0)
    let importance: 'high' | 'medium' | 'low'
    if (a.nice > 0 && a.req === 0 && a.neutral === 0 && !inTitle) importance = 'low'
    else if (a.req > 0 || a.count >= 2 || inTitle) importance = 'high'
    else importance = 'medium'
    out.push({ term: a.entry.term, importance, group: a.entry.group, soft, entry: a.entry, key: fold(a.entry.term), score, first: a.first })
  }

  // sözlük dışı sık geçen ifadeler (1–3 kelime)
  const isCovered = (s: number, e: number) => covered.some(([cs, ce]) => s < ce && cs < e)
  const uni: Record<string, { n: number; pos: number; req: boolean }> = {}
  const bi: Record<string, { n: number; pos: number; req: boolean }> = {}
  const tokRe = /[a-z][a-z0-9]{2,}/g
  const segRe = /[^,.;:!?()\/|•\n"]+/g
  let seg: RegExpExecArray | null
  while ((seg = segRe.exec(folded))) {
    const base = seg.index
    const toks: { w: string; s: number; e: number }[] = []
    let m: RegExpExecArray | null
    tokRe.lastIndex = 0
    while ((m = tokRe.exec(seg[0]))) toks.push({ w: m[0], s: base + m.index, e: base + m.index + m[0].length })
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i]
      const ok = !STOP_SET[t.w] && t.w.length >= 4 && !isCovered(t.s, t.e)
      if (!ok) continue
      const req = lineMode[lineOf(t.s)] === 'req'
      const u = uni[t.w] || (uni[t.w] = { n: 0, pos: t.s, req: false })
      u.n++
      u.req = u.req || req
      const nx = toks[i + 1]
      if (nx && !STOP_SET[nx.w] && nx.w.length >= 3 && !isCovered(nx.s, nx.e) && /^\s+$/.test(folded.slice(t.e, nx.s))) {
        const key = t.w + ' ' + nx.w
        const b = bi[key] || (bi[key] = { n: 0, pos: t.s, req: false })
        b.n++
        b.req = b.req || req
      }
    }
  }
  const extra: (ExtractedKeyword & { score: number; first: number })[] = []
  const display = (pos: number, len: number) => text.slice(pos, pos + len).replace(/\s+/g, ' ')
  Object.keys(bi).forEach((k) => {
    const b = bi[k]
    if (b.n >= 2) extra.push({ term: display(b.pos, k.length), importance: b.n >= 3 || b.req ? 'medium' : 'low', group: 'other', soft: false, key: k, score: b.n + 0.5, first: b.pos })
  })
  Object.keys(uni).forEach((k) => {
    const u = uni[k]
    if (u.n >= 3 && !extra.some((x) => x.key.indexOf(k) >= 0)) {
      extra.push({ term: display(u.pos, k.length), importance: u.n >= 4 && u.req ? 'medium' : 'low', group: 'other', soft: false, key: k, score: u.n, first: u.pos })
    }
  })
  extra.sort((a, b) => b.score - a.score || a.first - b.first)

  const rank = { high: 0, medium: 1, low: 2 }
  const all = out.concat(extra.slice(0, 6))
  all.sort((a, b) => rank[a.importance] - rank[b.importance] || b.score - a.score || a.first - b.first)
  return all.slice(0, 40).map(({ term, importance, group, soft, entry, key }) => ({ term, importance, group, soft, entry, key }))
}

const ROLE_WORD =
  /\b(?:developer|engineer|architect|manager|specialist|analyst|consultant|lead|designer|director|administrator|scientist|tester|intern|officer|coordinator|assistant|executive|representative|accountant|programmer|technician|owner|master|head|recruiter|associate|gelistirici\w*|muhendis\w*|uzman\w*|yonetici\w*|mudur\w*|analist\w*|danisman\w*|tasarimci\w*|stajyer\w*|sorumlu\w*|sefi?\w*|koordinator\w*|asistan\w*|temsilci\w*|muhasebeci\w*|mimar\w*|lider\w*|teknisyen\w*|operator\w*|elemani?\w*)\b/

/** İlandan hedef unvanı çıkarır ("We are looking for a Senior X", "X pozisyonu için", ilk satır). */
export function extractJobTitle(jd: string): string {
  const text = (jd || '').replace(/\r/g, '').trim()
  if (!text) return ''
  const folded = fold(text)
  const cut = (pos: number, len: number) =>
    text
      .slice(pos, pos + len)
      .replace(/^[\s:–\-"'“]+|[\s,.;:!"'”)–\-]+$/g, '')
      .replace(/\s+/g, ' ')
  const tryPattern = (re: RegExp, group: number, stopRe: RegExp): string => {
    const m = re.exec(folded)
    if (!m) return ''
    const start = m.index + m[0].indexOf(m[group])
    let seg = m[group]
    const stop = seg.search(stopRe)
    if (stop > 0) seg = seg.slice(0, stop)
    const w = seg.trim().split(/\s+/)
    if (w.length > 6) seg = w.slice(0, 6).join(' ')
    const res = cut(start, seg.length)
      .replace(/^(?:an?\s+)?(?:experienced|talented|passionate|motivated|skilled|highly skilled|driven|dedicated|seasoned|enthusiastic|new|dynamic)\s+/i, '')
      .replace(/^(?:firmamiz|firmamız|şirketimiz|sirketimiz|ekibimiz|ekibimize|bünyemiz\S*|bunyemiz\S*|kurumumuz)\s+(?:için|icin|de|da|bünyesinde)?\s*/i, '')
    return ROLE_WORD.test(fold(res)) ? res.charAt(0).toLocaleUpperCase('tr-TR') + res.slice(1) : ''
  }
  const firstLine = (): string => {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
    for (const l of lines.slice(0, 2)) {
      const w = l.split(/\s+/)
      if (w.length <= 7 && l.length <= 70 && !/[.!?]$/.test(l) && ROLE_WORD.test(fold(l))) return l.replace(/[:\-–|]+$/, '').trim()
    }
    return ''
  }
  const EN_STOP = /\s(?:to|who|with|for|in|at|that|which|and join|based|on|from)\s|[,.;:!()\n]/
  const TR_STOP = /[,.;:!()\n]/
  const r =
    tryPattern(/(?:job title|position|role|title|pozisyon|unvan|kadro)\s*:\s*([^\n]{3,80})/, 1, TR_STOP) ||
    tryPattern(/(?:looking for|seeking|hiring|searching for|recruiting)\s+(?:an?\s+|our next\s+|a talented\s+|an experienced\s+)?([^\n]{3,80})/, 1, EN_STOP) ||
    tryPattern(/(?:join (?:us|our team) as)\s+(?:an?\s+)?([^\n]{3,80})/, 1, EN_STOP) ||
    firstLine() ||
    tryPattern(/(?:^|\n|\.\s)([^\n.]{3,70}?)\s+(?:pozisyonu(?:nda|na|muz| icin)?|kadrosu|olarak calisacak|arayisimiz|ariyoruz|alimi)/, 1, /$^/)
  return r
}

/* ----------------------------- unvan karşılaştırma ----------------------------- */

const TITLE_NOISE: Record<string, true> = {}
'senior sr junior jr mid middle level kidemli uzman i ii iii iv of the and ve a an to for icin remote hybrid principal staff'.split(' ').forEach((w) => (TITLE_NOISE[w] = true))
const TITLE_SYN: Record<string, string> = {
  developer: 'dev', engineer: 'dev', programmer: 'dev', gelistirici: 'dev', gelistiricisi: 'dev', muhendis: 'dev', muhendisi: 'dev',
  yazilim: 'software', fullstack: 'full stack', 'full-stack': 'full stack', backend: 'back end', 'back-end': 'back end',
  frontend: 'front end', 'front-end': 'front end', yonetici: 'manager', yoneticisi: 'manager', muduru: 'manager', mudur: 'manager',
  analist: 'analyst', analisti: 'analyst', tasarimci: 'designer', tasarimcisi: 'designer', mimar: 'architect', mimari: 'architect',
  lider: 'lead', lideri: 'lead', proje: 'project', urun: 'product', veri: 'data', bilimci: 'scientist', uzmani: 'specialist',
  pazarlama: 'marketing', satis: 'sales', muhasebe: 'accounting', muhasebeci: 'accountant', test: 'qa', tester: 'qa',
}

function titleTokens(s: string): string[] {
  const out: string[] = []
  fold(s)
    .replace(/[^a-z0-9#+.\- ]+/g, ' ')
    .split(/\s+/)
    .forEach((w) => {
      if (!w || TITLE_NOISE[w]) return
      const syn = TITLE_SYN[w] || w
      syn.split(' ').forEach((x) => {
        if (out.indexOf(x) < 0) out.push(x)
      })
    })
  return out
}

/** CV unvanı hedef unvanla örtüşüyor mu? (kıdem kelimeleri yok sayılır, eş anlamlılar birleştirilir) */
export function titlesMatch(cvTitle: string, target: string): boolean {
  const a = titleTokens(cvTitle)
  const b = titleTokens(target)
  if (!a.length || !b.length) return false
  let common = 0
  for (const t of b) if (a.indexOf(t) >= 0) common++
  return common / b.length >= 0.6
}
