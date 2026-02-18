import { NextResponse } from 'next/server';

export function middleware(request) {
  const host = request.headers.get('host') || '';

  if (host.startsWith('admin.')) {
    return NextResponse.rewrite(new URL('/admin', request.url));
  }
  if (host.startsWith('judge.')) {
    return NextResponse.rewrite(new URL('/judge', request.url));
  }
  if (host.startsWith('moderator.')) {
    return NextResponse.rewrite(new URL('/moderator', request.url));
  }
  if (host.startsWith('participant.')) {
    return NextResponse.rewrite(new URL('/participant', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
