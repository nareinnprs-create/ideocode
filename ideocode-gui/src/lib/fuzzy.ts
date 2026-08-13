export interface FuzzyMatch {
  score: number;
  indices: number[];
}

const SPECIAL = /[\s/\\_-]+/g;

function normalizedTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(SPECIAL, " ")
    .split(" ")
    .filter(Boolean);
}

function matchToken(token: string, text: string): FuzzyMatch | null {
  if (!token) return null;
  let score = 0;
  let ti = 0;
  const indices: number[] = [];
  let consecutive = 0;
  for (let i = 0; i < text.length && ti < token.length; i++) {
    if (text[i] === token[ti]) {
      indices.push(i);
      if (i === 0 || text[i - 1] === " ") {
        score += 8;
        consecutive = 0;
      } else if (consecutive > 0) {
        consecutive += 1;
        score += 1 + consecutive;
      } else {
        consecutive = 1;
        score += 2;
      }
      ti++;
    }
  }
  if (ti !== token.length) return null;
  return { score, indices };
}

export function fuzzySearch(query: string, target: string): FuzzyMatch | null {
  const q = query.trim();
  if (!q) return null;
  const qTokens = normalizedTokens(q);
  const text = target.toLowerCase();
  if (qTokens.length === 1 && !q.includes(" ")) {
    return matchToken(qTokens[0], text);
  }
  const tokens = normalizedTokens(target);
  if (tokens.length === 0) return null;

  let total = 0;
  const allIndices: number[] = [];
  for (const token of qTokens) {
    let best: FuzzyMatch | null = null;
    for (const t of tokens) {
      const m = matchToken(token, t);
      if (m && (!best || m.score > best.score)) best = m;
    }
    if (!best) return null;
    total += best.score;
    allIndices.push(...best.indices);
  }
  return { score: total, indices: allIndices };
}
