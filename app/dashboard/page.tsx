'use client';

export default function Dashboard() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:px-8">
        <header className="flex flex-col justify-between gap-3 border-b border-white/5 pb-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Messaging Gateway Overview
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Two messaging platforms are live. Additional channels are being integrated.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs md:text-sm">
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-300">
              ● System healthy
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1 text-slate-200">
              Chat UI at <code className="text-[11px]">/chat</code>
            </span>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-[minmax(0,2.3fr)_minmax(0,1.7fr)]">
          {/* Platforms card */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-100 md:text-base">
                    Messaging platforms
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Telegram and WhatsApp are active. Other channels are in progress.
                  </p>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <div>2 active</div>
                  <div className="text-slate-500">3 in progress</div>
                </div>
              </div>
              <div className="grid gap-3 text-xs md:grid-cols-2 md:text-sm">
                <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/5 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-50">Telegram</span>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300">
                      Active
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-300">
                    Incoming webhook and outbound bot messaging are configured.
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/5 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-50">WhatsApp</span>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300">
                      Active
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-300">
                    Connected via API. Outgoing replies are sent as text messages.
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-900 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-200">Instagram</span>
                    <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-[11px] text-amber-200">
                      In progress
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Webhook endpoint is in place. Authentication and messaging flow still to be completed.
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-900 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-200">LinkedIn &amp; Snapchat</span>
                    <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-[11px] text-amber-200">
                      In progress
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Outbound messaging helpers exist; inbound webhook flows are being wired up.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-xs text-slate-200 shadow-sm md:text-sm">
              <h2 className="text-sm font-semibold text-slate-100 md:text-base">System components</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div>
                  <div className="text-xs font-medium text-slate-300">AI Brain</div>
                  <p className="mt-1 text-xs text-slate-400">
                    Groq-powered reasoning with planner, tools, and strict RAG rules.
                  </p>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-300">RAG &amp; storage</div>
                  <p className="mt-1 text-xs text-slate-400">
                    Pinecone for vectors, Neon Postgres for conversations, Upstash Redis for cache.
                  </p>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-300">Background jobs</div>
                  <p className="mt-1 text-xs text-slate-400">
                    Inngest functions handle async processing and periodic clean-up.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Webhook / API card */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-xs text-slate-200 shadow-sm md:text-sm">
              <h2 className="text-sm font-semibold text-slate-100 md:text-base">Webhook endpoints</h2>
              <p className="mt-1 text-xs text-slate-400">
                Use these URLs when configuring platform webhooks and messaging integrations.
              </p>
              <div className="mt-3 space-y-2 font-mono text-[11px] md:text-xs">
                <div className="rounded-lg bg-slate-900 px-3 py-2">
                  Telegram&nbsp;&nbsp;→ <span className="text-emerald-200">/api/webhook/telegram</span>
                </div>
                <div className="rounded-lg bg-slate-900 px-3 py-2">
                  WhatsApp&nbsp;&nbsp;→ <span className="text-emerald-200">/api/webhook/whatsapp</span>
                </div>
                <div className="rounded-lg bg-slate-900 px-3 py-2">
                  Instagram&nbsp;→ <span className="text-slate-300">/api/webhook/instagram</span>
                </div>
                <div className="rounded-lg bg-slate-900 px-3 py-2">
                  LinkedIn&nbsp;&nbsp;&nbsp;→ <span className="text-slate-300">/api/webhook/linkedin</span>
                </div>
                <div className="rounded-lg bg-slate-900 px-3 py-2">
                  Snapchat&nbsp;→ <span className="text-slate-300">/api/webhook/snapchat</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-xs text-slate-200 shadow-sm md:text-sm">
              <h2 className="text-sm font-semibold text-slate-100 md:text-base">Next steps</h2>
              <ul className="mt-2 space-y-1 text-xs text-slate-400">
                <li>• Connect more documents via the RAG upload panel on the chat screen.</li>
                <li>• Point Telegram and WhatsApp webhooks to the URLs above.</li>
                <li>• Monitor conversations and iterate on prompts and tools.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}