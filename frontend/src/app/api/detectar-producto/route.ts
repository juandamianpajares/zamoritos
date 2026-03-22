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

  const prompt = `Sos un asistente para una tienda de mascotas en Uruguay (Zamoritos Agroveterinaria).
Analizá la foto del producto y extraé los siguientes datos en formato JSON.
Si no podés determinar un campo con certeza, dejalo como null.

Campos a extraer:
- nombre: nombre comercial del producto (string)
- marca: marca del producto (string)
- codigo_barras: código de barras EAN si es visible (string)
- peso: peso o volumen numérico en la unidad indicada (number)
- unidad_medida: "kg", "g", "lt", "ml", "unidad" según corresponda (string)
- categoria: una de: ALIMENTOS, SNACK, HIGIENE, ESTETICA, LIMPIEZA, VENENO, COMEDEROS, PASEO, ROPA, VARIOS (string)
- descripcion_breve: descripción corta útil para el empleado (string, max 100 chars)

Respondé SOLO con el JSON, sin texto adicional ni bloques de código.
Ejemplo de respuesta:
{"nombre":"Lager Adulto 10kg","marca":"LAGER","codigo_barras":"7730918030044","peso":10,"unidad_medida":"kg","categoria":"ALIMENTOS","descripcion_breve":"Alimento seco para perros adultos todas las razas"}`;

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
