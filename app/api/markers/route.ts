import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET() {
  try {
    const markers = await prisma.marker.findMany();
    return NextResponse.json(markers);
  } catch (error) {
    console.error('Error fetching markers:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lat, lng, type } = body;

    // Validation des données
    if (
      typeof lat !== 'number' ||
      typeof lng !== 'number' ||
      typeof type !== 'string' ||
      type.trim() === ''
    ) {
      console.error('Invalid data received:', body);
      return NextResponse.json(
        { error: 'Données invalides. Vérifiez lat, lng, et type.' },
        { status: 400 }
      );
    }

    // Sauvegarde dans la base de données
    const marker = await prisma.marker.create({
      data: {
        lat,
        lng,
        type,
      },
    });

    return NextResponse.json(marker, { status: 201 });
  } catch (error) {
    console.error('Error creating marker:', error);

    // Vérifier si l'erreur est liée à Prisma
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma error code:', error.code);
      console.error('Prisma error message:', error.message);
    }

    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
