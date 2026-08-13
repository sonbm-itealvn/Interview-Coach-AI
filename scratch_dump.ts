import { db } from "./server/db";
import { interviewDocuments } from "./drizzle/schema";
import fs from "fs";
import path from "path";
import { eq } from "drizzle-orm";

async function main() {
  const docs = await db.query.interviewDocuments.findMany({
    where: eq(interviewDocuments.userId, 1)
  });
  
  let summary = "";
  for (const doc of docs) {
    summary += `--- Document: ${doc.title} (${doc.fileName}) ---\n`;
    summary += doc.extractedText ? doc.extractedText.slice(0, 10000) + "...\n\n" : "No text extracted\n\n";
  }
  
  const outputPath = path.join(process.cwd(), "docs_summary.txt");
  fs.writeFileSync(outputPath, summary);
  console.log("Extracted text to docs_summary.txt");
  process.exit(0);
}

main().catch(console.error);
