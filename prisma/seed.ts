import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

let connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL!
connectionString = connectionString.replace(/[?&]pgbouncer=true/gi, '').replace(/\?$/, '')

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter } as any)

const SITI = [
  {
    nome: 'Bruciaessenze.it',
    dominio: 'bruciaessenze.it',
    wpSiteUrl: 'https://www.bruciaessenze.it',
    wpUsername: 'User_hub',
    wpAppPassword: 'Fqx3 pydm ZXBn iW2a NjSX Rksz',
    categorie: [
      'Profumatori d\'ambiente',
      'Oli essenziali',
      'Candele',
      'Diffusori',
      'Aromaterapia',
      'Prodotti benessere',
      'Regali e idee regalo',
    ],
    istruzioni: `Sito e-commerce specializzato in profumatori d'ambiente, oli essenziali e prodotti per il benessere olfattivo della casa.

TONO E STILE:
- Caldo, evocativo e sensoriale — usa descrizioni che richiamano profumi, sensazioni, atmosfere
- Italiano corretto e fluente, mai troppo tecnico
- Approccio lifestyle: il prodotto non è solo un oggetto ma un'esperienza
- Evita un tono eccessivamente commerciale o promozionale

CONTENUTO:
- Parla sempre dei benefici pratici ed emotivi dei profumi
- Menziona l'uso nella vita quotidiana (mattina, sera, meditazione, ospiti)
- Suggerisci abbinamenti tra prodotti quando pertinente
- Fai riferimento a materiali naturali, ingredienti botanici, artigianalità
- Puoi citare tradizioni e culture (es. rito del tè giapponese, profumi provenzali)

KEYWORDS RILEVANTI:
bruciaessenze, oli essenziali, profumatore ambiente, diffusore aromi, candele profumate, aromaterapia casa, benessere olfattivo

DA EVITARE:
- Affermazioni mediche o terapeutiche non verificabili
- Comparazioni esplicite con concorrenti
- Linguaggio eccessivamente tecnico-chimico`,
  },
  {
    nome: 'Pulashock.it',
    dominio: 'pulashock.it',
    wpSiteUrl: 'https://www.pulashock.it',
    wpUsername: 'Editor',
    wpAppPassword: 'CdRe F4ZX kWCo v6Qg TIZP lTDq',
    categorie: [
      'Amplificatori e DAC',
      'Cuffie e auricolari',
      'Diffusori e speaker',
      'Giradischi e vinile',
      'Streaming e sorgenti digitali',
      'Libri di musica',
      'Libri hi-fi e audio',
      'Accessori audio',
    ],
    istruzioni: `Sito e-commerce specializzato in hi-fi, audio di alta qualità, musica e libri dedicati all'ascolto e alla cultura musicale.

TONO E STILE:
- Appassionato, competente e rispettoso dell'audiofilo — parla da esperto a esperto
- Italiano preciso, mai pedante; accessibile anche ai neofiti curiosi
- Evoca emozioni legate all'ascolto: timbrica, spazialità, dettaglio, calore analogico
- Puoi usare termini tecnici (THD, imaging, soundstage, jitter) ma spiegali brevemente

CONTENUTO:
- Approfondisci il contesto: storia del formato, tecnologia del prodotto, artisti di riferimento
- Per libri: parla di autore, argomento trattato, a chi è rivolto
- Suggerisci abbinamenti di sistema (es. giradischi + testina + phono stage)
- Fai riferimento a generi musicali specifici quando pertinente (jazz, classica, rock analogico)
- Cita dischi o registrazioni iconiche come esempi d\'ascolto

KEYWORDS RILEVANTI:
hi-fi italiano, audiofilo, amplificatore valvolare, cuffie ad alta fedeltà, giradischi, vinile, libri musica, alta fedeltà

DA EVITARE:
- Affermazioni tecniche non verificabili ("il migliore sul mercato")
- Tono puramente commerciale o da scheda prodotto
- Semplificazioni eccessive che sminuiscono la profondità del mondo hi-fi`,
  },
]

async function main() {
  console.log('Seeding siti...')
  for (const sito of SITI) {
    await prisma.sito.upsert({
      where: { dominio: sito.dominio },
      update: sito,
      create: sito,
    })
    console.log(`✓ ${sito.nome}`)
  }
  console.log('Seed completato.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
