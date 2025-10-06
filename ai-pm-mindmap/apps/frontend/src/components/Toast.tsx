interface ToastProps {
  message: string;
  onDismiss: () => void;
}

const Toast = ({ message, onDismiss }: ToastProps) => (
  <div className="pointer-events-auto rounded border border-emerald-500/30 bg-emerald-500/20 px-4 py-2 text-sm text-emerald-100 shadow-lg">
    <div className="flex items-start justify-between gap-4">
      <span>{message}</span>
      <button className="text-xs uppercase" type="button" onClick={onDismiss}>
        Close
      </button>
    </div>
  </div>
);

export default Toast;
