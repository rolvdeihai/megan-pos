// src/app/auth/logout/route.js
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ message: 'Logged out' });
  
  // Clear auth cookie
  response.cookies.delete('megan_pos_auth');
  
  return response;
}