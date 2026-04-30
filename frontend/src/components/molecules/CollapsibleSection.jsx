import { useId, useState } from "react";
import { IconChevronDown } from "../atoms/IconChevronDown.jsx";
import { Text } from "../atoms/Text.jsx";

/**
 * Secção com título clicável; conteúdo expande/recolhe com animação (grid 0fr → 1fr).
 * @param {{
 *   title: string,
 *   defaultOpen?: boolean,
 *   className?: string,
 *   children: import("react").ReactNode,
 * }} props
 */
export function CollapsibleSection({ title, defaultOpen = false, className = "", children }) {
  const reactId = useId();
  const panelId = `collapsible-panel-${reactId.replace(/:/g, "")}`;
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={`fm-collapsible ${open ? "fm-collapsible--open" : ""} ${className}`.trim()}
    >
      <button
        type="button"
        className="fm-collapsible__trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <Text as="span" className="fm-collapsible__title">
          {title}
        </Text>
        <IconChevronDown className="fm-collapsible__chevron" />
      </button>
      <div id={panelId} className="fm-collapsible__panel" aria-hidden={!open}>
        <div className="fm-collapsible__inner">
          {children}
        </div>
      </div>
    </div>
  );
}
