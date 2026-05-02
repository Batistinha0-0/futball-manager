import { useEffect } from "react";
import { strings } from "../../strings/pt-BR.js";

/**
 * Camada base: fundo escuro + painel. O conteúdo (cabeçalho, corpo) fica nos filhos.
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   labelledBy?: string,
 *   children: import("react").ReactNode,
 *   dismissOnBackdrop?: boolean,
 *   dismissOnEscape?: boolean,
 * }} props
 */
export function Modal({
  open,
  onClose,
  labelledBy,
  children,
  dismissOnBackdrop = true,
  dismissOnEscape = true,
}) {
  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(/** @type {KeyboardEvent} */ e) {
      if (e.key === "Escape" && dismissOnEscape) onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, dismissOnEscape]);

  if (!open) return null;

  return (
    <div className="fm-modal" aria-hidden={false}>
      {dismissOnBackdrop ? (
        <button
          type="button"
          className="fm-modal__backdrop"
          aria-label={strings.usersAdminModalDismissBackdrop}
          onClick={onClose}
        />
      ) : (
        <div className="fm-modal__backdrop" aria-hidden="true" />
      )}
      <div
        className="fm-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
