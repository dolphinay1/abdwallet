import { NextResponse } from 'next/server';

/**
 * Kill-switch endpoint — signals a breach or panic condition.
 * Returns a redirect target so the client can navigate away immediately.
 */
export async function POST() {
  return NextResponse.json({
    status: 'wiped',
    redirect: process.env.NEXT_PUBLIC_EXTERNAL_LINK || 'https://www.google.com',
  });
}

export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
