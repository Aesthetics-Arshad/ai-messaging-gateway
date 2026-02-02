import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">AI Messaging Gateway</h1>
      <p className="text-lg mb-8">100% Free AI-powered multi-platform messaging</p>
      
      <div className="flex gap-4">
        <Link href="/dashboard" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Open Dashboard
        </Link>
      </div>
      
      <div className="mt-12 grid grid-cols-2 gap-4 text-sm text-gray-600">
        <div>✓ WhatsApp</div>
        <div>✓ Telegram</div>
        <div>✓ Instagram</div>
        <div>◦ LinkedIn</div>
        <div>◦ Snapchat</div>
      </div>
    </main>
  );
}