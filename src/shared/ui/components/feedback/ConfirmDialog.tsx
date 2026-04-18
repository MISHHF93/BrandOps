import { ReactNode } from 'react';
import { Button } from '../primitives/Button';
import { Modal } from '../layout/Modal';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary' | 'secondary';
  onConfirm: () => void;
  onCancel: () => void;
  details?: ReactNode;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  onCancel,
  details,
  loading = false
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'primary' ? 'primary' : tone === 'secondary' ? 'secondary' : 'danger'} onClick={onConfirm} disabled={loading}>
            {loading ? 'Working…' : confirmLabel}
          </Button>
        </div>
      }
    >
      {details ? <div className="text-body text-textMuted">{details}</div> : null}
    </Modal>
  );
}

