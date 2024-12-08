import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const markers = await prisma.marker.findMany();
  return NextResponse.json(markers);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lat, lng, type } = body;
    
    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'Coordonnées manquantes' }, 
        { status: 400 }
      );
    }

    const marker = await prisma.marker.create({
      data: {
        lat,
        lng,
        type: type || 'controleur' // Valeur par défaut si non fournie
      }
    });

    return NextResponse.json(marker, { status: 201 });
  } catch (error) {
    console.error('Error creating marker:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
