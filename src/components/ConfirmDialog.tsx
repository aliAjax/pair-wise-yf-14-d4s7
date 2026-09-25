interface Props {
  open: boolean;
  title: string;
  message: string;
  saveLabel?: string;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  saveLabel = "保存并切换",
  onSave,
  onDiscard,
  onCancel,
}: Props) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={onCancel}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="modal-ops">
          <button className="primary" onClick={onSave}>
            {saveLabel}
          </button>
          <button className="danger-ghost" onClick={onDiscard}>
            放弃改动并切换
          </button>
          <button onClick={onCancel}>继续编辑</button>
        </div>
      </div>
    </div>
  );
}
