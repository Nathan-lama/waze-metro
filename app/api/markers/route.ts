import { NextResponse } from 'next/server';

type Marker = {
  lat: number;
  lng: number;
  timestamp: string;
};

let markers: Marker[] = [];

export async function GET() {
  return NextResponse.json(markers);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { lat, lng } = body;
  if (typeof lat === 'number' && typeof lng === 'number') {
    const timestamp = new Date().toISOString();
    markers.push({ lat, lng, timestamp });
    return NextResponse.json({ message: 'Signalement ajouté' }, { status: 201 });
  } else {
    return NextResponse.json({ error: 'Coordonnées manquantes ou invalides' }, { status: 400 });
  }
}
