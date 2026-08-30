/**
 * Tokenizer for Aruna chatbot.
 * Indonesian + English stop words, log-scaled TF indexing.
 * @module aruna/tokenizer
 */

const STOP_WORDS = new Set([
  // Indonesian
  'yang', 'dan', 'di', 'ke', 'dari', 'untuk', 'pada', 'dengan', 'adalah',
  'itu', 'ini', 'atau', 'juga', 'karena', 'sebagai', 'dalam', 'tidak',
  'bisa', 'ada', 'akan', 'oleh', 'saat', 'apa', 'bagaimana', 'berapa',
  'kapan', 'siapa', 'dimana', 'apakah', 'nya', 'pun', 'telah', 'sudah',
  'kami', 'mereka', 'saya', 'anda', 'kamu', 'kita', 'jika', 'maka',
  'secara', 'tentang', 'terhadap', 'antara', 'hingga', 'sampai', 'lebih',
  'paling', 'sangat', 'hanya', 'belum', 'bila', 'kalau', 'yaitu', 'yakni',
  'saja', 'sih', 'dong', 'kah', 'kan', 'banget', 'gimana', 'gak', 'nggak', 'enggak', 'mau', 'ingin', 'pengen',
  // English
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
  'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
  'once', 'me', 'my', 'myself', 'we', 'our', 'you', 'your', 'he', 'she',
  'it', 'they', 'them', 'what', 'which', 'who', 'whom', 'this', 'that',
  'these', 'those', 'i', 'and', 'but', 'or', 'nor', 'not', 'so', 'very',
  'just', 'than', 'too', 'also', 'about', 'up', 'all', 'any', 'both',
  'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'show', 'tell', 'give', 'get', 'see', 'look', 'find', 'search',
]);

export interface TokenizedQuery {
  terms: string[];
  original: string;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

/**
 * Tokenize WITHOUT stopword removal. Intent detection uses this so keywords
 * that also appear in the stopword list ("bisa", "apa", "kamu") still match.
 */
export function tokenizeRaw(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1);
}

export function buildQuery(text: string): TokenizedQuery {
  return {
    terms: tokenize(text),
    original: text,
  };
}

export function isStopWord(word: string): boolean {
  return STOP_WORDS.has(word.toLowerCase());
}

/**
 * Light multilingual stemmer (en + id). Strips common suffixes conservatively
 * so words like "analysis" or "api" are not over-stemmed.
 * @param word - single lowercase word
 * @returns stemmed word
 */
export function stem(word: string): string {
  if (word.length <= 3) return word;
  let w = word.replace(/ing$/, '').replace(/ed$/, '');
  w = w.replace(/es$/, '');
  // Plural 's' — only when the preceding char is not a vowel/s/z, to avoid
  // mangling words like "analysis", "status", or "bus".
  if (/([^aeious])s$/.test(w)) w = w.replace(/s$/, '');
  return w.replace(/(nya|kah|lah)$/, '');
}

/**
 * Tokenize + stem. Query-side counterpart to `tokenize` (which stays unstemmed
 * for intent keyword matching).
 * @param text - raw query text
 * @returns stemmed content tokens
 */
export function tokenizeV2(text: string): string[] {
  return tokenize(text).map(stem);
}

export function buildQueryV2(text: string): TokenizedQuery {
  return { terms: tokenizeV2(text), original: text };
}
