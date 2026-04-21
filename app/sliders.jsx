// Horizontal slider bar with editable value + reset per parameter.

function SliderBar({ psi, setPsi, sigma, setSigma, zeta, setZeta, showBase, setShowBase }) {
  return (
    <div className="sliderbar">
      <ParamSlider
        sym="ψ" name="psi" sub="latent trait"
        hint="Responder's level on the construct. Higher = more of the trait."
        min={-3} max={3} step={0.05} value={psi} onChange={setPsi} reset={0}
        ticks={[-3, -2, -1, 0, 1, 2, 3]}
      />
      <ParamSlider
        sym="σ" name="sigma" sub="response noise"
        hint="Scales the logistic. Larger σ flattens response curves toward uniform."
        min={0.2} max={4} step={0.05} value={sigma} onChange={setSigma} reset={1}
        ticks={[0.5, 1, 2, 3, 4]}
      />
      <ParamSlider
        sym="ζ" name="zeta" sub="acquiescence bias"
        hint="Positive ζ pulls responses toward the high end; negative toward the low end."
        min={-3} max={3} step={0.05} value={zeta} onChange={setZeta} reset={0}
        ticks={[-3, -2, -1, 0, 1, 2, 3]}
      />
      <div className="sliderbar-toggles">
        <label className="chip-toggle">
          <input type="checkbox" checked={showBase} onChange={e => setShowBase(e.target.checked)} />
          <span>overlay base GRM (pre-ζ)</span>
        </label>
      </div>
    </div>
  );
}

function ParamSlider({ sym, name, sub, hint, min, max, step, value, onChange, reset, ticks }) {
  const pct = ((value - min) / (max - min)) * 100;
  const [txt, setTxt] = React.useState(String(value));
  React.useEffect(() => { setTxt(fmt2(value)); }, [value]);

  const commitTxt = () => {
    const v = Number(txt);
    if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
    else setTxt(fmt2(value));
  };

  return (
    <div className="pslider">
      <div className="pslider-head">
        <div className="ps-label">
          <span className="ps-sym">{sym}</span>
          <span className="ps-sub">{sub}</span>
        </div>
        <div className="ps-ctrl">
          <input
            className="ps-input"
            value={txt}
            onChange={e => setTxt(e.target.value)}
            onBlur={commitTxt}
            onKeyDown={e => { if (e.key === 'Enter') { commitTxt(); e.target.blur(); } }}
          />
          <button className="ps-reset" onClick={() => onChange(reset)} title={`reset ${sym} to ${reset}`}>↺</button>
        </div>
      </div>
      <div className="pslider-track-wrap">
        <input
          type="range"
          min={min} max={max} step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="pslider-range"
          style={{ '--pct': pct + '%' }}
        />
        <div className="pslider-ticks">
          {ticks.map(t => (
            <span key={t} className="ptick" style={{ left: ((t - min)/(max-min))*100 + '%' }}>
              <i /><em>{t}</em>
            </span>
          ))}
        </div>
      </div>
      <div className="pslider-hint">{hint}</div>
    </div>
  );
}

function fmt2(v) {
  const s = (+v).toFixed(2);
  return (v > 0 ? '+' : '') + s;
}

Object.assign(window, { SliderBar });
