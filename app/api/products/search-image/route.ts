import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query || !query.trim()) {
      return NextResponse.json(
        { message: 'Par\u00e1metro de b\u00fasqueda requerido' },
        { status: 400 },
      );
    }

    const mlRes = await fetch(
      'https://api.mercadolibre.com/sites/MLA/search?q=' + encodeURIComponent(query) + '&limit=12',
      { headers: { Accept: 'application/json' } },
    );

    if (!mlRes.ok) {
      throw new Error('Mercado Libre API error: ' + mlRes.status);
    }

    const mlData = await mlRes.json();
    const results = mlData.results || [];

    if (results.length === 0) {
      return NextResponse.json(
        { message: 'No se encontraron im\u00e1genes en Mercado Libre para ese producto.' },
        { status: 404 },
      );
    }

    const candidates = results.map((item: any) => {
      const hdUrl = (item.thumbnail || '')
        .replace(/http:/, 'https:')
        .replace(/-I\.jpg$/, '-O.jpg')
        .replace(/-V\.jpg$/, '-O.jpg');
      return {
        id: item.id,
        title: item.title,
        imageUrl: hdUrl,
        thumbnail: item.thumbnail,
      };
    });

    return NextResponse.json({ candidates }, { status: 200 });
  } catch (error: any) {
    console.error('ML search error:', error);
    return NextResponse.json(
      { message: error.message || 'Error al buscar im\u00e1genes en Mercado Libre' },
      { status: 500 },
    );
  }
}