import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const index = pinecone.index(process.env.PINECONE_INDEX!);

// SAFE chunking - no infinite loops
function safeChunkText(text: string, maxSize: number = 500): string[] {
  if (!text || text.length === 0) return [];
  
  // If text is small, return as single chunk
  if (text.length <= maxSize) {
    return [text.trim()];
  }
  
  // For larger text, split by sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxSize) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }
  
  if (currentChunk) chunks.push(currentChunk.trim());
  
  // If still no chunks (edge case), force split
  if (chunks.length === 0) {
    for (let i = 0; i < text.length; i += maxSize) {
      chunks.push(text.slice(i, i + maxSize).trim());
    }
  }
  
  return chunks.filter(c => c.length > 10); // Only keep substantial chunks
}

// Mock embedding (deterministic, fast)
function mockEmbed(text: string): number[] {
  const vec = new Array(384).fill(0);
  for (let i = 0; i < Math.min(text.length, 1000); i++) {
    vec[i % 384] = (text.charCodeAt(i) % 100) / 100;
  }
  // Normalize
  const mag = Math.sqrt(vec.reduce((a, b) => a + b*b, 0));
  return mag > 0 ? vec.map(v => v / mag) : vec;
}

export async function ingestDocument(text: string, metadata: { source: string }): Promise<number> {
  console.log(`[RAG] Start: ${metadata.source}, length: ${text.length}`);
  
  try {
    const chunks = safeChunkText(text, 500);
    console.log(`[RAG] Created ${chunks.length} chunk(s)`);
    
    if (chunks.length === 0) {
      throw new Error('Could not chunk text');
    }

    // Limit to first 5 chunks for speed
    const limitedChunks = chunks.slice(0, 5);
    
    for (let i = 0; i < limitedChunks.length; i++) {
      console.log(`[RAG] Processing chunk ${i + 1}/${limitedChunks.length}...`);
      
      await index.upsert([{
        id: `${metadata.source}-${i}-${Date.now()}`,
        values: mockEmbed(limitedChunks[i]),
        metadata: {
          text: limitedChunks[i],
          source: metadata.source,
        },
      }]);
      
      console.log(`[RAG] Chunk ${i + 1} uploaded`);
    }
    
    console.log(`[RAG] Done: ${limitedChunks.length} chunks uploaded`);
    return limitedChunks.length;
    
  } catch (error) {
    console.error('[RAG] Error:', error);
    throw error;
  }
}

export async function queryPinecone(query: string, topK = 3) {
  try {
    console.log('[RAG] Query:', query.substring(0, 50));
    
    const results = await index.query({
      vector: mockEmbed(query),
      topK,
      includeMetadata: true,
    });

    return results.matches?.map((m: any) => ({
      text: String(m.metadata?.text || ''),
      source: String(m.metadata?.source || 'Unknown'),
      score: Number(m.score || 0),
    })) || [];
    
  } catch (error) {
    console.error('[RAG] Query error:', error);
    return [];
  }
}