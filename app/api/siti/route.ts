import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const siti = await prisma.sito.findMany({
    select: {
      id: true,
      nome: true,
      dominio: true,
      categorie: true,
      wpSiteUrl: true,
      // non esponiamo credenziali WP al client
    },
    orderBy: { nome: 'asc' },
  })
  return NextResponse.json({ siti })
}
