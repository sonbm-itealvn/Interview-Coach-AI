import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { ArrowRight, BookOpenCheck, FileText, Mic, Sparkles, Target } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

export default function Home() {
  const { user } = useAuth();
  const profile = trpc.profile.get.useQuery();
  const documents = trpc.documents.list.useQuery();
  const stories = trpc.stars.list.useQuery();

  const readiness = [
    Boolean(profile.data?.professionalSummary),
    (documents.data?.length || 0) > 0,
    (stories.data?.length || 0) >= 2,
  ].filter(Boolean).length;

  return (
    <DashboardLayout>
      <div className="scandi-canvas">
        <section className="relative overflow-hidden rounded-[2rem] bg-[#20242a] px-6 py-10 text-white shadow-[0_24px_70px_rgba(32,36,42,.14)] sm:px-10 lg:px-12">
          <div className="pastel-orb absolute -right-12 -top-12 h-52 w-52 bg-[#b9d9eb]" />
          <div className="pastel-orb absolute bottom-[-5rem] right-[16%] h-40 w-40 bg-[#eec9d1]" />
          <div className="relative max-w-2xl">
            <Badge className="mb-5 border-0 bg-white/10 px-3 py-1 text-white hover:bg-white/10">Personal interview studio</Badge>
            <h1 className="font-display text-4xl font-extrabold tracking-[-.055em] sm:text-5xl">Practise with proof, not scripts.</h1>
            <p className="mt-5 max-w-xl text-base font-light leading-7 text-white/70 sm:text-lg">Turn your real experience, articles and career goals into confident English interview practice.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/practice"><Button className="h-11 rounded-full bg-[#dceeff] px-5 font-semibold text-[#15202b] hover:bg-white"><Mic className="mr-2 h-4 w-4" />Start a practice</Button></Link>
              <Link href="/profile"><Button variant="outline" className="h-11 rounded-full border-white/25 bg-transparent px-5 text-white hover:bg-white/10 hover:text-white">Complete profile <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
          <div className="scandi-panel p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">YOUR PREPAREDNESS</p>
                <h2 className="mt-2 font-display text-2xl font-bold tracking-[-.04em]">Build a stronger evidence base.</h2>
              </div>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#dceeff] font-display text-xl font-bold text-[#17394c]">{readiness}/3</div>
            </div>
            <div className="mt-7 grid gap-3">
              {[
                { done: Boolean(profile.data?.professionalSummary), title: "Career profile", text: "Your background, skills and target role." },
                { done: (documents.data?.length || 0) > 0, title: "Evidence library", text: "A CV, job description or article to cite." },
                { done: (stories.data?.length || 0) >= 2, title: "STAR stories", text: "At least two measurable examples." },
              ].map(item => (
                <div key={item.title} className="flex items-center gap-4 rounded-2xl bg-[#f3f5f6] px-4 py-3">
                  <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${item.done ? "bg-[#20242a] text-white" : "bg-white text-[#9aa5ad]"}`}>{item.done ? "✓" : "0"}</span>
                  <div><p className="font-semibold text-[#20242a]">{item.title}</p><p className="text-sm text-[#707981]">{item.text}</p></div>
                </div>
              ))}
            </div>
          </div>

          <div className="scandi-panel relative overflow-hidden bg-[#f6e8ec] p-6 sm:p-7">
            <div className="absolute right-4 top-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#eec9d1]"><Sparkles className="h-6 w-6 text-[#7d4855]" /></div>
            <p className="eyebrow">FOCUS FOR TODAY</p>
            <h2 className="mt-2 max-w-xs font-display text-2xl font-bold tracking-[-.04em]">Bring a question. We’ll bring the structure.</h2>
            <p className="mt-4 max-w-sm text-sm leading-6 text-[#705862]">The practice room transcribes English questions in real time and returns an evidence-grounded outline, sample answer and coaching notes.</p>
            <Link href="/practice"><Button className="mt-8 h-10 rounded-full bg-[#20242a] px-5 hover:bg-[#333942]">Open practice room <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { icon: Target, title: profile.data?.targetRole || "Set your target role", hint: "Profile" },
            { icon: FileText, title: `${documents.data?.length || 0} documents ready`, hint: "Library" },
            { icon: BookOpenCheck, title: `${stories.data?.length || 0} STAR stories saved`, hint: "Story bank" },
          ].map(card => <div className="scandi-panel flex items-center gap-4 p-5" key={card.hint}><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e8eff3]"><card.icon className="h-5 w-5 text-[#31596e]" /></div><div><p className="text-xs font-semibold uppercase tracking-[.12em] text-[#89939a]">{card.hint}</p><p className="mt-1 font-semibold text-[#20242a]">{card.title}</p></div></div>)}
        </section>
      </div>
    </DashboardLayout>
  );
}
