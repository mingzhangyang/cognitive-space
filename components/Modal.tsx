import React from 'react';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  cardClassName?: string;
  isDismissable?: boolean;
};

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  cardClassName = '',
  isDismissable = true
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = () => {
    if (isDismissable) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className={`modal-card ${cardClassName}`.trim()} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

export default Modal;
