import { strings } from "../../strings/pt-BR.js";
import { Modal } from "../atoms/Modal.jsx";
import { Button } from "../atoms/Button.jsx";
import { Text } from "../atoms/Text.jsx";

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   titleId: string,
 *   title: string,
 *   children: import("react").ReactNode,
 *   footer?: import("react").ReactNode,
 *   dismissOnBackdrop?: boolean,
 *   dismissOnEscape?: boolean,
 * }} props
 */
export function ModalDialog({
  open,
  onClose,
  titleId,
  title,
  children,
  footer,
  dismissOnBackdrop = true,
  dismissOnEscape = true,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      dismissOnBackdrop={dismissOnBackdrop}
      dismissOnEscape={dismissOnEscape}
    >
      <div className="fm-modal-dialog">
        <header className="fm-modal-dialog__header">
          <Text as="h2" id={titleId} className="fm-modal-dialog__title">
            {title}
          </Text>
          <Button
            type="button"
            onClick={onClose}
            className="fm-modal-dialog__close"
            aria-label={strings.usersAdminModalClose}
          >
            ×
          </Button>
        </header>
        <div className="fm-modal-dialog__body">{children}</div>
        {footer ? <footer className="fm-modal-dialog__footer">{footer}</footer> : null}
      </div>
    </Modal>
  );
}
