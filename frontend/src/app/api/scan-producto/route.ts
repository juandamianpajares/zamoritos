import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('imagen') as File | null;
    if (!file) return NextResponse.json({ error: 'No se recibió imagen' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const mediaType = (file.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            {
              type: 'text',
              text: `Analizá esta imagen de un producto veterinario/mascotas y respondé ÚNICAMENTE con JSON válido (sin markdown, sin explicaciones), con estos campos exactos:

{
  "nombre": "nombre completo del producto incluyendo marca, variante y tamaño/peso (ej: LAGER Premium Adultos 22kg)",
  "marca": "marca del producto (ej: Lager, Nutrapet, Matisse)",
  "peso": número o null (peso del envase en kg como número, ej: 22, 7.5, 1),
  "unidad_medida": "kg" o "unidad",
  "categoria_sugerida": una de estas opciones exactas: "Alimento Perros", "Alimento Gatos", "Alimento Aves y Granja", "Arena Sanitaria", "Antiparasitarios", "Higiene y Belleza", "Collares", "Correas y Arneses", "Comederos y Bebederos", "Alimento Húmedo y Snacks",
  "codigo_barras": "código de barras visible en la imagen o null si no se ve"
}

Solo devolvé el JSON, nada más.`,
            },
          ],
        },
      ],
    });

    const raw = (message.content[0] as { type: string; text: string }).text.trim();
    // Strip markdown code fences if present
    const clean = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const data = JSON.parse(clean);

    return NextResponse.json(data);
  } catch (err) {
    console.error('scan-producto error:', err);
    return NextResponse.json({ error: 'Error al analizar la imagen' }, { status: 500 });
  }
}
