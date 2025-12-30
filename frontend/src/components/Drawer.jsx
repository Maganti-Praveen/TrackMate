import { X } from 'lucide-react';

const Drawer = ({ isOpen, title, subtitle, onClose, children, footer }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      {/* Panel */}
      <section
        className="absolute right-0 top-0 h-full w-full max-w-md transform bg-slate-900 border-l border-white/10 shadow-2xl transition-transform duration-300 ease-out animate-slide-left"
        aria-label={title}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <header className="border-b border-white/10 px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                {subtitle && <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>}
              </div>
              <button
                type="button"
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
                onClick={onClose}
                aria-label="Close panel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </header>
          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
          {/* Footer */}
          {footer && <footer className="border-t border-white/10 px-5 py-4 safe-bottom">{footer}</footer>}
        </div>
      </section>
    </div>
  );
};

export default Drawer;
