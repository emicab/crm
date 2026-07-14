import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Solo se valida la seguridad en producción
  if (process.env.NODE_ENV === 'production') {
    const appSecret = process.env.APP_SECRET;
    
    // Si la clave secreta está definida en el entorno, validamos la cabecera
    if (appSecret) {
      const incomingSecret = request.headers.get('x-app-secret');
      const { pathname } = request.nextUrl;

      // Permitir assets estáticos necesarios para renderizar páginas de error o la app
      if (
        pathname.startsWith('/_next/') || 
        pathname.startsWith('/static/') || 
        pathname.startsWith('/favicon.ico') || 
        pathname.startsWith('/ClinPOS.png') ||
        pathname.startsWith('/IgniteCRM.png')
      ) {
        return NextResponse.next();
      }

      if (incomingSecret !== appSecret) {
        const clientIp = request.headers.get('x-forwarded-for') || 'desconocido';
        console.warn(`[Security] Bloqueado intento de acceso externo a ${pathname} desde ${clientIp}`);
        
        // Si es una petición de API, devolvemos JSON
        if (pathname.startsWith('/api/')) {
          return new NextResponse(
            JSON.stringify({ success: false, error: 'Access Denied' }),
            { status: 403, headers: { 'content-type': 'application/json' } }
          );
        }
        
        // Si es una página normal, devolvemos un HTML simple y elegante
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

  return NextResponse.next();
}

// Configuración de rutas a las que aplica el middleware
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
