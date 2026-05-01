import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { InputDropdownOption } from "../atoms/InputDropdownOption.jsx";
import { InputDropdownTrigger } from "../atoms/InputDropdownTrigger.jsx";

/**
 * @param {string} selectId
 * @param {string} value
 */
function optionDomId(selectId, value) {
  const key = value === "" ? "_empty" : value.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${selectId}-opt-${key}`;
}

/** Compara posições com tolerância (subpixels de getBoundingClientRect). */
function placementNear(
  /** @type {null | { side: string, left: number, width: number, maxHeight: number, top?: number, bottom?: number }} */ a,
  /** @type {null | { side: string, left: number, width: number, maxHeight: number, top?: number, bottom?: number }} */ b,
) {
  if (a === b) return true;
  if (!a || !b) return false;
  const near = (x, y) => Math.abs(x - y) < 0.6;
  if (a.side !== b.side || !near(a.left, b.left) || !near(a.width, b.width) || !near(a.maxHeight, b.maxHeight)) return false;
  if (a.side === "down") return near(/** @type {number} */ (a.top), /** @type {number} */ (b.top));
  return near(/** @type {number} */ (a.bottom), /** @type {number} */ (b.bottom));
}

/**
 * Dropdown de valor estilo input: único componente da app para este padrão.
 * Menu em portal com posição vertical (cima/baixo) e clamp horizontal na viewport.
 *
 * @param {{
 *   id: string,
 *   value: string,
 *   onChange: (value: string) => void,
 *   options: { value: string, label: string }[],
 *   disabled?: boolean,
 *   ariaLabelledby: string,
 *   wrapClassName?: string,
 * }} props
 */
export function InputDropdown({
  id,
  value,
  onChange,
  options,
  disabled = false,
  ariaLabelledby,
  wrapClassName = "fm-select-wrap fm-select-wrap--custom",
}) {
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [menuEnter, setMenuEnter] = useState(false);
  const [placement, setPlacement] = useState(
    /** @type {{ side: "up" | "down", left: number, width: number, maxHeight: number, top?: number, bottom?: number } | null} */ (
      null
    ),
  );
  const triggerRef = useRef(/** @type {HTMLButtonElement | null} */ (null));
  const menuRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  /** Evita re-disparar animação de entrada a cada atualização de `placement` (ex.: scroll). */
  const playedOpenEnterRef = useRef(false);
  const listId = `${id}-listbox`;

  const selected = options.find((o) => o.value === value);
  const triggerLabel = selected?.label ?? value ?? "";

  /** Superfície do menu (aberto ou em animação de saída); não exige `placement` — evita deadlock na 1ª abertura. */
  const menuSurface = open || leaving;
  const showMenu = menuSurface && placement;

  const updatePlacement = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 6;
    const edge = 8;
    const minMenu = 100;
    const cap = Math.min(window.innerHeight * 0.42, 280);

    const below = window.innerHeight - r.bottom - gap - edge;
    const above = r.top - gap - edge;

    const maxDown = Math.min(cap, Math.max(0, below));
    const maxUp = Math.min(cap, Math.max(0, above));

    const downOk = maxDown >= minMenu;
    const upOk = maxUp >= minMenu;

    /** @type {"up" | "down"} */
    let side = "down";
    let maxHeight = Math.max(minMenu, maxDown);

    if (!downOk && upOk) {
      side = "up";
      maxHeight = Math.max(minMenu, maxUp);
    } else if (downOk && upOk) {
      if (maxUp > maxDown + 28) {
        side = "up";
        maxHeight = Math.max(minMenu, maxUp);
      }
    } else if (!downOk && !upOk) {
      if (above >= below) {
        side = "up";
        maxHeight = Math.max(72, maxUp);
      } else {
        side = "down";
        maxHeight = Math.max(72, maxDown);
      }
    } else {
      side = "down";
      maxHeight = Math.max(minMenu, maxDown);
    }

    let left = r.left;
    const width = r.width;
    const maxLeft = window.innerWidth - edge - width;
    const minLeft = edge;
    left = Math.min(Math.max(left, minLeft), Math.max(minLeft, maxLeft));

    if (side === "down") {
      const next = { side, top: r.bottom + gap, left, width, maxHeight };
      setPlacement((prev) => (placementNear(prev, next) ? prev : next));
      return;
    }

    const bottom = window.innerHeight - r.top + gap;
    const next = { side, bottom, left, width, maxHeight };
    setPlacement((prev) => (placementNear(prev, next) ? prev : next));
  }, []);

  useLayoutEffect(() => {
    if (!menuSurface) return undefined;
    updatePlacement();
    const raf = window.requestAnimationFrame(() => updatePlacement());
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
    };
  }, [menuSurface, updatePlacement]);

  useLayoutEffect(() => {
    if (!open || leaving) {
      playedOpenEnterRef.current = false;
      if (!open) setMenuEnter(false);
      return undefined;
    }
    if (!placement) return undefined;
    if (playedOpenEnterRef.current) return undefined;
    setMenuEnter(false);
    const idRaf = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setMenuEnter(true);
        playedOpenEnterRef.current = true;
      });
    });
    return () => window.cancelAnimationFrame(idRaf);
  }, [open, leaving, placement]);

  useEffect(() => {
    if (!leaving || open) return undefined;
    const el = menuRef.current;
    if (!el) {
      setLeaving(false);
      return undefined;
    }
    let done = false;
    function finish() {
      if (done) return;
      done = true;
      setLeaving(false);
    }
    const fallbackMs = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 360;
    const fallbackId =
      fallbackMs === 0
        ? window.requestAnimationFrame(() => finish())
        : window.setTimeout(finish, fallbackMs);
    function onEnd(/** @type {TransitionEvent} */ e) {
      if (e.target !== el) return;
      if (e.propertyName !== "opacity" && e.propertyName !== "transform") return;
      if (typeof fallbackId === "number" && fallbackMs > 0) window.clearTimeout(fallbackId);
      finish();
    }
    el.addEventListener("transitionend", onEnd);
    return () => {
      el.removeEventListener("transitionend", onEnd);
      if (fallbackMs > 0) window.clearTimeout(fallbackId);
      else window.cancelAnimationFrame(fallbackId);
    };
  }, [leaving, open]);

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(/** @type {PointerEvent} */ e) {
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
      setLeaving(true);
      setMenuEnter(false);
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open]);

  useEffect(() => {
    if (!open && !leaving) return undefined;
    function onKey(/** @type {KeyboardEvent} */ e) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        setLeaving(true);
        setMenuEnter(false);
        triggerRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, leaving]);

  const menuReady = Boolean(menuSurface && placement);
  useLayoutEffect(() => {
    if (!menuReady || !menuRef.current) return;
    const selectedEl = menuRef.current.querySelector(".fm-input-dropdown__option.is-selected");
    if (selectedEl instanceof HTMLElement) selectedEl.scrollIntoView({ block: "nearest" });
  }, [menuReady, value]);

  function toggle() {
    if (disabled) return;
    if (open) {
      setOpen(false);
      setLeaving(true);
      setMenuEnter(false);
      return;
    }
    setLeaving(false);
    setOpen(true);
  }

  function pick(next) {
    onChange(next);
    setOpen(false);
    setLeaving(true);
    setMenuEnter(false);
    triggerRef.current?.focus();
  }

  return (
    <div className="fm-input-dropdown">
      <div className={wrapClassName}>
        <InputDropdownTrigger
          id={id}
          triggerRef={triggerRef}
          open={open}
          disabled={disabled}
          ariaControls={listId}
          ariaLabelledby={ariaLabelledby}
          onToggle={toggle}
        >
          {triggerLabel}
        </InputDropdownTrigger>
      </div>
      {showMenu && placement
        ? createPortal(
            <div
              ref={menuRef}
              id={listId}
              className={`fm-input-dropdown__menu${placement.side === "up" ? " fm-input-dropdown__menu--up" : ""}${menuEnter ? " is-entered" : ""}`}
              role="listbox"
              aria-labelledby={ariaLabelledby}
              data-side={placement.side}
              style={{
                position: "fixed",
                left: placement.left,
                width: placement.width,
                maxHeight: placement.maxHeight,
                zIndex: 1100,
                ...(placement.side === "down"
                  ? { top: placement.top, bottom: "auto" }
                  : { bottom: placement.bottom, top: "auto" }),
              }}
            >
              <ul className="fm-input-dropdown__list">
                {options.map((opt) => (
                  <InputDropdownOption
                    key={opt.value === "" ? "__empty__" : opt.value}
                    optionId={optionDomId(id, opt.value)}
                    selected={opt.value === value}
                    onSelect={() => pick(opt.value)}
                  >
                    {opt.label}
                  </InputDropdownOption>
                ))}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
