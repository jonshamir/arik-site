/**
 * Migration script: Extracts paper data from old ASP site and outputs JSON files.
 * Run with: bun migrate-papers.ts
 */

import { readdirSync, readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join, basename, extname } from "path";

/** Read a file that may be Windows-1252 encoded */
function readLegacyEncoding(filePath: string): string {
  const buf = readFileSync(filePath);
  // Windows-1252 manual mapping for bytes 0x80-0x9F that differ from Latin-1
  const win1252: Record<number, string> = {
    0x80: "\u20AC", 0x82: "\u201A", 0x83: "\u0192", 0x84: "\u201E",
    0x85: "\u2026", 0x86: "\u2020", 0x87: "\u2021", 0x88: "\u02C6",
    0x89: "\u2030", 0x8A: "\u0160", 0x8B: "\u2039", 0x8C: "\u0152",
    0x8E: "\u017D", 0x91: "\u2018", 0x92: "\u2019", 0x93: "\u201C",
    0x94: "\u201D", 0x95: "\u2022", 0x96: "\u2013", 0x97: "\u2014",
    0x98: "\u02DC", 0x99: "\u2122", 0x9A: "\u0161", 0x9B: "\u203A",
    0x9C: "\u0153", 0x9E: "\u017E", 0x9F: "\u0178",
  };
  let result = "";
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i];
    if (byte >= 0x80 && byte <= 0x9F && win1252[byte]) {
      result += win1252[byte];
    } else {
      result += String.fromCharCode(byte);
    }
  }
  return result;
}

const OLD_SITE = "/Users/jonshamir/Downloads/site";
const OUTPUT_DIR = join(import.meta.dir, "papers");
const IMAGES_SRC = join(OLD_SITE, "images/research");
const IMAGES_DEST = join(import.meta.dir, "images/research");

// ── Category mappings (extracted from subject-*.asp files) ──

const CATEGORY_MAP: Record<string, string[]> = {};

const subjectFiles: Record<string, string> = {
  "subject-shape-analysis.asp": "Shape Analysis",
  "subject-3D-modeling.asp": "3D Modelling & Fabrication",
  "subject-image.asp": "Image & Video Processing",
  "subject-animation.asp": "Animation",
  "subject-typography.asp": "Art, Sketches & Typography",
  "subject-visual-info.asp": "Information Visualization",
  "subject-seam-carve.asp": "Seam Carving",
};

for (const [file, category] of Object.entries(subjectFiles)) {
  const content = readLegacyEncoding(join(OLD_SITE, file));
  const matches = content.matchAll(/includes\/research\/([^"]+)\.inc/g);
  for (const m of matches) {
    const slug = m[1];
    if (slug === "seperator" || slug === "simple-seperator") continue;
    if (!CATEGORY_MAP[slug]) CATEGORY_MAP[slug] = [];
    if (!CATEGORY_MAP[slug].includes(category)) {
      CATEGORY_MAP[slug].push(category);
    }
  }
}

// ── Helpers ──

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseAuthors(authorStr: string): string[] {
  // Strip HTML tags first
  const clean = stripHtml(authorStr);
  // Split on middot (·), bullet, or comma
  // The old site uses various separators: ·, •, comma, "and"
  let authors: string[];
  if (clean.includes("·") || clean.includes("\u00b7")) {
    authors = clean.split(/\s*[·\u00b7]\s*/);
  } else if (clean.includes("•")) {
    authors = clean.split(/\s*•\s*/);
  } else if (clean.includes(",")) {
    authors = clean.split(/\s*,\s*/);
  } else {
    authors = [clean];
  }
  return authors
    .map((a) => a.replace(/^by\s+/i, "").trim())
    .filter((a) => a.length > 0 && a !== "and");
}

function parseBibtexAuthors(authorStr: string): string[] {
  return authorStr
    .split(/\s+and\s+/)
    .map((a) => a.trim())
    .filter((a) => a.length > 0);
}

function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function determinePaperType(venue: string): "journal" | "conference" {
  const lower = venue.toLowerCase();
  if (
    lower.includes("transaction") ||
    lower.includes("journal") ||
    lower.includes("magazine") ||
    lower.includes("communications of the acm") ||
    lower.includes("computer graphics forum") ||
    lower.includes("computers & graphics") ||
    lower.includes("the visual computer") ||
    lower.includes("graphical models")
  ) {
    return "journal";
  }
  return "conference";
}

// ── Parse .inc file ──

interface IncData {
  title: string;
  authors: string[];
  venue: string;
  year: number;
  pages: string;
  thumbnail: string;
}

function parseIncFile(slug: string): IncData | null {
  const path = join(OLD_SITE, "includes/research", `${slug}.inc`);
  if (!existsSync(path)) return null;

  const content = readLegacyEncoding(path);

  // Title
  const titleMatch = content.match(/<h3>(.*?)<\/h3>/s);
  const title = titleMatch ? stripHtml(titleMatch[1]) : "";

  // Authors
  const authorsMatch = content.match(/<p class="authors">(.*?)<\/p>/s);
  const authors = authorsMatch ? parseAuthors(authorsMatch[1]) : [];

  // Venue info
  const infoMatch = content.match(/<p class="info">\s*([\s\S]*?)\s*<\/p>/);
  let venue = "";
  let year = 0;
  let pages = "";
  if (infoMatch) {
    const infoText = stripHtml(infoMatch[1]);
    // Extract year (4-digit number, typically at end or after comma)
    const yearMatch = infoText.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) year = parseInt(yearMatch[0]);

    // Extract pages
    const pagesMatch = infoText.match(
      /Pages?\s+([\d\-–]+(?:\s*-\s*[\d]+)?)/i
    );
    if (pagesMatch) pages = pagesMatch[1].replace(/–/g, "-");

    // Extract article number
    if (!pages) {
      const articleMatch = infoText.match(/Article\s+(?:No\.\s*)?(\d+)/i);
      if (articleMatch) pages = `Article ${articleMatch[1]}`;
    }

    // Venue is everything before the year, cleaned up
    venue = infoText
      .replace(/,?\s*\b(19|20)\d{2}\b.*$/, "")
      .replace(/,?\s*Pages?\s+[\d\-–]+.*/i, "")
      .replace(/,?\s*Article\s+(?:No\.\s*)?\d+.*/i, "")
      .replace(/,?\s*Volume\s+\d+.*/i, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/,\s*$/, "");
  }

  // Thumbnail
  const thumbMatch = content.match(
    /src="images\/research\/thumbnails\/([^"]+)"/
  );
  const thumbnail = thumbMatch
    ? `/images/research/thumbnails/${thumbMatch[1]}`
    : "";

  return { title, authors, venue, year, pages, thumbnail };
}

// ── Parse .asp file ──

interface AspData {
  abstract: string;
  paperLink: string | null;
  videoLink: string | null;
  projectLink: string | null;
  overviewImage: string | null;
}

function parseAspFile(slug: string): AspData | null {
  // Map special slugs to their ASP filenames
  const aspSlugMap: Record<string, string> = {
    seamSeminal: "", // no .asp file, external DOI
    "seam-CACM": "", // no .asp file, external link
    layoutRect: "LayoutRect",
  };

  const aspSlug = aspSlugMap[slug] ?? slug;
  if (aspSlug === "") return null;

  const path = join(OLD_SITE, `${aspSlug}.asp`);
  if (!existsSync(path)) return null;

  const content = readLegacyEncoding(path);

  // Check if it's a redirect page
  if (content.includes("window.location")) {
    return null;
  }

  // Remove HTML comments (but not ASP includes which look like <!-- #include -->)
  const uncommented = content
    .replace(/<!---[\s\S]*?--->/g, "")
    .replace(/<!--(?!\s*#include)[\s\S]*?-->/g, "");

  // Abstract - stop at </p> or a bare <p> (some files have malformed HTML)
  let abstract = "";
  const abstractMatch = uncommented.match(
    /<h2>Abstract<\/h2>\s*<p>\s*([\s\S]*?)(?:<\/p>|\n\s*<p>\s*\n|\n\s*<p>\s*$)/i
  );
  if (abstractMatch) {
    abstract = stripHtml(abstractMatch[1]);
  }

  // Paper link - look for PDF/paper links
  let paperLink: string | null = null;
  const paperPatterns = [
    /<a\s+href="([^"]+)"[^>]*>\s*The Paper\b/i,
    /<a\s+href="([^"]+)"[^>]*>\s*The Paper \(PDF\)/i,
    /<a\s+href="([^"]+)"[^>]*>\s*The Paper \(ArXiv\)/i,
    /<a\s+href="([^"]+)"[^>]*>\s*The Paper \(IEEE/i,
    /<a\s+href="([^"]+)"[^>]*>\s*Paper Page/i,
    /<a\s+href="([^"]+)"[^>]*>\s*Talk Slides/i,
  ];
  for (const pattern of paperPatterns) {
    const match = uncommented.match(pattern);
    if (match) {
      paperLink = match[1];
      // Convert relative paths to note them
      if (
        paperLink.startsWith("includes/papers/") ||
        paperLink.startsWith("http")
      ) {
        break;
      }
    }
  }

  // Video link - prefer Vimeo iframe, then YouTube
  let videoLink: string | null = null;
  const vimeoMatch = uncommented.match(
    /player\.vimeo\.com\/video\/(\d+)/
  );
  if (vimeoMatch) {
    videoLink = `https://vimeo.com/${vimeoMatch[1]}`;
  }
  if (!videoLink) {
    const youtubeMatch = uncommented.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/
    );
    if (youtubeMatch) {
      videoLink = `https://www.youtube.com/watch?v=${youtubeMatch[1]}`;
    }
  }
  // Also check for old Vimeo embed format (moogaloop)
  if (!videoLink) {
    const oldVimeoMatch = uncommented.match(
      /vimeo\.com\/moogaloop\.swf\?clip_id=(\d+)/
    );
    if (oldVimeoMatch) {
      videoLink = `https://vimeo.com/${oldVimeoMatch[1]}`;
    }
  }

  // Project link
  let projectLink: string | null = null;
  const projectPatterns = [
    /<a\s+href="([^"]+)"[^>]*>\s*Project Page/i,
    /<a\s+href="([^"]+)"[^>]*>\s*<h2>Project Page/i,
  ];
  for (const pattern of projectPatterns) {
    const match = uncommented.match(pattern);
    if (match) {
      projectLink = match[1];
      break;
    }
  }

  // Overview image - find images from images/research/ (not thumbnails, not layout, not subdirs)
  let overviewImage: string | null = null;
  const imgMatches = uncommented.matchAll(
    /src="images\/research\/([^"]+)"/g
  );
  for (const m of imgMatches) {
    const imgPath = m[1];
    // Skip thumbnails and subdirectory images
    if (!imgPath.startsWith("thumbnails/") && !imgPath.includes("/")) {
      overviewImage = `/images/research/${imgPath}`;
      break; // Use first one as the overview
    }
  }

  return { abstract, paperLink, videoLink, projectLink, overviewImage };
}

// ── Parse bibtex file ──

interface BibtexData {
  year: number;
  venue: string;
  volume: string;
  number: string;
  pages: string;
  authors: string[];
}

function parseBibtexFile(slug: string): BibtexData | null {
  const path = join(OLD_SITE, "bibtex", `${slug}.txt`);
  if (!existsSync(path)) return null;

  const content = readLegacyEncoding(path);

  const yearMatch = content.match(/year\s*=\s*\{?\s*(\d{4})\s*\}?/i);
  const venueMatch =
    content.match(/journal\s*=\s*\{([^}]+)\}/i) ||
    content.match(/booktitle\s*=\s*\{([^}]+)\}/i);
  const volumeMatch = content.match(/volume\s*=\s*\{?(\d+)\}?/i);
  const numberMatch = content.match(/number\s*=\s*\{?(\d+)\}?/i);
  const pagesMatch = content.match(/pages\s*=\s*\{([^}]+)\}/i);
  const authorMatch = content.match(/author\s*=\s*\{([^}]+)\}/i);

  return {
    year: yearMatch ? parseInt(yearMatch[1]) : 0,
    venue: venueMatch ? venueMatch[1].trim() : "",
    volume: volumeMatch ? volumeMatch[1] : "",
    number: numberMatch ? numberMatch[1] : "",
    pages: pagesMatch ? pagesMatch[1].trim() : "",
    authors: authorMatch ? parseBibtexAuthors(authorMatch[1]) : [],
  };
}

// ── Main migration ──

function migrate() {
  // Get all .inc files (these are our paper inventory)
  const incDir = join(OLD_SITE, "includes/research");
  const incFiles = readdirSync(incDir)
    .filter(
      (f) =>
        f.endsWith(".inc") &&
        f !== "seperator.inc" &&
        f !== "simple-seperator.inc"
    )
    .map((f) => basename(f, ".inc"));

  console.log(`Found ${incFiles.length} paper .inc files`);

  // Clear existing papers
  if (existsSync(OUTPUT_DIR)) {
    for (const f of readdirSync(OUTPUT_DIR)) {
      if (f.endsWith(".json")) {
        require("fs").unlinkSync(join(OUTPUT_DIR, f));
      }
    }
  } else {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let success = 0;
  let partial = 0;
  const errors: string[] = [];

  for (const slug of incFiles) {
    try {
      const inc = parseIncFile(slug);
      if (!inc || !inc.title) {
        errors.push(`${slug}: no title from .inc`);
        continue;
      }

      const asp = parseAspFile(slug);
      const bib = parseBibtexFile(slug);

      // Merge data, preferring .inc for metadata, .asp for content, bibtex as fallback
      const title = inc.title;
      let authors = inc.authors.length > 0 ? inc.authors : (bib?.authors ?? []);
      const year = inc.year || bib?.year || 0;
      const abstract = asp?.abstract ?? "";

      // Venue: prefer .inc, fallback to bibtex
      let venue = inc.venue || bib?.venue || "";

      // Pages: prefer .inc, fallback to bibtex
      let pages = inc.pages || bib?.pages || "";

      const paperType = determinePaperType(venue);
      const categories = CATEGORY_MAP[slug] || [];

      const paperLink = asp?.paperLink ?? null;
      const videoLink = asp?.videoLink ?? null;
      const projectLink = asp?.projectLink ?? null;
      const thumbnail = inc.thumbnail || null;
      const overviewImage = asp?.overviewImage ?? null;

      let fileSlug = titleToSlug(title);

      // Handle duplicate slugs
      if (existsSync(join(OUTPUT_DIR, `${fileSlug}.json`))) {
        fileSlug = `${fileSlug}-${year || slug}`;
      }

      const paper = {
        title,
        authors,
        year,
        abstract,
        venue,
        pages,
        paperType,
        categories,
        paperLink,
        videoLink,
        projectLink,
        thumbnail,
        overviewImage,
      };

      writeFileSync(
        join(OUTPUT_DIR, `${fileSlug}.json`),
        JSON.stringify(paper, null, 2) + "\n"
      );

      if (!abstract) {
        partial++;
      } else {
        success++;
      }
    } catch (e) {
      errors.push(`${slug}: ${e}`);
    }
  }

  console.log(`\nMigration complete:`);
  console.log(`  ✓ ${success} papers with full data`);
  console.log(`  ~ ${partial} papers with partial data (no abstract)`);
  console.log(`  ✗ ${errors.length} errors`);
  if (errors.length > 0) {
    console.log("\nErrors:");
    for (const e of errors) console.log(`  - ${e}`);
  }
}

migrate();
