import { NextRequest, NextResponse } from 'next/server';
import { ingestDocument } from '@/lib/agents/rag';
import { sql } from '@/lib/db';

export const runtime = 'nodejs'; // Use Node.js runtime for file handling

export async function POST(request: NextRequest) {
  try {
    console.log('📁 Upload request received');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      console.log('❌ No file provided');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log(`📄 File: ${file.name}, Size: ${file.size}, Type: ${file.type}`);

    // Only accept text files
    const allowedTypes = ['text/plain', 'text/markdown', 'application/octet-stream'];
    const isTextFile = file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.json');
    
    if (!isTextFile && !allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Only .txt, .md, or .json files allowed' }, { status: 400 });
    }

    // Read file content
    const bytes = await file.arrayBuffer();
    const text = new TextDecoder().decode(bytes);
    
    if (!text.trim()) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    console.log(`📝 File content length: ${text.length} characters`);

    // Ingest to Pinecone
    const chunkCount = await ingestDocument(text, { 
      source: file.name,
    });

    // Track in database
    await sql`
  INSERT INTO documents (filename, chunk_count)
  VALUES (${file.name}, ${chunkCount})
`;

    console.log(`✅ Upload complete: ${chunkCount} chunks`);

    return NextResponse.json({
      success: true,
      message: `Processed ${chunkCount} chunks from ${file.name}`,
      filename: file.name,
      chunks: chunkCount
    });
    
  } catch (error: any) {
    console.error('❌ Upload error:', error);
    return NextResponse.json({ 
      error: 'Upload failed', 
      details: error.message 
    }, { status: 500 });
  }
}