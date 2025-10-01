export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

export function generateHeaderSignature(headers: string[]): string {
  const sortedHeaders = [...headers].sort().join("|");
  return hashString(sortedHeaders);
}

export function generateFileHash(content: string): string {
  // Hash first 10KB + last 1KB for large files (performance)
  const sample =
    content.length > 10000
      ? content.slice(0, 10000) + content.slice(-1000)
      : content;
  return hashString(sample);
}
