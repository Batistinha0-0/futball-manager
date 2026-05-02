/**
 * Duas letras para exibir no campo (primeiro nome + último nome, ou duas letras do único nome).
 * @param {string | null | undefined} displayName
 * @returns {string} "" se não houver nome utilizável
 */
export function initialsFromDisplayName(displayName) {
  if (displayName == null || typeof displayName !== "string") return "";
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) {
    const w = parts[0];
    if (w.length <= 1) return w.toUpperCase();
    return w.slice(0, 2).toUpperCase();
  }
  const a = parts[0][0] ?? "";
  const b = parts[parts.length - 1][0] ?? "";
  return `${a}${b}`.toUpperCase();
}
