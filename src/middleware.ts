import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: ['/api/:path*'],
};

export function middleware(req: NextRequest) {
  const expected = process.env.CF_ORIGIN_SECRET;

  // Güvenlik valfi: env tanımlı değilse kontrol yapma (kilitlenmeyi önler)
  if (!expected) return NextResponse.next();

  const got = req.headers.get('x-cf-origin-secret');
  if (got !== expected) {
    return NextResponse.json(
      { error: 'Direct origin access denied' },
      { status: 403 }
    );
  }

  return NextResponse.next();
}
