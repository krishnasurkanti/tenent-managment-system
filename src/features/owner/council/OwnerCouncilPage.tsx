"use client";

import { useMemo, useState } from "react";
import {
  BrainCircuit,
  CheckCircle2,
  Clipboard,
  Compass,
  Download,
  Eye,
  FileText,
  Hammer,
  Lightbulb,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { OwnerPageHero } from "@/components/ui/owner-page";

type Advisor = {
  key: string;
  name: string;
  style: string;
  position: string;
  icon: typeof BrainCircuit;
  accent: string;
  response: string;
};

const advisorSeed: Omit<Advisor, "response">[] = [
  {
    key: "contrarian",
    name: "Contrarian",
    style: "Finds what will fail, what is missing, and what could become expensive.",
    position: "Downside first",
    icon: ShieldAlert,
    accent: "border-rose-400/25 bg-rose-500/10 text-rose-100",
  },
  {
    key: "first-principles",
    name: "First Principles",
    style: "Asks what problem is actually being solved and strips away assumptions.",
    position: "Root cause",
    icon: Compass,
    accent: "border-sky-400/25 bg-sky-500/10 text-sky-100",
  },
  {
    key: "expansionist",
    name: "Expansionist",
    style: "Looks for the bigger opportunity, adjacent upside, and hidden leverage.",
    position: "Upside first",
    icon: Sparkles,
    accent: "border-amber-300/25 bg-amber-400/10 text-amber-100",
  },
  {
    key: "outsider",
    name: "Outsider",
    style: "Responds with fresh eyes and catches confusing assumptions.",
    position: "Clarity check",
    icon: Eye,
    accent: "border-violet-300/25 bg-violet-500/10 text-violet-100",
  },
  {
    key: "executor",
    name: "Executor",
    style: "Cares about the fastest real-world test and Monday morning action.",
    position: "Action path",
    icon: Hammer,
    accent: "border-emerald-300/25 bg-emerald-500/10 text-emerald-100",
  },
];

const examples = [
  "Should I raise rent for premium rooms next month?",
  "Should I hire a warden or build automation first?",
  "Should I offer a discount to fill vacant beds quickly?",
];

function sentence(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function buildCouncil(question: string, context: string) {
  const cleanQuestion = sentence(question) || "Should I make this hostel decision now?";
  const cleanContext =
    sentence(context) ||
    "No extra context was entered. Treat this as a hostel owner decision where being wrong can affect occupancy, rent collection, staff workload, or tenant trust.";
  const framedQuestion = `Decision: ${cleanQuestion}

Context from the owner: ${cleanContext}

Workspace context: Katha is a hostel and tenant management app for owners. Relevant business pressure usually includes room occupancy, monthly rent collection, tenant satisfaction, staff effort, and owner cash flow.

Stakes: a wrong decision can reduce occupancy, create payment friction, increase manual follow-up, or damage trust with tenants and parents.`;

  const advisors: Advisor[] = advisorSeed.map((advisor) => ({
    ...advisor,
    response: makeAdvisorResponse(advisor.key, cleanQuestion, cleanContext),
  }));

  const reviews = [
    {
      reviewer: "Contrarian reviewer",
      strongest: "Response E",
      blindSpot: "Response C",
      missed: "Nobody quantified the cash buffer needed before the pilot.",
      note: "E is strongest because it converts debate into a stop-or-scale test. C is ambitious but underplays operational risk.",
    },
    {
      reviewer: "First Principles reviewer",
      strongest: "Response B",
      blindSpot: "Response A",
      missed: "The council should name the single metric that proves the decision solved the real problem.",
      note: "B correctly asks what outcome matters before choosing the tactic. A protects downside but could keep the owner frozen.",
    },
    {
      reviewer: "Expansionist reviewer",
      strongest: "Response C",
      blindSpot: "Response D",
      missed: "A successful pilot should become a repeatable owner playbook inside Katha.",
      note: "C sees the system-level upside. D is useful for clarity, but it does not push the idea far enough.",
    },
    {
      reviewer: "Outsider reviewer",
      strongest: "Response D",
      blindSpot: "Response B",
      missed: "The tenant or parent-facing explanation needs to be simple enough to send on WhatsApp.",
      note: "D catches the clarity problem best. B is thoughtful but can sound too internal unless translated into visible value.",
    },
    {
      reviewer: "Executor reviewer",
      strongest: "Response E",
      blindSpot: "Response C",
      missed: "The first action should be a one-page pilot brief, not another discussion.",
      note: "E wins because it says what to do next. C creates useful ambition but needs a deadline and owner.",
    },
  ];

  return {
    originalQuestion: cleanQuestion,
    framedQuestion,
    context: cleanContext,
    advisors,
    reviews,
    chairman: {
      agrees: [
        "The decision should not be made from instinct alone.",
        "The owner needs one measurable hostel outcome before committing.",
        "The safest path is a limited pilot with a deadline, not an immediate full rollout.",
      ],
      clashes:
        "The Contrarian and Executor push for a small, low-risk test. The Expansionist argues the idea may be bigger than the initial decision and should become a repeatable playbook if it works. The First Principles view resolves the clash: protect upside, but only after the core metric proves the move is solving the right problem.",
      blindSpots:
        "Peer review caught three missing pieces: define the cash buffer, write the tenant or parent-facing explanation in plain language, and decide the exact metric before the pilot starts.",
      recommendation:
        "Run the decision as a controlled pilot in one hostel or one segment before changing the full business. Commit only if the selected metric improves within the test window and the support burden stays manageable.",
      firstStep:
        "Create a one-page pilot brief with the target hostel, success metric, test dates, owner, cash limit, and tenant-facing message.",
    },
  };
}

function makeAdvisorResponse(key: string, question: string, context: string) {
  const base = `For "${question}", the useful context is: ${context}`;

  if (key === "contrarian") {
    return `${base}. The danger is making a permanent business change from a short-term pressure. This can backfire through lower trust, more negotiation, delayed rent collection, or extra manual follow-up. Before acting, prove that the decision will not weaken cash flow or overload staff. The fatal flaw to look for is hidden operating cost: a choice that looks profitable on paper but creates support, complaints, or churn.`;
  }

  if (key === "first-principles") {
    return `${base}. The real question is not whether the move sounds good. The real question is which constraint matters most right now: occupancy, collection reliability, owner time, tenant trust, or staff capacity. If the decision does not improve one of those directly, it is noise. Pick the outcome first, then choose the smallest action that tests whether this decision actually moves that outcome.`;
  }

  if (key === "expansionist") {
    return `${base}. There may be more upside than a single decision. If this works, it could become a reusable Katha playbook for pricing, vacancy recovery, premium room packaging, parent communication, or staffing decisions. Do not only ask how to reduce risk. Ask how to capture the learning, turn it into a repeatable process, and use it across more hostels later.`;
  }

  if (key === "outsider") {
    return `${base}. From fresh eyes, the biggest weakness is clarity. Who benefits, what changes, how much does it cost, and why now? If a tenant, parent, or staff member cannot understand the reason in one message, the decision will feel arbitrary. Translate the move into plain visible value before announcing or implementing it.`;
  }

  return `${base}. The fastest useful path is a pilot. Choose one hostel or one tenant segment, one metric, one owner, and one deadline. Do not expand the decision until the result is visible. Monday morning action: write the pilot brief, set the baseline number, send the simple message, and review results after the agreed window.`;
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function buildTranscript(council: ReturnType<typeof buildCouncil>) {
  return `# LLM Council Transcript

## Original Question
${council.originalQuestion}

## Framed Question
${council.framedQuestion}

## Advisor Responses
${council.advisors.map((advisor) => `### ${advisor.name}\n${advisor.response}`).join("\n\n")}

## Peer Reviews
Mapping used for review: A = Contrarian, B = First Principles, C = Expansionist, D = Outsider, E = Executor.

${council.reviews
  .map(
    (review) => `### ${review.reviewer}
Strongest: ${review.strongest}
Biggest blind spot: ${review.blindSpot}
All responses missed: ${review.missed}
Note: ${review.note}`,
  )
  .join("\n\n")}

## Chairman Synthesis
### Where the Council Agrees
${council.chairman.agrees.map((item) => `- ${item}`).join("\n")}

### Where the Council Clashes
${council.chairman.clashes}

### Blind Spots the Council Caught
${council.chairman.blindSpots}

### The Recommendation
${council.chairman.recommendation}

### The One Thing to Do First
${council.chairman.firstStep}
`;
}

function buildHtmlReport(council: ReturnType<typeof buildCouncil>) {
  const advisorCards = council.advisors
    .map(
      (advisor) => `<details><summary>${escapeHtml(advisor.name)} - ${escapeHtml(advisor.position)}</summary><p>${escapeHtml(advisor.response)}</p></details>`,
    )
    .join("");
  const reviewItems = council.reviews.map((review) => `<li><strong>${escapeHtml(review.strongest)}</strong>: ${escapeHtml(review.note)}</li>`).join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Katha LLM Council Report</title>
<style>
body{margin:0;background:#f6f7fb;color:#111827;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.55}
main{max-width:1040px;margin:0 auto;padding:40px 20px}
.hero,.panel{background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:24px;box-shadow:0 16px 40px rgba(15,23,42,.06)}
.hero{margin-bottom:18px}
.eyebrow{font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#4f46e5}
h1{margin:8px 0 10px;font-size:34px;line-height:1.05}
h2{margin:0 0 12px;font-size:20px}
.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin:18px 0}
.node{border:1px solid #e5e7eb;border-radius:14px;padding:12px;background:#f9fafb;font-size:13px}
.node strong{display:block}
.verdict{border-left:5px solid #4f46e5}
details{border:1px solid #e5e7eb;border-radius:14px;padding:14px;margin-top:10px;background:#fff}
summary{cursor:pointer;font-weight:800}
footer{margin-top:22px;color:#6b7280;font-size:13px}
@media(max-width:760px){.grid{grid-template-columns:1fr}h1{font-size:28px}}
</style>
</head>
<body>
<main>
<section class="hero">
<div class="eyebrow">Katha LLM Council</div>
<h1>${escapeHtml(council.originalQuestion)}</h1>
<p>${escapeHtml(council.context)}</p>
</section>
<section class="panel verdict">
<h2>Chairman's Verdict</h2>
<p><strong>Where the council agrees:</strong> ${escapeHtml(council.chairman.agrees.join(" "))}</p>
<p><strong>Where the council clashes:</strong> ${escapeHtml(council.chairman.clashes)}</p>
<p><strong>Blind spots caught:</strong> ${escapeHtml(council.chairman.blindSpots)}</p>
<p><strong>Recommendation:</strong> ${escapeHtml(council.chairman.recommendation)}</p>
<p><strong>One thing to do first:</strong> ${escapeHtml(council.chairman.firstStep)}</p>
</section>
<div class="grid">
${council.advisors.map((advisor) => `<div class="node"><strong>${escapeHtml(advisor.name)}</strong>${escapeHtml(advisor.position)}</div>`).join("")}
</div>
<section class="panel">
<h2>Advisor Responses</h2>
${advisorCards}
</section>
<section class="panel" style="margin-top:18px">
<h2>Peer Review Highlights</h2>
<ul>${reviewItems}</ul>
</section>
<footer>Generated from Katha owner council on ${new Date().toLocaleString("en-IN")}.</footer>
</main>
</body>
</html>`;
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function OwnerCouncilPage() {
  const [question, setQuestion] = useState(examples[0]);
  const [context, setContext] = useState(
    "Current hostel constraints, tenant demand, monthly collection pressure, staff capacity, and what would make this decision expensive if wrong.",
  );
  const [lastRunAt, setLastRunAt] = useState(() => new Date());
  const council = useMemo(() => buildCouncil(question, context), [question, context]);
  const transcript = useMemo(() => buildTranscript(council), [council]);
  const htmlReport = useMemo(() => buildHtmlReport(council), [council]);
  const stamp = lastRunAt.toISOString().replace(/[-:]/g, "").slice(0, 15);

  const copyTranscript = async () => {
    await navigator.clipboard.writeText(transcript);
  };

  return (
    <div className="space-y-4 text-white">
      <OwnerPageHero
        eyebrow="LLM Council"
        title="Council workspace"
        description="Run high-stakes owner decisions through five thinking lenses, peer review, and a chairman verdict."
        badge={<span className="inline-flex rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-100">Built for Katha</span>}
        actions={
          <Button onClick={() => setLastRunAt(new Date())} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Run Council
          </Button>
        }
      />

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[color:var(--brand-soft)] text-[color:var(--accent-electric)]">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-white">Frame the question</h2>
              <p className="text-sm text-[color:var(--fg-secondary)]">Add the decision, stakes, and owner context.</p>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">Decision</span>
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                className="mt-2 min-h-28 w-full resize-none rounded-[18px] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-[color:var(--accent-electric)]"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">Context enrichment</span>
              <textarea
                value={context}
                onChange={(event) => setContext(event.target.value)}
                className="mt-2 min-h-36 w-full resize-none rounded-[18px] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-[color:var(--accent-electric)]"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {examples.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setQuestion(item)}
                  className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2 text-xs font-semibold text-[color:var(--fg-secondary)] transition hover:border-[color:var(--border-strong)] hover:text-white"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="border-b border-[color:var(--border)] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--fg-secondary)]">Council verdict</p>
            <h2 className="font-display mt-1 text-2xl font-semibold text-white">Controlled pilot before commitment</h2>
            <p className="mt-1 text-xs text-[color:var(--fg-secondary)]">Last run: {lastRunAt.toLocaleString("en-IN")}</p>
          </div>
          <div className="grid gap-3 p-4">
            <VerdictBlock icon={<CheckCircle2 className="h-4 w-4" />} title="Where the council agrees" body={council.chairman.agrees.join(" ")} />
            <VerdictBlock icon={<Lightbulb className="h-4 w-4" />} title="Where the council clashes" body={council.chairman.clashes} />
            <VerdictBlock icon={<Eye className="h-4 w-4" />} title="Blind spots caught" body={council.chairman.blindSpots} />
            <VerdictBlock icon={<Compass className="h-4 w-4" />} title="Recommendation" body={council.chairman.recommendation} strong />
            <div className="rounded-[18px] border border-amber-300/20 bg-amber-400/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-100">One thing to do first</p>
              <p className="mt-2 text-sm leading-6 text-white">{council.chairman.firstStep}</p>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button onClick={copyTranscript} variant="secondary" className="gap-2">
                <Clipboard className="h-4 w-4" />
                Copy transcript
              </Button>
              <Button onClick={() => downloadFile(`council-report-${stamp}.html`, htmlReport, "text/html;charset=utf-8")} variant="secondary" className="gap-2">
                <Download className="h-4 w-4" />
                HTML report
              </Button>
              <Button onClick={() => downloadFile(`council-transcript-${stamp}.md`, transcript, "text/markdown;charset=utf-8")} variant="secondary" className="gap-2">
                <FileText className="h-4 w-4" />
                Transcript
              </Button>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-3 lg:grid-cols-5">
        {council.advisors.map((advisor) => (
          <Card key={advisor.key} className="p-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-[16px] border ${advisor.accent}`}>
              <advisor.icon className="h-5 w-5" />
            </div>
            <p className="mt-3 font-display text-base font-semibold text-white">{advisor.name}</p>
            <p className="text-xs text-[color:var(--fg-secondary)]">{advisor.position}</p>
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-semibold text-[var(--accent)]">Read advisor response</summary>
              <p className="mt-3 text-sm leading-6 text-[color:var(--fg-secondary)]">{advisor.response}</p>
            </details>
          </Card>
        ))}
      </section>

      <Card className="p-4">
        <div className="grid gap-3 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--fg-secondary)]">Agreement map</p>
            <h2 className="font-display mt-1 text-xl font-semibold text-white">How the advisors diverged</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-5">
            {council.advisors.map((advisor) => (
              <div key={advisor.key} className="rounded-[16px] border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3">
                <p className="text-sm font-semibold text-white">{advisor.name}</p>
                <p className="mt-1 text-xs text-[color:var(--fg-secondary)]">{advisor.position}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--fg-secondary)]">Peer review</p>
        <div className="mt-3 grid gap-3 lg:grid-cols-5">
          {council.reviews.map((review) => (
            <details key={review.reviewer} className="rounded-[16px] border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3">
              <summary className="cursor-pointer text-sm font-semibold text-white">{review.reviewer}</summary>
              <div className="mt-3 space-y-2 text-xs leading-5 text-[color:var(--fg-secondary)]">
                <p>Strongest: {review.strongest}</p>
                <p>Blind spot: {review.blindSpot}</p>
                <p>{review.missed}</p>
              </div>
            </details>
          ))}
        </div>
      </Card>
    </div>
  );
}

function VerdictBlock({ icon, title, body, strong = false }: { icon: React.ReactNode; title: string; body: string; strong?: boolean }) {
  return (
    <div className="rounded-[18px] border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4">
      <div className="flex items-center gap-2 text-[color:var(--accent-electric)]">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-[0.14em]">{title}</p>
      </div>
      <p className={`mt-2 text-sm leading-6 ${strong ? "font-semibold text-white" : "text-[color:var(--fg-secondary)]"}`}>{body}</p>
    </div>
  );
}
