import { NextRequest, NextResponse } from 'next/server';
import { getMutatiesByPartijId, getPartijen } from '@/lib/db-provider';
import { buildPartijExportFilename } from '@/lib/export-partij-overzicht-shared';
import { buildPartijOverzichtXlsxBuffer } from '@/lib/export-partij-overzicht-xlsx';

export async function POST(
  request: NextRequest,
  { params }: { params: { partij_id: string } }
) {
  try {
    const partijId = parseInt(params.partij_id, 10);
    if (isNaN(partijId)) {
      return NextResponse.json({ error: 'Ongeldig partij ID' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const yearsRaw = Array.isArray(body.years) ? body.years : [];
    const years = yearsRaw
      .map((y: unknown) => Number(y))
      .filter((y: number) => Number.isInteger(y) && y > 1900 && y < 3000)
      .sort((a: number, b: number) => a - b);

    if (years.length === 0) {
      return NextResponse.json({ error: 'Selecteer minstens één jaartal' }, { status: 400 });
    }

    const [partijen, mutaties] = await Promise.all([
      getPartijen(),
      getMutatiesByPartijId(partijId),
    ]);

    const partij = partijen.find((p) => p.id === partijId);
    const partijInfo = partij
      ? { nummer: partij.nummer, naam: partij.naam, type: partij.type }
      : {
          nummer: mutaties[0]?.partij_nummer,
          naam: mutaties[0]?.partij_naam,
          type: mutaties[0]?.partij_type,
        };

    const buffer = await buildPartijOverzichtXlsxBuffer(partijInfo, mutaties, years);
    const filename = buildPartijExportFilename(partijInfo, years, 'xlsx');
    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    console.error('Error in POST /api/fust-overzicht/[partij_id]/export:', error);
    const message = error instanceof Error ? error.message : 'Fout bij exporteren';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
