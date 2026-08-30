/**
 * Intent detection engine with fuzzy matching.
 * Pattern-based routing + Levenshtein distance for typo tolerance.
 * @module aruna/intent
 */

import type { IntentType, IntentResult } from './types';
import { tokenizeRaw, tokenize, isStopWord } from './tokenizer';

interface IntentPattern {
  keywords: string[];
  intent: IntentType;
  weight: number;
}

const INTENT_PATTERNS: IntentPattern[] = [
  {
    keywords: ['hello', 'hi', 'hey', 'halo', 'hai', 'selamat', 'pagi', 'siang', 'sore', 'malam', 'morning', 'afternoon', 'evening'],
    intent: 'greeting',
    weight: 1.0,
  },
  {
    keywords: ['project', 'projects', 'work', 'works', 'portfolio', 'proyek', 'aplikasi', 'app', 'website', 'built', 'build', 'created', 'develop', 'show', 'list', 'see', 'view', 'lihat', 'tampilkan', 'ada', 'punya'],
    intent: 'search_project',
    weight: 1.0,
  },
  {
    keywords: ['skill', 'skills', 'tech', 'technology', 'stack', 'tools', 'can', 'bisa', 'menguasai', 'keahlian', 'teknologi', 'framework', 'bahasa', 'language', 'programming'],
    intent: 'search_skill',
    weight: 1.0,
  },
  {
    keywords: ['contact', 'kontak', 'email', 'github', 'linkedin', 'reach', 'hubungi', 'menghubungi', 'whatsapp', 'wa', 'telepon', 'phone', 'call', 'message', 'pesan', 'cv', 'resume', 'linkedin', 'social'],
    intent: 'contact',
    weight: 1.0,
  },
  {
    keywords: ['experience', 'experiences', 'pengalaman', 'magang', 'internship', 'intern', 'kerja', 'bekerja', 'career', 'karir', 'worked', 'role', 'peran', 'asisten', 'dosen'],
    intent: 'search_experience',
    weight: 1.0,
  },
  {
    keywords: ['blog', 'article', 'articles', 'artikel', 'post', 'posts', 'tulisan', 'menulis', 'writing', 'read', 'baca'],
    intent: 'search_blog',
    weight: 1.0,
  },
  {
    keywords: ['education', 'educations', 'pendidikan', 'study', 'studies', 'kampus', 'university', 'kuliah', 'degree', 'gelar', 'major', 'jurusan', 'sarjana', 'lulusan', 'gpa', 'ipk', 'school', 'sekolah', 'learn', 'belajar', 'materi'],
    intent: 'education',
    weight: 1.0,
  },
  {
    keywords: ['certification', 'certifications', 'certificate', 'sertifikasi', 'sertifikat', 'sertified', 'bersertifikat', 'bnsp'],
    intent: 'certification',
    weight: 1.0,
  },
  {
    keywords: ['competition', 'competitions', 'kompetisi', 'lomba', 'contest', 'award', 'penghargaan', 'juara', 'winner', 'pemenang', 'won', 'menang', 'ranked', 'peringkat', 'iconic', 'techno', 'innovatech'],
    intent: 'competition',
    weight: 1.0,
  },
  {
    keywords: ['organization', 'organisasi', 'organisation', 'wri', 'mentor', 'himpunan', 'secretary', 'sekretaris', 'society', 'ukm'],
    intent: 'organization',
    weight: 1.0,
  },
  {
    keywords: ['available', 'availability', 'open', 'opportunity', 'opportunities', 'hire', 'hiring', 'rekrut', 'lowongan', 'tersedia', 'siap', 'kesempatan', 'work', 'works', 'kerja', 'bekerja', 'remote', 'relokasi', 'wfh', 'collaborate', 'kolaborasi', 'freelance', 'contract', 'kontrak'],
    intent: 'availability',
    weight: 1.0,
  },
  {
    keywords: ['where', 'location', 'lokasi', 'based', 'berbasis', 'berada', 'domisili', 'tinggal', 'city', 'kota', 'malang', 'jawa', 'address', 'alamat', 'mana', 'dimana'],
    intent: 'location',
    weight: 1.0,
  },
  {
    keywords: ['about', 'who', 'siapa', 'kenalan', 'perkenalan', 'kenalin', 'intro', 'kenal', 'ceritakan', 'tell', 'profile', 'biodata', 'introduce', 'perkenalkan', 'diri', 'raihan', 'yourself', 'tentangmu', 'deskripsi'],
    intent: 'about',
    weight: 1.0,
  },
  {
    keywords: ['help', 'bantuan', 'command', 'commands', 'perintah', 'fitur', 'feature', 'what can', 'apa yang bisa', 'guide', 'panduan', 'menu'],
    intent: 'help',
    weight: 1.0,
  },
  {
    keywords: ['reset', 'clear', 'hapus', 'bersihkan', 'mulai', 'ulang', 'start', 'fresh', 'new'],
    intent: 'reset',
    weight: 1.0,
  },
  {
    keywords: ['theme', 'tema', 'mode', 'dark', 'light', 'gallery', 'terminal', 'editorial', 'swiss', 'ganti', 'change', 'switch'],
    intent: 'theme',
    weight: 1.0,
  },
  {
    keywords: ['thanks', 'thank', 'terima', 'kasih', 'makasih', 'terima kasih', 'bagus', 'good', 'nice', 'great', 'awesome', 'keren'],
    intent: 'thanks',
    weight: 1.0,
  },
  {
    keywords: ['bye', 'goodbye', 'dadah', 'sampai', 'jumpa', 'see you', 'later', 'dah'],
    intent: 'farewell',
    weight: 1.0,
  },
];

/** Search-kind intents win ties against generic intents like "about"/"help". */
function intentPriority(intent: IntentType): number {
  switch (intent) {
    case 'search_project':
    case 'search_skill':
    case 'search_blog':
    case 'search_experience':
      return 2;
    case 'about':
    case 'help':
      return 0;
    default:
      return 1;
  }
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function fuzzyMatch(input: string, keyword: string, threshold: number = 2, strict: boolean = false): boolean {
  if (input === keyword) return true;
  // Stopwords may ONLY match exactly — otherwise "are"→"career" or "in"→"intern"
  // would hijack intents in otherwise-ambiguous queries.
  if (isStopWord(input) || isStopWord(keyword)) return false;
  // Morphological variants ("certifications" ⊃ "certification").
  if (input.includes(keyword)) return true;
  // A query token as a substring of a keyword ("cat" ⊂ "certificate") is almost
  // always a false positive for short tokens — require a meaningful length.
  if (keyword.includes(input) && input.length >= 4) return true;
  // In strict mode (single-token queries) never fuzzy-match — a lone word is
  // usually an entity ("saturt") and must not hijack an intent like "start".
  if (strict) return false;
  // Only run Levenshtein on sufficiently long tokens — short words (≤3 chars)
  // produce false positives ("dot"→"dong", "are"→"app").
  const shortLen = Math.min(input.length, keyword.length);
  if (shortLen < 4) return false;
  if (Math.abs(input.length - keyword.length) > threshold) return false;
  // Short words tolerate fewer edits — "pernah"→"peran" or "kontak"→"kota"
  // (both distance 2) are false positives, not typos.
  const maxDist = shortLen >= 6 ? threshold : 1;
  return levenshtein(input, keyword) <= maxDist;
}

interface IntentScore {
  score: number;
  /** Longest matched keyword — used to break ties (more specific wins). */
  bestKeyword: number;
}

/**
 * Score an intent pattern by the number and strength of its matched keywords.
 * Normalizes by match count (not total keywords) so a single exact keyword wins
 * over a large pattern that only fuzzily touches one word.
 */
function calculateIntentScore(words: string[], pattern: IntentPattern, strict: boolean = false): IntentScore {
  let score = 0;
  let matchCount = 0;
  let bestKeyword = 0;

  for (const word of words) {
    for (const keyword of pattern.keywords) {
      if (fuzzyMatch(word, keyword, 2, strict)) {
        matchCount++;
        bestKeyword = Math.max(bestKeyword, keyword.length);
        if (word === keyword) {
          score += pattern.weight * 1.0;
        } else if (word.includes(keyword) || keyword.includes(word)) {
          score += pattern.weight * 0.85;
        } else {
          score += pattern.weight * 0.5;
        }
      }
    }
  }

  if (matchCount > 0) {
    score = score / (0.5 + matchCount);
  }

  return { score: Math.min(score, 1.0), bestKeyword };
}

export function detectIntent(input: string): IntentResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { intent: 'unknown', confidence: 0, entities: [] };
  }

  // Direct command check (startsWith /)
  if (trimmed.startsWith('/')) {
    const cmd = trimmed.split(/\s+/)[0].slice(1).toLowerCase();
    const cmdMap: Record<string, IntentType> = {
      help: 'help',
      reset: 'reset',
      project: 'search_project',
      projects: 'search_project',
      skill: 'search_skill',
      skills: 'search_skill',
      experience: 'search_experience',
      experiences: 'search_experience',
      blog: 'search_blog',
      posts: 'search_blog',
      education: 'education',
      certification: 'certification',
      certificate: 'certification',
      competition: 'competition',
      organization: 'organization',
      availability: 'availability',
      location: 'location',
      contact: 'contact',
      about: 'about',
      theme: 'theme',
    };
    const intent = cmdMap[cmd] || 'unknown';
    const args = trimmed.split(/\s+/).slice(1).join(' ');
    return {
      intent,
      confidence: 1.0,
      entities: args ? [args] : [],
    };
  }

  // Score against raw tokens so intent keywords that are also stopwords
  // ("bisa", "apa", "kamu") still match. Extract entities from filtered tokens
  // so the search query stays clean.
  const rawWords = tokenizeRaw(trimmed);
  const words = tokenize(trimmed);
  const strict = rawWords.length <= 1;

  let bestIntent: IntentType = 'unknown';
  let bestScore = 0;
  let bestKeyword = 0;
  let bestPrio = -1;

  for (const pattern of INTENT_PATTERNS) {
    const { score, bestKeyword: kw } = calculateIntentScore(rawWords, pattern, strict);
    const prio = intentPriority(pattern.intent);
    if (
      score > bestScore ||
      (score === bestScore && prio > bestPrio) ||
      (score === bestScore && prio === bestPrio && kw > bestKeyword)
    ) {
      bestScore = score;
      bestKeyword = kw;
      bestPrio = prio;
      bestIntent = pattern.intent;
    }
  }

  const confidence = bestScore >= 0.3 ? bestScore : 0;

  // "apa itu X" / "what is X" whose subject only matched via fuzzy/substring is
  // a definitional question about an entity ("Cat Stories", "SatuRT") — not a
  // topic. Route it to a plain search unless a token matched a keyword exactly
  // ("what is your major?" → education via 'major').
  const anyExact = rawWords.some((word) =>
    INTENT_PATTERNS.some((p) => p.keywords.some((k) => word === k.toLowerCase())),
  );
  // Only true definitional questions ("apa itu X" / "what is X") — NOT
  // "apa yang kamu kerjakan" (a work question) or "apa kabar" (greeting).
  if (!anyExact && confidence > 0) {
    const defEn = /^what(?:'s| is| are)\s+(?:the\s+)?(.+)$/i.exec(trimmed);
    const defId =
      /^(?:apa|apakah)\s+itu\s+(.+)$/i.exec(trimmed) ??
      /^(?:apa|apakah)\s+yang dimaksud\s+(?:dengan\s+|dgn\s+)?(.+)$/i.exec(trimmed);
    const def = defEn ?? defId;
    if (def && def[1].trim()) {
      const entityWords = tokenize(def[1]);
      if (entityWords.length) {
        return { intent: 'unknown', confidence: 0.7, entities: entityWords };
      }
    }
  }

  const intentPattern = INTENT_PATTERNS.find((pattern) => pattern.intent === bestIntent);
  const intentTerms = new Set(
    intentPattern?.keywords.flatMap((keyword) => keyword.toLowerCase().split(/\s+/)) || [],
  );
  const queryTerms = words.filter((word) => !intentTerms.has(word));

  return {
    intent: confidence > 0 ? bestIntent : 'unknown',
    confidence,
    // Only keep terms that are NOT intent keywords; when nothing remains the
    // query is generic ("what skills do you have?") → empty entities so the
    // engine can fall back to a broad listing.
    entities: queryTerms,
  };
}

export function isCommand(input: string): boolean {
  return input.trim().startsWith('/');
}

export function getCommandFromInput(input: string): { cmd: string; args: string } {
  const parts = input.trim().split(/\s+/);
  return {
    cmd: parts[0].slice(1).toLowerCase(),
    args: parts.slice(1).join(' '),
  };
}
