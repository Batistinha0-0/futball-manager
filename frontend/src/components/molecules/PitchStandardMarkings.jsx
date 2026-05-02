import { PitchBorderRect } from "../atoms/PitchBorderRect.jsx";
import { PitchCenterCircle } from "../atoms/PitchCenterCircle.jsx";
import { PitchCenterSpot } from "../atoms/PitchCenterSpot.jsx";
import { PitchHalfwayLine } from "../atoms/PitchHalfwayLine.jsx";
import { PitchPenaltyArea } from "../atoms/PitchPenaltyArea.jsx";
import { PitchPenaltyMark } from "../atoms/PitchPenaltyMark.jsx";
import { PitchSixYardBox } from "../atoms/PitchSixYardBox.jsx";

/**
 * Conjunto de linhas FIFA simplificado (sem arcos de canto nem meia-lua da grande área).
 * @param {{ strokeWidth?: number }} props
 */
export function PitchStandardMarkings({ strokeWidth = 0.28 }) {
  return (
    <g className="fm-pitch-top__lines" aria-hidden="true">
      <PitchBorderRect strokeWidth={strokeWidth} />
      <PitchHalfwayLine strokeWidth={strokeWidth} />
      <PitchCenterCircle strokeWidth={strokeWidth} />
      <PitchCenterSpot />
      <PitchPenaltyArea end="north" strokeWidth={strokeWidth} />
      <PitchSixYardBox end="north" strokeWidth={strokeWidth} />
      <PitchPenaltyMark end="north" />
      <PitchPenaltyArea end="south" strokeWidth={strokeWidth} />
      <PitchSixYardBox end="south" strokeWidth={strokeWidth} />
      <PitchPenaltyMark end="south" />
    </g>
  );
}
