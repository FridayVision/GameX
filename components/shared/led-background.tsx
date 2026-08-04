export function LedBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div className="led-orange" />
      <div className="led-teal" />
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 30%, #080808 95%)' }}
      />
    </div>
  )
}
