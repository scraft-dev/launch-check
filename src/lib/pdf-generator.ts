import PDFDocument from "pdfkit";

export type PdfGenerationInput = {
  title: string;
  summary: string;
  findings: string[];
  screenshots: string[];
  score?: number;
  details?: string[];
};

function dataUrlToBuffer(dataUrl: string): Buffer {
  const [header, encoded] = dataUrl.split(",");
  if (!encoded) {
    throw new Error("Invalid image data URL");
  }

  const mimeType = header.match(/^data:(.+);base64$/)?.[1] ?? "image/png";
  if (!mimeType.includes("image/")) {
    throw new Error("Only image data URLs are supported");
  }

  return Buffer.from(encoded, "base64");
}

export async function buildPdfBuffer(
  input: PdfGenerationInput,
): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    doc.on("data", (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text(input.title, { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(input.summary);
    doc.moveDown();

    if (typeof input.score === "number") {
      doc.fontSize(14).text(`Score: ${input.score}/100`);
    }

    if (input.details && input.details.length > 0) {
      doc.moveDown();
      doc.fontSize(12).text("Details:");
      input.details.forEach((detail) => {
        doc.text(`- ${detail}`);
      });
    }

    if (input.findings.length > 0) {
      doc.moveDown();
      doc.fontSize(12).text("Findings:");
      input.findings.forEach((finding) => {
        doc.text(`- ${finding}`);
      });
    }

    if (input.screenshots.length > 0) {
      doc.addPage();
      input.screenshots.forEach((screenshot, index) => {
        try {
          const imageBuffer = dataUrlToBuffer(screenshot);
          if (index > 0) {
            doc.addPage();
          }
          doc.fontSize(12).text(`Screenshot ${index + 1}`);
          doc.image(imageBuffer, { fit: [500, 250], align: "center" });
          doc.moveDown();
        } catch {
          doc.text("Screenshot could not be embedded.");
          doc.moveDown();
        }
      });
    }

    doc.end();
  });
}
