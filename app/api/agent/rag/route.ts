import { NextRequest, NextResponse } from 'next/server';
import { queryPinecone } from '@/lib/agents/rag';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * RAG query endpoint.
 * POST { query: string, topK?: number }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = String(body?.query ?? '').trim();
    const topK = Number(body?.topK ?? 3);

    if (!query) {
      return NextResponse.json({ error: 'Missing `query`' }, { status: 400 });
    }

    const results = await queryPinecone(query, Number.isFinite(topK) ? topK : 3);
    return NextResponse.json({ query, results });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'RAG query failed', details: error?.message ?? String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Simple health probe endpoint
  return NextResponse.json({ ok: true, endpoint: '/api/agent/rag' });
}

