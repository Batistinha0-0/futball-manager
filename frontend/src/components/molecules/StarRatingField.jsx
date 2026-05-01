import { strings } from "../../strings/pt-BR.js";
import { Text } from "../atoms/Text.jsx";
import { IconStarGlyph } from "../atoms/IconStarGlyph.jsx";
import { InputDropdown } from "./InputDropdown.jsx";

const STAR_LEVELS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

/**
 * Garante 0–5 em passos de 0,5 (meias inteiras), aceitando string com vírgula.
 * @param {unknown} raw
 */
export function normalizeHalfStars(raw) {
  const s = typeof raw === "string" ? raw.trim().replace(",", ".") : raw;
  const n = typeof s === "string" ? Number.parseFloat(s) : Number(s);
  if (!Number.isFinite(n)) return 0;
  const clamped = Math.min(5, Math.max(0, n));
  const halves = Math.round(clamped * 2);
  return halves / 2;
}

/**
 * @param {{ halfSteps: number }} props — halfSteps: 0..10 (cada estrela = 2 meias)
 */
function StarPreview({ halfSteps }) {
  const h = Math.min(10, Math.max(0, Math.round(halfSteps)));

  return (
    <div className="fm-star-rating__preview" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => {
        const remaining = h - i * 2;
        const state = remaining >= 2 ? "full" : remaining >= 1 ? "half" : "empty";

        return (
          <span key={i} className={`fm-star-rating__preview-slot fm-star-rating__preview-slot--${state}`}>
            <IconStarGlyph className="fm-star-rating__preview-track" />
            {state !== "empty" ? (
              <span
                className={`fm-star-rating__preview-fill fm-star-rating__preview-fill--${state === "full" ? "full" : "half"}`}
              >
                <IconStarGlyph className="fm-star-rating__preview-fill-svg" />
              </span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

function formatStarOptionLabel(v) {
  if (v === 0) return strings.squadStarsOpt0;
  const num = v.toLocaleString("pt-BR", {
    minimumFractionDigits: v % 1 ? 1 : 0,
    maximumFractionDigits: 1,
  });
  if (v === 5) return `${num} — ${strings.squadStarsOpt5}`;
  return num;
}

function formatStarReadout(v) {
  if (!Number.isFinite(v) || v <= 0) return "0";
  const halves = Math.round(v * 2);
  if (halves % 2 === 0) return String(halves / 2);
  return `${(halves - 1) / 2}.5`.replace(".", ",");
}

const STAR_LEVEL_OPTIONS = STAR_LEVELS.map((v) => ({
  value: String(v),
  label: formatStarOptionLabel(v),
}));

/**
 * Nível 0–5 em passos de 0,5: pré-visualização de estrelas + menu (select).
 * @param {{
 *   id: string,
 *   label: string,
 *   value: number,
 *   onChange: (n: number) => void,
 *   disabled?: boolean,
 *   hint?: string,
 * }} props
 */
export function StarRatingField({ id, label, value, onChange, disabled = false, hint }) {
  const safe = normalizeHalfStars(value);
  const display = formatStarReadout(safe);
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className="fm-field fm-field--star-rating">
      <Text as="label" id={`${id}-label`} htmlFor={id} className="fm-field__label">
        {label}
      </Text>
      <div
        className="fm-star-rating"
        role="group"
        aria-labelledby={`${id}-label`}
        {...(hintId ? { "aria-describedby": hintId } : {})}
      >
        <div className="fm-star-rating__top">
          <StarPreview halfSteps={Math.round(safe * 2)} />
          <div className="fm-star-rating__readout" aria-live="polite">
            <span className="fm-star-rating__readout-icon" aria-hidden="true">
              ★
            </span>
            <span className="fm-star-rating__readout-num">{display}</span>
            <span className="fm-star-rating__readout-max" aria-hidden="true">
              /5
            </span>
          </div>
        </div>
        <InputDropdown
          id={id}
          value={String(safe)}
          onChange={(v) => {
            onChange(normalizeHalfStars(v));
          }}
          options={STAR_LEVEL_OPTIONS}
          disabled={disabled}
          ariaLabelledby={`${id}-label`}
          wrapClassName="fm-select-wrap fm-select-wrap--star fm-select-wrap--custom"
        />
      </div>
      {hint && hintId ? (
        <p id={hintId} className="fm-star-rating__hint fm-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
