// src/app/api/send-email/route.ts

import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_EMAIL_URL || process.env.GOOGLE_APPS_SCRIPT_EMAIL_URL;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('Email request:', body);

    if (!GOOGLE_APPS_SCRIPT_URL) {
      console.warn('⚠️ GAS URL not configured, logging only');
      console.log('Email would be sent:', JSON.stringify(body, null, 2));
      return NextResponse.json({ 
        success: true, 
        warning: 'Email service not configured - logged only',
        logged: true 
      });
    }

    console.log('Proxying email to GAS:', body.type, 'to:', body.email);

    try {
      const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('GAS returned non-JSON:', text.substring(0, 500));
        // Fallback: log email and return success
        console.log('Email logged (GAS failed):', JSON.stringify(body, null, 2));
        return NextResponse.json({ 
          success: true, 
          warning: 'GAS error, email logged only',
          logged: true 
        });
      }

      const result = await response.json();
      console.log('GAS response:', result);
      return NextResponse.json(result);
      
    } catch (gasError) {
      console.error('GAS fetch error:', gasError);
      // Fallback: log email and return success
      console.log('Email logged (GAS unavailable):', JSON.stringify(body, null, 2));
      return NextResponse.json({ 
        success: true, 
        warning: 'GAS unavailable, email logged only',
        logged: true 
      });
    }
  } catch (error: any) {
    console.error('Email proxy error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
