import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Manejo global de CORS preflight (OPTIONS) para permitir llamadas desde ClinStore / Ngrok / Vercel
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-app-secret, ngrok-skip-browser-warning',
      },
    });
  }

  // Rutas públicas y de API que deben ser accesibles desde la Tienda Web y Webhooks de Mercado Pago
  const isPublicRoute =
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/ClinPOS.png') ||
    pathname.startsWith('/IgniteCRM.png') ||
    pathname.startsWith('/api/web-orders') ||
    pathname.startsWith('/api/webhooks/') ||
    pathname.startsWith('/api/mercadopago/') ||
    pathname.startsWith('/api/store-config') ||
    pathname.startsWith('/api/products') ||
    pathname.startsWith('/api/categories') ||
    pathname.startsWith('/api/coupons/') ||
    pathname.startsWith('/api/sync') ||
    pathname.startsWith('/api/mp/');

  if (isPublicRoute) {
    const res = NextResponse.next();
    res.headers.set('Access-Control-Allow-Origin', '*');
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-app-secret, ngrok-skip-browser-warning');
    return res;
  }

  // Solo se valida la seguridad interna de escritorio en producción
  if (process.env.NODE_ENV === 'production') {
    const appSecret = process.env.APP_SECRET;

    if (appSecret) {
      const incomingSecretHeader = request.headers.get('x-app-secret');
      const incomingSecretCookie = request.cookies.get('app_auth_token')?.value;
      const urlToken = request.nextUrl.searchParams.get('_token');

      // Si el token de Tauri viene por query string y es válido, lo guardamos en cookie
      if (urlToken === appSecret) {
        const url = request.nextUrl.clone();
        url.searchParams.delete('_token');
        const response = NextResponse.redirect(url);

        response.cookies.set('app_auth_token', appSecret, {
          httpOnly: true,
          secure: false, // Localhost
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 365, // 1 año
        });
        return response;
      }

      // Si no coincide la cookie ni la cabecera, denegamos el acceso a pantallas privadas de la app
      if (incomingSecretHeader !== appSecret && incomingSecretCookie !== appSecret) {
        const clientIp = request.headers.get('x-forwarded-for') || 'desconocido';
        console.warn(`[Security] Bloqueado intento de acceso externo a ${pathname} desde ${clientIp}`);

        if (pathname.startsWith('/api/')) {
          return new NextResponse(
            JSON.stringify({ success: false, error: 'Access Denied' }),
            { status: 403, headers: { 'content-type': 'application/json' } }
          );
        }

        return new NextResponse(
          `<!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>Acceso Denegado - ClinPOS</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #090d16; color: #f3f4f6; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                .card { background-color: #111827; border: 1px solid #1f2937; padding: 2.5rem; border-radius: 1rem; text-align: center; max-width: 400px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
                h1 { color: #f43f5e; margin-top: 0; font-size: 1.5rem; }
                p { color: #9ca3af; font-size: 0.95rem; line-height: 1.5; }
              </style>
            </head>
            <body>
              <div class="card">
                <h1>Acceso Denegado</h1>
                <p>Este servidor local está protegido y sólo responde a las peticiones del panel oficial de ClinPOS desktop.</p>
              </div>
            </body>
          </html>`,
          { status: 403, headers: { 'content-type': 'text/html' } }
        );
      }
    }
  }

  const res = NextResponse.next();
  res.headers.set('Access-Control-Allow-Origin', '*');
  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
