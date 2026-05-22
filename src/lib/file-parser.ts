import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";

// Set the worker source for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export type ParsedFile = {
  text: string;
  title: string;
  fileType: string;
  fileSize: number;
};

export async function parseFile(file: File): Promise<ParsedFile> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  let text = "";

  switch (ext) {
    case "pdf":
      text = await parsePDF(file);
      break;
    case "docx":
      text = await parseDOCX(file);
      break;
    case "txt":
      text = await parseTXT(file);
      break;
    case "pptx":
      text = await parsePPTX(file);
      break;
    default:
      throw new Error(`Unsupported file type: .${ext}`);
  }

  return {
    text: text.trim(),
    title: file.name.replace(/\.[^/.]+$/, ""),
    fileType: ext || "unknown",
    fileSize: file.size,
  };
}

async function parsePDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items
      .filter((item: any) => "str" in item)
      .map((item: any) => item.str);
    pages.push(strings.join(" "));
  }

  return pages.join("\n\n");
}

async function parseDOCX(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function parseTXT(file: File): Promise<string> {
  return await file.text();
}

async function parsePPTX(file: File): Promise<string> {
  // PPTX files are ZIP archives containing XML files
  // We'll use a basic approach extracting text from the XML slides
  const arrayBuffer = await file.arrayBuffer();
  const { entries } = await import("https://cdn.jsdelivr.net/npm/@aspect-build/rules_js@2.0.0/dist/fflate.min.js" as any).catch(() => {
    // Fallback: read as text (won't work well but graceful degradation)
    return { entries: null };
  });

  // Simple fallback: treat as binary and extract visible text patterns
  const bytes = new Uint8Array(arrayBuffer);
  const decoder = new TextDecoder("utf-8", { fatal: false });
  const raw = decoder.decode(bytes);

  // Extract text between XML tags commonly found in PPTX
  const textMatches = raw.match(/<a:t>([^<]+)<\/a:t>/g);
  if (textMatches) {
    return textMatches
      .map((m) => m.replace(/<\/?a:t>/g, ""))
      .filter((t) => t.trim().length > 0)
      .join(" ");
  }

  return "Unable to extract text from this PPTX file. Please try converting to PDF first.";
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
];

const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".pptx", ".txt"];

export function isAcceptedFile(file: File): boolean {
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  return ACCEPTED_TYPES.includes(file.type) || ACCEPTED_EXTENSIONS.includes(ext);
}

export const ACCEPT_STRING = ".pdf,.docx,.pptx,.txt";
