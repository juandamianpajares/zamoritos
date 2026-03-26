import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  const { imageBase64, mediaType } = await req.json();

  if (!imageBase64) {
    return NextResponse.json({ error: 'Se requiere una imagen.' }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API key de Anthropic no configurada.' }, { status: 500 });
  }

  const client = new Anthropic({ apiKey });

  const prompt = `Sos un asistente para Zamoritos Agroveterinaria (Uruguay). Analizá la foto del producto y respondé SOLO con JSON válido, sin markdown ni texto adicional.

Campos:
- nombre: nombre completo incluyendo marca, variante y tamaño (ej: "LAGER Premium Adultos 22kg")
- marca: marca del fabricante (ej: "Lager", "Nutrapet", "Matisse", "Bravecto")
- codigo_barras: código EAN visible en el envase o null
- peso: número o null (peso/volumen del envase en la unidad indicada)
- unidad_medida: "kg", "g", "lt", "ml" o "unidad"
- categoria_sugerida: una de estas opciones exactas: "Alimento Perros", "Alimento Gatos", "Alimento Húmedo y Snacks", "Alimento Aves y Granja", "Antiparasitarios", "Medicamentos", "Arena Sanitaria", "Bandejas y Accesorios Sanitarios", "Collares", "Correas y Arneses", "Juguetes", "Comederos y Bebederos", "Higiene y Belleza", "Ropa para Mascotas", "Camas y Descanso", "Peines y Grooming", "Artículos del Hogar y Jardín", "Control de Plagas", "Transporte", "Rascadores", "Accesorios Varios"
- descripcion_breve: descripción útil para el vendedor, máx 80 caracteres

Ejemplo: {"nombre":"Lager Adulto 10kg","marca":"LAGER","codigo_barras":"7730918030044","peso":10,"unidad_medida":"kg","categoria_sugerida":"Alimento Perros","descripcion_breve":"Alimento seco perros adultos todas las razas"}`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: (mediaType ?? 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: imageBase64,
              },
            },
            { type: 'text', text: prompt },
          ],
        },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const parsed = JSON.parse(text.trim());
    return NextResponse.json(parsed);
  } catch (e: unknown) {
    const msg = e instanceof SyntaxError ? 'La IA no devolvió JSON válido.' : (e as Error).message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
