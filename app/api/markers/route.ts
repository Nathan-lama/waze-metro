import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const markers = await prisma.marker.findMany();
  return NextResponse.json(markers);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { lat, lng } = body;
  if (typeof lat === 'number' && typeof lng === 'number') {
    await prisma.marker.create({
      data: { lat, lng }
    });
    return NextResponse.json({ message: 'Signalement ajouté' }, { status: 201 });
  } else {
    return NextResponse.json({ error: 'Coordonnées manquantes ou invalides' }, { status: 400 });
  }
}
