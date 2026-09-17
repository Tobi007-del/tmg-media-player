// ============ Caption/Subtitle Utilities ============

const ESC_DICT: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export const stripTags = (text: string): string => text.replace(/<(\/)?([a-z0-9.:]+)([^>]*)>/gi, "");

export function srtToVtt(srt: string, vttLines: string[] = ["WEBVTT", ""]): string {
  const input = srt.replace(/\r\n?/g, "\n").trim();
  for (const block of input.split(/\n{2,}/)) {
    const lines = block.split("\n");
    let idx = /^\d+$/.test(lines[0].trim()) ? 1 : 0;
    const timing = lines[idx]?.trim().replace(/\s+/g, " "),
      m = timing?.match(/(\d{1,2}:\d{2}:\d{2})(?:[.,](\d{1,3}))?\s*-->\s*(\d{1,2}:\d{2}:\d{2})(?:[.,](\d{1,3}))?/);
    if (!m) continue;
    const [, startHms, startMsRaw = "0", endHms, endMsRaw = "0"] = m,
      to3 = (ms: string) => ms.padEnd(3, "0").slice(0, 3);
    vttLines.push(`${startHms}.${to3(startMsRaw)} --> ${endHms}.${to3(endMsRaw)}`);
    for (let i = idx + 1; i < lines.length; i++) vttLines.push(lines[i]);
    vttLines.push("");
  }
  return vttLines.join("\n");
}

export function parseVttText(text: string): string {
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESC_DICT[c]!),
    state = { tag: /\<(\/)?(\d[\d:.]*|\w+)([^>]*)>/gi, o: "", l: 0, p: null as string | null, c: "", spans: [] as string[] };
  let m: RegExpExecArray | null;
  while ((m = state.tag.exec(text))) {
    const chunk = text.slice(state.l, m.index);
    if (chunk) state.c += esc(chunk);
    const [_, cls, tag_n, rest] = m,
      low = tag_n.toLowerCase();
    if (/^[0-9]/.test(tag_n)) {
      state.o += state.p ? `<span data-part="timed" data-time="${state.p}">${state.c}${state.spans.map(() => "</span>").join("")}</span>` : state.c;
      (state.p = tag_n), (state.c = state.spans.join(""));
    } else if (cls) /^(c|v|lang)$/.test(low) ? ((state.c += "</span>"), state.spans.pop()) : (state.c += `</${low}>`);
    else if (/^(b|i|u|ruby|rt)$/.test(low)) state.c += `<${low}>`;
    else if (low === "c") state.c += state.spans[state.spans.push(`<span class="vtt-c ${rest.replace(/\.([a-z0-9_-]+)/gi, "$1 ").trim()}">`) - 1];
    else if (low === "v") state.c += state.spans[state.spans.push(`<span data-part="voice" data-badge="${esc(rest.trim()) || "Speaker"}">`) - 1];
    else if (low === "lang") state.c += state.spans[state.spans.push(`<span lang="${esc(rest.trim())}">`) - 1];
    state.l = state.tag.lastIndex;
  }
  const lChunk = text.slice(state.l);
  if (lChunk) state.c += esc(lChunk);
  return state.o + (state.p ? `<span data-part="timed" data-time="${state.p}">${state.c}</span>` : state.c);
}

export function formatVttLine(p: string, maxChars: number): string[] {
  const state = { tokens: p.match(/<[^>]+>|\s+|[^<\s]+/g) || [], stack: [] as string[], parts: [] as string[], line: "", len: 0, openStr: "", closeStr: "", timeTag: "", lastWasTag: false, pendingSpace: false },
    updateTags = () => ((state.openStr = state.stack.map((n) => `<${n}>`).join("")), (state.closeStr = state.stack.reduceRight((a, n) => a + `</${n}>`, ""))),
    flush = () => state.line && (state.parts.push(state.line + state.closeStr), (state.line = (state.timeTag || "") + state.openStr), (state.len = 0), (state.lastWasTag = true));
  for (const tok of state.tokens) {
    const tag = tok[0] === "<",
      closeTag = tag && tok[1] === "/";
    if (tag) {
      const m = tok.match(/^<\/?\s*([a-z0-9._:-]+)/i),
        n = m?.[1] || "",
        timing = /^\d/.test(n);
      if (timing) {
        state.pendingSpace && ((state.line += " "), (state.len += 1));
        (state.pendingSpace = false), (state.timeTag = tok), (state.line += tok), (state.lastWasTag = true);
        continue;
      }
      state.pendingSpace = false;
      if (state.line && !state.lastWasTag && !closeTag) state.line += " ";
      if (!closeTag && !tok.endsWith("/>") && n) state.stack.push(n), updateTags();
      if (closeTag && state.stack.length) state.stack.pop(), updateTags();
      (state.lastWasTag = true), (state.line += tok);
      continue;
    }
    if (tok[0] <= " ") {
      (state.pendingSpace = !!state.line), (state.lastWasTag = false);
      continue;
    }
    state.pendingSpace = false;
    const len = stripTags(tok).length,
      needSpace = state.line && !state.lastWasTag;
    if (state.len + (needSpace ? 1 : 0) + len > maxChars) flush();
    if (needSpace) (state.line += " "), (state.len += 1);
    (state.line += tok), (state.len += len), (state.lastWasTag = false);
  }
  return flush(), state.parts;
}
