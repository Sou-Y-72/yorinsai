import { NextResponse } from 'next/server';
import { findNearestLocation } from '@/lib/travel';

export async function POST(request: Request) {
  try {
    const { latitude, longitude } = await request.json();
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { error: 'Invalid latitude or longitude' },
        { status: 400 }
      );
    }

    const nearestLocation = findNearestLocation(latitude, longitude);
    return NextResponse.json({ nearestLocation, latitude, longitude });
  } catch (error) {
    console.error('Error finding nearest location:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
