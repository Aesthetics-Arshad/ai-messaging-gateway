import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Small discovery endpoint so /api/agent doesn't 404 in production.
 * Helpful when integrating external systems that probe endpoints.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    routes: {
      ragQuery: '/api/agent/rag',
      ingest: '/api/ingest',
      chatStream: '/api/chat/stream',
    },
  });
}

