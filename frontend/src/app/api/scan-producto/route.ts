import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY no configurada. Agregala en frontend/.env.local (dev) o en la variable de entorno del contenedor (Docker).' },
      { status: 500 }
    );
  }
  const client = new Anthropic({ apiKey });

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
              text: `Sos un asistente para Zamoritos Agroveterinaria (Uruguay). Analizá esta imagen de un producto y respondé ÚNICAMENTE con JSON válido (sin markdown, sin explicaciones):

{
  "nombre": "nombre completo incluyendo marca, variante y tamaño (ej: LAGER Premium Adultos 22kg)",
  "marca": "marca del fabricante (ej: Lager, Nutrapet, Matisse, Bravecto)",
  "peso": número o null (peso/volumen del envase en la unidad indicada, ej: 22, 7.5, 1),
  "unidad_medida": "kg", "g", "lt", "ml" o "unidad" según corresponda,
  "categoria_sugerida": clasifica en una de estas opciones exactas: "Alimento Perros", "Alimento Gatos", "Alimento Húmedo y Snacks", "Alimento Aves y Granja", "Antiparasitarios", "Medicamentos", "Arena Sanitaria", "Bandejas y Accesorios Sanitarios", "Collares", "Correas y Arneses", "Juguetes", "Comederos y Bebederos", "Higiene y Belleza", "Ropa para Mascotas", "Camas y Descanso", "Peines y Grooming", "Artículos del Hogar y Jardín", "Control de Plagas", "Transporte", "Rascadores", "Accesorios Varios",
  "codigo_barras": "código EAN visible en la imagen o null",
  "descripcion_breve": "descripción corta útil para el vendedor, máx 80 caracteres (ej: Alimento seco adultos todas las razas, enriquecido con Omega 3)"
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
