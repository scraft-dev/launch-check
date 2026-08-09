import type { IssueSeverity } from "./scan";

export type QualityCategory = "seo" | "accessibility" | "security" | "content";

export type QualityFinding = {
  id: string;
  category: QualityCategory;
  severity: IssueSeverity;
  title: string;
  detail: string;
  recommendation: string;
};

export type PageQualitySnapshot = {
  title: string;
  metaDescription: string;
  language: string;
  h1Count: number;
  imageCount: number;
  imagesMissingAlt: number;
  formControlCount: number;
  unlabeledFormControls: number;
  hasViewportMeta: boolean;
  mixedContentCount: number;
};

export function buildQualityFindings(
  snapshot: PageQualitySnapshot,
): QualityFinding[] {
  const findings: QualityFinding[] = [];

  if (!snapshot.title.trim()) {
    findings.push({
      id: "missing-title",
      category: "seo",
      severity: "high",
      title: "Page title is missing",
      detail: "Search engines and browser tabs cannot identify this page.",
      recommendation:
        "Add a unique, descriptive <title> element of roughly 30–60 characters.",
    });
  } else if (snapshot.title.length < 15 || snapshot.title.length > 60) {
    findings.push({
      id: "title-length",
      category: "seo",
      severity: "low",
      title: "Page title length needs review",
      detail: `The title is ${snapshot.title.length} characters long.`,
      recommendation:
        "Keep the title descriptive and approximately 30–60 characters long.",
    });
  }

  if (!snapshot.metaDescription.trim()) {
    findings.push({
      id: "missing-meta-description",
      category: "seo",
      severity: "medium",
      title: "Meta description is missing",
      detail: "Search results may show an unpredictable page excerpt.",
      recommendation:
        "Add a clear meta description that summarizes the page in about 120–160 characters.",
    });
  }

  if (!snapshot.language.trim()) {
    findings.push({
      id: "missing-language",
      category: "accessibility",
      severity: "medium",
      title: "Document language is not declared",
      detail:
        "Assistive technology cannot reliably choose the correct pronunciation.",
      recommendation:
        'Set the lang attribute on the <html> element, for example lang="ja" or lang="en".',
    });
  }

  if (snapshot.h1Count === 0) {
    findings.push({
      id: "missing-h1",
      category: "content",
      severity: "high",
      title: "Main heading is missing",
      detail: "The page does not contain an H1 heading.",
      recommendation:
        "Add one clear H1 that describes the page's primary purpose.",
    });
  } else if (snapshot.h1Count > 1) {
    findings.push({
      id: "multiple-h1",
      category: "content",
      severity: "medium",
      title: "Multiple main headings detected",
      detail: `${snapshot.h1Count} H1 headings were found.`,
      recommendation:
        "Use one primary H1 and organize subsections with H2 and H3 headings.",
    });
  }

  if (snapshot.imagesMissingAlt > 0) {
    findings.push({
      id: "missing-image-alt",
      category: "accessibility",
      severity: "medium",
      title: "Images are missing alternative text",
      detail: `${snapshot.imagesMissingAlt} of ${snapshot.imageCount} images do not have an alt attribute.`,
      recommendation:
        'Add meaningful alt text to informative images and alt="" to decorative images.',
    });
  }

  if (snapshot.unlabeledFormControls > 0) {
    findings.push({
      id: "unlabeled-form-controls",
      category: "accessibility",
      severity: "high",
      title: "Form controls are not labeled",
      detail: `${snapshot.unlabeledFormControls} of ${snapshot.formControlCount} form controls have no accessible name.`,
      recommendation:
        "Associate each control with a visible <label> or an appropriate aria-label.",
    });
  }

  if (!snapshot.hasViewportMeta) {
    findings.push({
      id: "missing-viewport",
      category: "accessibility",
      severity: "medium",
      title: "Mobile viewport configuration is missing",
      detail: "The page may render incorrectly on phones and tablets.",
      recommendation:
        'Add <meta name="viewport" content="width=device-width, initial-scale=1">.',
    });
  }

  if (snapshot.mixedContentCount > 0) {
    findings.push({
      id: "mixed-content",
      category: "security",
      severity: "critical",
      title: "Mixed content detected",
      detail: `${snapshot.mixedContentCount} resources use HTTP on an HTTPS page.`,
      recommendation:
        "Serve every script, image, stylesheet, and media resource over HTTPS.",
    });
  }

  return findings;
}
