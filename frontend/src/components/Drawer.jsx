const Drawer = ({ isOpen, title, subtitle, onClose, children, footer }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      <section
        className="absolute right-0 top-0 h-full w-full max-w-lg transform bg-slate-50/95 text-slate-900 shadow-2xl transition-transform duration-300 ease-out backdrop-blur-2xl"
        aria-label={title}
      >
        <div className="flex h-full flex-col">
          <header className="border-b border-slate-200/60 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Control Panel</p>
                <h3 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h3>
                {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
              </div>
              <button
                type="button"
                className="rounded-full border border-slate-200/80 p-2 text-slate-500 transition hover:text-slate-900"
                onClick={onClose}
                aria-label="Close panel"
              >
                &times;
              </button>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
          {footer && <footer className="border-t border-slate-200/60 px-6 py-4">{footer}</footer>}
        </div>
      </section>
    </div>
  );
};

export default Drawer;
