import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ message: 'Logged out' });
  response.cookies.delete('megan_pos_staff');
  return response;
}
