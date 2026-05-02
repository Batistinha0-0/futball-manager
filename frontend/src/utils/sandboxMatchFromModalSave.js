/**
 * @typedef {{
 *   team: "home" | "visitor",
 *   displayName: string,
 *   playerId?: string | null,
 *   gols: number,
 *   assists: number,
 *   assistsBaseline: number,
 *   goalAssistFromName: string,
 *   cartoesAmarelos: number,
 *   cartoesVermelhos: number,
 *   defesas: number,
 * }} SandboxModalSavePayload
 */

/**
 * @param {SandboxModalSavePayload} payload
 */
export function sandboxSaveHasStats(payload) {
  const assistDelta = Math.max(0, (payload.assists ?? 0) - (payload.assistsBaseline ?? 0));
  return (
    payload.gols +
      assistDelta +
      payload.cartoesAmarelos +
      payload.cartoesVermelhos +
      payload.defesas >
    0
  );
}

/**
 * @param {number} n
 * @param {string} one
 * @param {string} manyTpl e.g. "{n} gols"
 */
function nLabel(n, one, manyTpl) {
  if (n <= 0) return null;
  if (n === 1) return one;
  return manyTpl.replace("{n}", String(n));
}

/**
 * @param {SandboxModalSavePayload} payload
 * @param {Record<string, string>} str objeto `strings` de pt-BR
 * @returns {{ headline: string, detail: string } | null}
 */
export function sandboxSaveToTimelineEntry(payload, str) {
  if (!sandboxSaveHasStats(payload)) return null;

  const teamName = payload.team === "home" ? str.jogoRolandoMatchHomeName : str.jogoRolandoMatchVisitorName;
  const player = (payload.displayName || "").trim() || str.jogoRolandoUnknownPlayer;
  const headline = str.jogoRolandoMatchEventHeadline.replace("{player}", player).replace("{team}", teamName);

  const parts = /** @type {string[]} */ ([]);
  const g = nLabel(payload.gols, str.jogoRolandoMatchStatGoals1, str.jogoRolandoMatchStatGoalsN);
  if (g) parts.push(g);
  const assistDelta = Math.max(0, (payload.assists ?? 0) - (payload.assistsBaseline ?? 0));
  const a = nLabel(assistDelta, str.jogoRolandoMatchStatAssists1, str.jogoRolandoMatchStatAssistsN);
  if (a) parts.push(a);
  const y = nLabel(payload.cartoesAmarelos, str.jogoRolandoMatchStatYellow1, str.jogoRolandoMatchStatYellowN);
  if (y) parts.push(y);
  const r = nLabel(payload.cartoesVermelhos, str.jogoRolandoMatchStatRed1, str.jogoRolandoMatchStatRedN);
  if (r) parts.push(r);
  const d = nLabel(payload.defesas, str.jogoRolandoMatchStatSaves1, str.jogoRolandoMatchStatSavesN);
  if (d) parts.push(d);

  return { headline, detail: parts.join(str.jogoRolandoMatchStatSep) };
}

/**
 * Texto principal + sublinha (assistência do gol) para a linha do tempo.
 * @param {SandboxModalSavePayload} payload
 * @param {Record<string, string>} str
 * @returns {{ main: string, sub: string | null } | null}
 */
export function buildSandboxEventParts(payload, str) {
  if (!sandboxSaveHasStats(payload)) return null;
  const name = (payload.displayName || "").trim() || str.jogoRolandoUnknownPlayer;
  const mainParts = /** @type {string[]} */ ([]);
  const assistDelta = Math.max(0, (payload.assists ?? 0) - (payload.assistsBaseline ?? 0));

  if (payload.gols === 1) {
    mainParts.push(str.jogoRolandoMatchMsgGoalOne.replace("{name}", name));
  } else if (payload.gols > 1) {
    mainParts.push(str.jogoRolandoMatchMsgGoalsN.replace("{name}", name).replace("{n}", String(payload.gols)));
  }

  if (assistDelta === 1) {
    mainParts.push(str.jogoRolandoMatchMsgAssistOne.replace("{name}", name));
  } else if (assistDelta > 1) {
    mainParts.push(str.jogoRolandoMatchMsgAssistsN.replace("{name}", name).replace("{n}", String(assistDelta)));
  }

  if (payload.cartoesAmarelos === 1) {
    mainParts.push(str.jogoRolandoMatchMsgYellowOne.replace("{name}", name));
  } else if (payload.cartoesAmarelos > 1) {
    mainParts.push(str.jogoRolandoMatchMsgYellowN.replace("{name}", name).replace("{n}", String(payload.cartoesAmarelos)));
  }

  if (payload.cartoesVermelhos === 1) {
    mainParts.push(str.jogoRolandoMatchMsgRedOne.replace("{name}", name));
  } else if (payload.cartoesVermelhos > 1) {
    mainParts.push(str.jogoRolandoMatchMsgRedN.replace("{name}", name).replace("{n}", String(payload.cartoesVermelhos)));
  }

  if (payload.defesas === 1) {
    mainParts.push(str.jogoRolandoMatchMsgSaveOne.replace("{name}", name));
  } else if (payload.defesas > 1) {
    mainParts.push(str.jogoRolandoMatchMsgSavesN.replace("{name}", name).replace("{n}", String(payload.defesas)));
  }

  let sub = null;
  if (payload.gols > 0) {
    const ap = (payload.goalAssistFromName || "").trim();
    sub = ap ? str.jogoRolandoMatchGoalAssistLine.replace("{name}", ap) : str.jogoRolandoMatchGoalAssistNone;
  }

  return { main: mainParts.join(" "), sub };
}

/**
 * @param {SandboxModalSavePayload} payload
 * @param {Record<string, string>} str
 * @returns {string | null}
 */
export function buildSandboxEventMessage(payload, str) {
  const parts = buildSandboxEventParts(payload, str);
  return parts ? parts.main : null;
}
