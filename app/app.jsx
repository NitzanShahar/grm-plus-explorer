// Two-screen app: Setup → Matrix.

const DEFAULTS = { psi: 0, sigma: 1, zeta: 0 };

function App() {
  const [config, setConfig] = React.useState(null);

  // person parameters (live)
  const [psi,   setPsi]   = React.useState(DEFAULTS.psi);
  const [sigma, setSigma] = React.useState(DEFAULTS.sigma);
  const [zeta,  setZeta]  = React.useState(DEFAULTS.zeta);
  const [showBase, setShowBase] = React.useState(false);

  if (!config) {
    return <Setup onContinue={(cfg) => {
      setPsi(DEFAULTS.psi); setSigma(DEFAULTS.sigma); setZeta(DEFAULTS.zeta);
      setConfig(cfg);
    }} />;
  }

  return (
    <div className="app">
      <TopBar
        config={config}
        onBack={() => setConfig(null)}
      />
      <SliderBar
        psi={psi}   setPsi={setPsi}
        sigma={sigma} setSigma={setSigma}
        zeta={zeta}  setZeta={setZeta}
        showBase={showBase} setShowBase={setShowBase}
      />
      <MatrixView
        config={config}
        psi={psi} sigma={sigma} zeta={zeta}
        showBase={showBase}
      />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
