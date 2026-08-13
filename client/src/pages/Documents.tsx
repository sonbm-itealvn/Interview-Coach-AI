import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readFileAsBase64, formatShortDate } from "@/lib/interview";
import { trpc } from "@/lib/trpc";
import { FileText, FolderUp, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type DocumentType = "cv" | "article" | "job_description" | "other";
const typeLabel: Record<DocumentType, string> = { cv: "CV", article: "Article", job_description: "Job description", other: "Other" };

export default function Documents() {
  const utils = trpc.useUtils();
  const documents = trpc.documents.list.useQuery();
  const upload = trpc.documents.upload.useMutation({ onSuccess: () => { utils.documents.list.invalidate(); toast.success("Document added to your evidence library."); } });
  const remove = trpc.documents.delete.useMutation({ onSuccess: () => utils.documents.list.invalidate() });
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<DocumentType>("cv");

  async function handleUpload(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return toast.error("Choose a PDF, DOCX, TXT or Markdown file first.");
    if (file.size > 12 * 1024 * 1024) return toast.error("Keep documents below 12 MB.");
    try {
      const base64 = await readFileAsBase64(file);
      await upload.mutateAsync({ type, title: title.trim() || file.name.replace(/\.[^.]+$/, ""), fileName: file.name, mimeType: file.type || "text/plain", base64 });
      setFile(null); setTitle("");
      const input = document.getElementById("document-file") as HTMLInputElement | null;
      if (input) input.value = "";
    } catch (error) { toast.error(error instanceof Error ? error.message : "Upload failed."); }
  }

  return <DashboardLayout><div className="scandi-canvas max-w-5xl"><header className="page-heading"><div><p className="eyebrow">KNOWLEDGE BASE</p><h1>Evidence library</h1><p>Upload the sources the coach may use: CVs, articles and job descriptions.</p></div><div className="heading-mark bg-[#f6e8ec]"><FileText className="h-6 w-6 text-[#8d5563]" /></div></header>
    <section className="scandi-panel mt-8 p-6 sm:p-8"><form onSubmit={handleUpload} className="grid gap-5 md:grid-cols-[1fr_1fr_auto]"><div className="field-stack"><Label htmlFor="document-file">Document</Label><Input id="document-file" type="file" accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown" onChange={event => setFile(event.target.files?.[0] || null)} /><p className="field-hint">PDF, DOCX, TXT or MD · max 12 MB</p></div><div className="grid grid-cols-2 gap-3"><div className="field-stack"><Label htmlFor="doc-title">Title</Label><Input id="doc-title" value={title} onChange={event => setTitle(event.target.value)} placeholder="My CV" /></div><div className="field-stack"><Label htmlFor="doc-type">Type</Label><select id="doc-type" className="scandi-select" value={type} onChange={event => setType(event.target.value as DocumentType)}>{Object.entries(typeLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></div><div className="flex items-end"><Button disabled={upload.isPending} type="submit" className="h-10 w-full rounded-full bg-[#20242a] hover:bg-[#353b43] md:w-auto">{upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><FolderUp className="mr-2 h-4 w-4" />Upload</>}</Button></div></form></section>
    <section className="mt-8"><div className="mb-4 flex items-center justify-between"><h2 className="font-display text-2xl font-bold tracking-[-.04em]">Your files</h2><span className="text-sm text-[#7b858c]">{documents.data?.length || 0} sources</span></div><div className="grid gap-3">{documents.isLoading ? <div className="scandi-panel p-6 text-sm text-[#7b858c]">Loading library…</div> : documents.data?.length ? documents.data.map(document => <article key={document.id} className="scandi-panel flex items-center gap-4 p-4 sm:p-5"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e8eff3]"><FileText className="h-5 w-5 text-[#31596e]" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-semibold text-[#20242a]">{document.title}</p><Badge variant="secondary" className="bg-[#f0f2f3] text-[#59646c]">{typeLabel[document.type]}</Badge></div><p className="mt-1 truncate text-sm text-[#7b858c]">{document.fileName} · {document.chunkCount} searchable excerpts · {formatShortDate(document.createAt)}</p></div><div className="flex items-center gap-3"><span className={`hidden text-xs font-semibold sm:block ${document.extractionStatus === "ready" ? "text-[#4e7c5d]" : "text-[#a5753d]"}`}>{document.extractionStatus === "ready" ? "Ready" : document.extractionStatus === "needs_review" ? "Review text" : "Extraction failed"}</span><Button type="button" variant="ghost" size="icon" aria-label={`Delete ${document.title}`} onClick={() => remove.mutate({ id: document.id })} className="text-[#9b5b68] hover:bg-[#f9edef] hover:text-[#9b5b68]"><Trash2 className="h-4 w-4" /></Button></div></article>) : <div className="empty-panel"><FolderUp className="h-6 w-6" /><p>No documents yet.</p><span>Start with your CV, a target job description or a research article.</span></div>}</div></section>
  </div></DashboardLayout>;
}
