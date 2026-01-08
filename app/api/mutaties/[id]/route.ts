import { NextRequest, NextResponse } from 'next/server';
import { deleteMutatie } from '@/lib/db-supabase';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json({ 
        success: false,
        error: 'Ongeldig mutatie ID' 
      }, { status: 400 });
    }

    await deleteMutatie(id);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Mutatie succesvol verwijderd'
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/mutaties/[id]:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Fout bij verwijderen mutatie' 
    }, { status: 500 });
  }
}

