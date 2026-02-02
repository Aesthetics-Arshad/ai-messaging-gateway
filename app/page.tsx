import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto flex h-screen max-w-6xl flex-col px-6 py-10 md:px-10">
        <header className="flex items-center justify-between border-b border-white/5 pb-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">AI Messaging Gateway</h1>
            <p className="mt-1 text-sm text-slate-400">
              Orchestrated AI across WhatsApp, Telegram, Instagram and more.
            </p>
          </div>
          <nav className="flex gap-2 text-sm">
            <Link
              href="/chat"
              className="rounded-full bg-emerald-500 px-4 py-2 font-medium text-slate-950 shadow-sm hover:bg-emerald-400"
            >
              Open Chat
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full border border-white/10 px-4 py-2 text-slate-100 hover:bg-white/5"
            >
              Dashboard
            </Link>
          </nav>
        </header>

        <section className="mt-12 grid flex-1 gap-10 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="flex flex-col justify-center">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl lg:text-5xl">
              Chat with your users,
              <span className="text-emerald-400"> everywhere</span>.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300 md:text-base">
              A single AI gateway that understands context, runs tools, and replies across all your messaging
              channels. Built for fast experiments and production workloads.
            </p>

            <div className="mt-8 flex flex-wrap gap-3 text-sm">
              <Link
                href="/chat"
                className="rounded-lg bg-emerald-500 px-5 py-2.5 font-medium text-slate-950 shadow-sm hover:bg-emerald-400"
              >
                Start chatting
              </Link>
              <Link
                href="/dashboard"
                className="rounded-lg border border-white/10 px-5 py-2.5 text-slate-100 hover:bg-white/5"
              >
                View message analytics
              </Link>
            </div>

            <div className="mt-8 grid max-w-md grid-cols-2 gap-4 text-xs text-slate-300 md:text-sm">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-emerald-300">Connected platforms</div>
                <div className="mt-1 text-slate-200">WhatsApp · Telegram · Instagram</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-emerald-300">Planned</div>
                <div className="mt-1 text-slate-200">LinkedIn · Snapchat</div>
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <div className="w-full rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-xl backdrop-blur">
              <div className="flex items-center justify-between border-b border-white/10 pb-3 text-xs text-slate-400">
                <span className="font-mono text-[11px] uppercase tracking-wide">Live preview</span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" /> Connected
                </span>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-xl bg-emerald-500 px-3 py-2 text-xs text-slate-950 md:text-sm">
                    How are my users interacting across channels today?
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-xs md:text-sm">
                    I’ve summarized 128 recent conversations across WhatsApp and Telegram. Top themes:
                    onboarding questions, pricing, and feature comparisons.
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-xl border border-dashed border-emerald-400/60 bg-slate-900 px-3 py-2 text-xs md:text-sm text-emerald-200">
                    Connect your own channels and fine‑tune the workflow in the dashboard.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="mt-8 border-t border-white/5 pt-4 text-xs text-slate-500">
          <span>AI Messaging Gateway · Chat UI at </span>
          <code className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-slate-200">/chat</code>
        </footer>
      </div>
    </main>
  );
}