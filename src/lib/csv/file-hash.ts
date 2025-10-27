export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// NEW: Generate exact header signature (sorted JSON)
export function generateHeaderSignature(headers: string[]): string {
  const sortedHeaders = [...headers].sort();
  return JSON.stringify(sortedHeaders);
}

// NEW: Compare headers for exact match
export function headersMatch(headers1: string[], headers2: string[]): boolean {
  if (headers1.length !== headers2.length) return false;
  const sorted1 = [...headers1].sort();
  const sorted2 = [...headers2].sort();
  return sorted1.every((header, index) => header === sorted2[index]);
}

export function generateFileHash(content: string): string {
  // Hash first 10KB + last 1KB for large files (performance)
  const sample =
    content.length > 10000
      ? content.slice(0, 10000) + content.slice(-1000)
      : content;
  return hashString(sample);
}
