const ConfirmDialog = ({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel }) => {
  return (
    <div
      className={`fixed inset-0 z-50 ${open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'} transition-opacity duration-200`}
      aria-hidden={!open}
    >
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onCancel} />
      <section
        className={`absolute left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 rounded-3xl border border-white/10 bg-slate-900/80 p-6 text-white shadow-2xl backdrop-blur ${
          open ? '-translate-y-1/2 opacity-100' : '-translate-y-1/3 opacity-0'
        } transition-all duration-200`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Warning</p>
        <h3 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h3>
        {message && <p className="mt-2 text-sm text-slate-300">{message}</p>}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            className="flex-1 rounded-2xl border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="flex-1 rounded-2xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-rose-500/40 transition hover:bg-rose-600"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
};

export default ConfirmDialog;
