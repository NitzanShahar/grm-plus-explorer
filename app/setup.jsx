// Setup screen — pick a preset scale or configure a custom one.

function Setup({ onContinue }) {
  const [customOn, setCustomOn] = React.useState(false);
  const [customSettings, setCustomSettings] = React.useState({ nItems: 8, nLikert: 5, nReversed: 0 });
  const [customCfg, setCustomCfg] = React.useState(null);

  const genCustom = React.useCallback((s) => {
    const { nItems, nLikert, nReversed } = s;
    const items = window.generateItemParams(nItems, nLikert).map((it, i) => ({ ...it, idx: i + 1 }));
    const reversed = [];
    if (nReversed > 0) {
      const step = nItems / nReversed;
      for (let i = 0; i < nReversed; i++) {
        reversed.push(Math.min(nItems - 1, Math.floor(step / 2 + i * step)));
      }
    }
    const cfg = {
      id: 'custom',
      name: `Custom · ${nItems} items · ${nLikert}-pt Likert`,
      source: 'Parameters sampled from priors matched to R-GPTS ranges.',
      nLikert,
      labels: window.defaultLikertLabels(nLikert),
      items,
      reversed,
    };
    setCustomCfg(cfg);
    return cfg;
  }, []);

  React.useEffect(() => {
    if (customOn && !customCfg) genCustom(customSettings);
  }, [customOn]);

  const pickPreset = (id) => {
    const p = window.PRESET_LIST.find(x => x.id === id);
    onContinue({
      id: p.id, name: p.name, source: p.source,
      nLikert: p.nLikert, labels: p.labels,
      items: p.items.map((it, i) => ({ ...it, idx: i + 1 })),
      reversed: p.reversed || [],
    });
  };

  const updateCustom = (s) => {
    setCustomSettings(s);
    genCustom(s);
  };

  return (
    <div className="setup">
      <div className="setup-inner">
        <div className="setup-head">
          <div className="brand-mark big">GRM+</div>
          <h1 className="setup-title">Explorer</h1>
          <p className="setup-lede">
            Visualize how a responder's latent trait (ψ), response noise (σ) and
            acquiescence bias (ζ) reshape response probabilities under the GRM+
            item-response model. Pick a validated scale, or configure a custom one.
          </p>
        </div>

        <div className="setup-cards">
          {window.PRESET_LIST.map(p => (
            <button key={p.id} className="scard" onClick={() => pickPreset(p.id)}>
              <div className="scard-name">{p.name}</div>
              <div className="scard-src">{p.source}</div>
              <div className="scard-meta">
                <span>{p.items.length} items</span>
                <span>·</span>
                <span>{p.nLikert}-pt Likert</span>
                {(p.reversed || []).length > 0 && <><span>·</span><span>{p.reversed.length} reversed</span></>}
              </div>
              <div className="scard-cta">Open →</div>
            </button>
          ))}

          <div className={'scard custom' + (customOn ? ' on' : '')}>
            <label className="scard-head-row">
              <input
                type="checkbox"
                checked={customOn}
                onChange={e => setCustomOn(e.target.checked)}
              />
              <span className="scard-name">Custom scale</span>
            </label>
            <div className="scard-src">Sampled priors — a ∼ N(3.0, 0.7); thresholds ordered around item-specific centers.</div>

            {customOn && customCfg && (
              <>
                <div className="custom-fields">
                  <MiniNumField label="items"    min={2} max={30} value={customSettings.nItems}
                    onChange={v => updateCustom({ ...customSettings, nItems: v, nReversed: Math.min(customSettings.nReversed, v) })} />
                  <MiniNumField label="K"        min={2} max={7}  value={customSettings.nLikert}
                    onChange={v => updateCustom({ ...customSettings, nLikert: v })} />
                  <MiniNumField label="reversed" min={0} max={customSettings.nItems} value={customSettings.nReversed}
                    onChange={v => updateCustom({ ...customSettings, nReversed: v })} />
                  <button className="regen-btn" onClick={() => genCustom(customSettings)} title="Regenerate parameters">
                    <span className="regen-ico">↻</span> regenerate
                  </button>
                </div>
                <button className="scard-cta big" onClick={() => onContinue(customCfg)}>
                  Continue with custom →
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniNumField({ label, min, max, value, onChange }) {
  return (
    <label className="mini-num">
      <span>{label}</span>
      <input type="number" min={min} max={max} value={value}
        onChange={e => { const v = Number(e.target.value); if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v))); }} />
    </label>
  );
}

Object.assign(window, { Setup });
