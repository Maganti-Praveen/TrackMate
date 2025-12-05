const GlassCard = ({ className = '', children }) => {
  return (
    <section className={`surface-card rounded-3xl p-6 shadow-2xl shadow-black/40 ring-1 ring-white/5 ${className}`}>
      {children}
    </section>
  );
};

export default GlassCard;
