import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { getPitchSlotsForSides } from "../../utils/pitchPlayerSlots.js";
import { PitchGrassPlane } from "../molecules/PitchGrassPlane.jsx";
import { PitchPlayerLayer } from "../molecules/PitchPlayerLayer.jsx";
import { PitchStandardMarkings } from "../molecules/PitchStandardMarkings.jsx";
import { PitchPlayerLiveStatsModal } from "./PitchPlayerLiveStatsModal.jsx";

/**
 * Campo de futebol visto de cima (proporções ~68×105 m).
 * Ao tocar num jogador abre um modal de eventos (sandbox).
 * @param {{
 *   className?: string,
 *   "aria-label": string,
 *   playersPerSide?: number,
 *   homeLineup?: (string | null | undefined)[],
 *   visitorLineup?: (string | null | undefined)[],
 *   homeLineupPlayerIds?: (string | null | undefined)[],
 *   visitorLineupPlayerIds?: (string | null | undefined)[],
 *   onLiveStatsPersist?: (payload: import("../../utils/sandboxMatchFromModalSave.js").SandboxModalSavePayload) => void | Promise<void>,
 *   matchPlaying?: boolean,
 * }} props
 */
export function FootballPitchTopDown({
  className = "",
  "aria-label": ariaLabel,
  playersPerSide = 6,
  homeLineup,
  visitorLineup,
  homeLineupPlayerIds,
  visitorLineupPlayerIds,
  onLiveStatsPersist,
  matchPlaying = false,
}) {
  const uid = useId().replace(/:/g, "");
  const gradientId = `fm-pitch-grass-${uid}`;
  const { home, visitor } = getPitchSlotsForSides(playersPerSide);

  const [selected, setSelected] = useState(
    /** @type {null | { team: "home" | "visitor", index: number, displayName: string, playerId?: string | null }} */ (
      null
    ),
  );

  const dismiss = useCallback(() => {
    setSelected(null);
  }, []);

  const onSelectPlayer = useCallback((detail) => {
    setSelected(detail);
  }, []);

  useEffect(() => {
    if (!matchPlaying) setSelected(null);
  }, [matchPlaying]);

  const idleClass = matchPlaying ? "" : " fm-pitch-top--match-idle";

  const teammateAssistOptions = useMemo(() => {
    if (!selected) return [];
    const raw = selected.team === "home" ? homeLineup : visitorLineup;
    const self = selected.displayName.trim().toLowerCase();
    return (raw ?? [])
      .slice(0, playersPerSide)
      .map((n) => String(n ?? "").trim())
      .filter((n) => n.length > 0 && n.toLowerCase() !== self);
  }, [selected, homeLineup, visitorLineup, playersPerSide]);

  return (
    <div className={`fm-pitch-top fm-pitch-top--interactive${idleClass} ${className}`.trim()}>
      <div className="fm-pitch-top__surface">
        <svg
          className="fm-pitch-top__svg"
          viewBox="0 0 68 105"
          role="img"
          aria-label={ariaLabel}
          preserveAspectRatio="xMidYMid meet"
        >
          <PitchGrassPlane gradientId={gradientId} />
          <g className="fm-pitch-top__markings" fill="rgb(255 255 255 / 0.92)" stroke="rgb(255 255 255 / 0.92)">
            <PitchStandardMarkings />
          </g>
          <PitchPlayerLayer
            home={home}
            visitor={visitor}
            homeLineup={homeLineup}
            visitorLineup={visitorLineup}
            homeLineupPlayerIds={homeLineupPlayerIds}
            visitorLineupPlayerIds={visitorLineupPlayerIds}
            selected={selected}
            onSelectPlayer={matchPlaying ? onSelectPlayer : undefined}
          />
        </svg>
      </div>
      <PitchPlayerLiveStatsModal
        open={Boolean(selected)}
        onClose={dismiss}
        displayName={selected?.displayName ?? ""}
        resolvedPlayerId={selected?.playerId ?? null}
        isGoalkeeper={selected?.index === 0}
        playerKey={selected ? `${selected.team}-${selected.index}` : ""}
        team={selected?.team ?? "home"}
        teammateAssistOptions={teammateAssistOptions}
        onPersistStats={onLiveStatsPersist}
      />
    </div>
  );
}
