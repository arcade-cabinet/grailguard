/**
 * @module LoadingScreen
 *
 * Minimal loading indicator displayed as the Suspense fallback while
 * route chunks are being fetched via React.lazy().
 */
export function LoadingScreen() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100vw',
        height: '100vh',
        backgroundColor: '#0a0a0a',
        color: '#d4af37',
        fontFamily: 'serif',
        fontSize: '1.5rem',
      }}
    >
      Loading&hellip;
    </div>
  );
}
