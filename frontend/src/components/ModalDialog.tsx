import React, { useEffect, useRef } from 'react';

interface ModalDialogProps {
  isOpen?: boolean;
  onClose: () => void;
  titleId?: string;
  ariaLabel?: string;
  maxWidthClass?: string;
  className?: string;
  children: React.ReactNode;
}

function isPointerOutsideDialog(e: React.PointerEvent<HTMLDialogElement>, dialog: HTMLDialogElement): boolean {
  const rect = dialog.getBoundingClientRect();
  return (
    e.clientX < rect.left ||
    e.clientX > rect.right ||
    e.clientY < rect.top ||
    e.clientY > rect.bottom
  );
}

/**
 * Accessible native <dialog> wrapper using showModal() so browser handles
 * top-layer stacking, Esc/back dismissal, focus containment, and focus return.
 */
export const ModalDialog: React.FC<ModalDialogProps> = ({
  isOpen = true,
  onClose,
  titleId,
  ariaLabel,
  maxWidthClass = 'max-w-4xl',
  className = '',
  children,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressedOutsideRef = useRef<boolean>(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  const handleCancel = (e: React.SyntheticEvent<HTMLDialogElement>) => {
    e.preventDefault();
    onClose();
  };

  const handleClose = () => {
    const dialog = dialogRef.current;
    if (dialog) {
      dialog.returnValue = '';
    }
    if (isOpen) {
      onClose();
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog || ('closedBy' in HTMLDialogElement.prototype)) return;
    pressedOutsideRef.current = isPointerOutsideDialog(e, dialog);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog || ('closedBy' in HTMLDialogElement.prototype)) return;
    if (pressedOutsideRef.current && isPointerOutsideDialog(e, dialog)) {
      pressedOutsideRef.current = false;
      onClose();
      return;
    }
    pressedOutsideRef.current = false;
  };

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: 'any' } as Record<string, string>)}
      onCancel={handleCancel}
      onClose={handleClose}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      aria-labelledby={titleId}
      aria-label={!titleId ? ariaLabel : undefined}
      className={`og-dialog w-full ${maxWidthClass} flex flex-col overflow-hidden ${className}`}
    >
      {children}
    </dialog>
  );
};
