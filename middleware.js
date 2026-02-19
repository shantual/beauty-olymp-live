import { NextResponse } from 'next/server';

export function middleware(request) {
  const host = request.headers.get('host') || '';

  // Поддомены
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

  // 🔵 Основной домен: не трогаем главную, кроме случаев когда токен уже есть
if (host === '1olymp.ru' || host === 'www.1olymp.ru') {
  const url = request.nextUrl;

  // если человек открыл именно "/", не переписываем на /participant
  if (url.pathname === '/') {
    return NextResponse.next();
  }

  // остальные пути на основном домене оставляем как есть
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
