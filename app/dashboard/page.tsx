'use client';

import { useState } from 'react';

export default function Dashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setResult(data);
    } catch (error) {
      setResult({ error: 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-8">AI Messaging Gateway Dashboard</h1>
      
      {/* Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {[
          { name: 'Telegram', status: 'Active', color: 'green' },
          { name: 'WhatsApp', status: 'Pending Setup', color: 'yellow' },
          { name: 'Instagram', status: 'Pending Setup', color: 'yellow' },
          { name: 'LinkedIn', status: 'Pending Setup', color: 'yellow' },
          { name: 'Snapchat', status: 'Pending Setup', color: 'yellow' },
          { name: 'AI Brain', status: 'Operational', color: 'green' },
        ].map((platform) => (
          <div key={platform.name} className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">{platform.name}</h2>
            <span className={`inline-block px-2 py-1 rounded text-sm ${
              platform.color === 'green' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              ● {platform.status}
            </span>
          </div>
        ))}
      </div>

      {/* Knowledge Base Upload */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">Upload Knowledge Base</h2>
        <p className="text-gray-600 mb-4">
          Upload .txt or .md files to train your AI assistant. The AI will use this information to answer questions.
        </p>
        
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <input
              type="file"
              accept=".txt,.md"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          
          <button
            type="submit"
            disabled={!file || uploading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {uploading ? 'Uploading...' : 'Upload & Train'}
          </button>
        </form>

        {result && (
          <div className={`mt-4 p-4 rounded ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
            {result.success ? (
              <p className="text-green-700">
                ✅ Successfully processed {result.chunks} chunks from {result.filename}
              </p>
            ) : (
              <p className="text-red-700">❌ {result.error}</p>
            )}
          </div>
        )}
      </div>

      {/* API Endpoints */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Webhook Endpoints</h2>
        <div className="space-y-2 font-mono text-sm">
          <div className="p-2 bg-gray-50 rounded">Telegram: /api/webhook/telegram</div>
          <div className="p-2 bg-gray-50 rounded">WhatsApp: /api/webhook/whatsapp</div>
          <div className="p-2 bg-gray-50 rounded">Instagram: /api/webhook/instagram</div>
          <div className="p-2 bg-gray-50 rounded">LinkedIn: /api/webhook/linkedin</div>
          <div className="p-2 bg-gray-50 rounded">Snapchat: /api/webhook/snapchat</div>
        </div>
      </div>
    </div>
  );
}