import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Check, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type FormState = { fullName: string; professionalSummary: string; skills: string; targetRole: string; targetCompany: string; coachingStyle: "concise" | "balanced" | "detailed" };
const emptyForm: FormState = { fullName: "", professionalSummary: "", skills: "", targetRole: "", targetCompany: "", coachingStyle: "balanced" };

export default function Profile() {
  const profile = trpc.profile.get.useQuery();
  const utils = trpc.useUtils();
  const [form, setForm] = useState<FormState>(emptyForm);
  const save = trpc.profile.save.useMutation({ onSuccess: () => { utils.profile.get.invalidate(); toast.success("Profile saved."); } });

  useEffect(() => {
    if (profile.data) setForm({
      fullName: profile.data.fullName || "", professionalSummary: profile.data.professionalSummary || "", skills: profile.data.skills || "",
      targetRole: profile.data.targetRole || "", targetCompany: profile.data.targetCompany || "", coachingStyle: profile.data.coachingStyle,
    });
  }, [profile.data]);

  const update = (key: keyof FormState, value: string) => setForm(previous => ({ ...previous, [key]: value }));

  return <DashboardLayout><div className="scandi-canvas max-w-5xl">
    <header className="page-heading"><div><p className="eyebrow">FOUNDATION</p><h1>Your candidate profile</h1><p>Give the coach accurate material to personalise every practice response.</p></div><div className="heading-mark bg-[#dceeff]"><UserRound className="h-6 w-6 text-[#31596e]" /></div></header>
    <form onSubmit={event => { event.preventDefault(); save.mutate(form); }} className="scandi-panel mt-8 p-6 sm:p-8">
      <div className="grid gap-6 md:grid-cols-2"><div className="field-stack"><Label htmlFor="fullName">Full name</Label><Input id="fullName" value={form.fullName} onChange={event => update("fullName", event.target.value)} placeholder="Alex Morgan" /></div><div className="field-stack"><Label htmlFor="targetRole">Target role</Label><Input id="targetRole" value={form.targetRole} onChange={event => update("targetRole", event.target.value)} placeholder="Senior Product Designer" /></div><div className="field-stack"><Label htmlFor="targetCompany">Target company (optional)</Label><Input id="targetCompany" value={form.targetCompany} onChange={event => update("targetCompany", event.target.value)} placeholder="Company or industry" /></div><div className="field-stack"><Label htmlFor="style">Coaching detail</Label><select id="style" className="scandi-select" value={form.coachingStyle} onChange={event => update("coachingStyle", event.target.value)}><option value="concise">Concise — fast, focused cues</option><option value="balanced">Balanced — ready-to-use structure</option><option value="detailed">Detailed — deeper reasoning and follow-ups</option></select></div></div>
      <div className="mt-6 field-stack"><Label htmlFor="summary">Professional summary</Label><Textarea id="summary" value={form.professionalSummary} onChange={event => update("professionalSummary", event.target.value)} placeholder="Summarise your career focus, domain strengths and impact in your own words." className="min-h-32" /><p className="field-hint">Use only real experience. This becomes approved evidence for your generated answers.</p></div>
      <div className="mt-6 field-stack"><Label htmlFor="skills">Skills and tools</Label><Textarea id="skills" value={form.skills} onChange={event => update("skills", event.target.value)} placeholder="e.g. Product strategy, Figma, SQL, stakeholder management" className="min-h-24" /></div>
      <div className="mt-8 flex justify-end"><Button type="submit" disabled={save.isPending} className="rounded-full bg-[#20242a] px-6 hover:bg-[#353b43]">{save.isPending ? "Saving…" : <><Check className="mr-2 h-4 w-4" />Save profile</>}</Button></div>
    </form>
  </div></DashboardLayout>;
}
