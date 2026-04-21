// Matrix — main visualization. Single scrollable pane.
// Item a & b parameters are inline-editable (click to edit).

function MatrixView({ config, psi, sigma, zeta, showBase }) {
  const { items, nLikert, labels, reversed } = config;
  const reversedSet = React.useMemo(() => new Set(reversed), [reversed]);

  // local override of item params so user can tweak them
  const [overrides, setOverrides] = React.useState({});
  React.useEffect(() => setOverrides({}), [config.id, config.name, items.length]);

  const getItem = (i) => overrides[i] ? { ...items[i], ...overrides[i] } : items[i];

  const rows = items.map((_, i) => {
    const it = getItem(i);
    const isRev = reversedSet.has(i);
    const r = window.grmPlus(it.a, it.b, isRev, psi, sigma, zeta, nLikert);
    return { ...it, idx: i + 1, i, isRev, ...r };
  });

  const totalExpected = rows.reduce((s, r) => s + window.expectedScore(r.plus), 0);
  const totalMax = items.length * (nLikert - 1);

  const setItemParam = (i, key, value) => {
    setOverrides(prev => {
      const cur = prev[i] || {};
      return { ...prev, [i]: { ...cur, [key]: value } };
    });
  };
  const resetItemParams = (i) => {
    setOverrides(prev => { const n = { ...prev }; delete n[i]; return n; });
  };

  return (
    <div className="matrix-view">
      <div className="matrix-scroll">
        <table className="matrix">
          <thead>
            <tr>
              <th className="col-item">Item</th>
              <th className="col-params">Parameters</th>
              {labels.map((lab, k) => (
                <th key={k} className="col-cat">
                  <div className="cat-num">{k}</div>
                  <div className="cat-lab">{lab}</div>
                </th>
              ))}
              <th className="col-exp">E[y]</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <ItemRow
                key={r.i}
                row={r}
                nLikert={nLikert}
                showBase={showBase}
                overridden={!!overrides[r.i]}
                onSetParam={(k, v) => setItemParam(r.i, k, v)}
                onResetParams={() => resetItemParams(r.i)}
              />
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="tfoot-label">Expected total score across all items</td>
              <td colSpan={nLikert} className="tfoot-bar">
                <div className="total-bar">
                  <div className="total-fill" style={{ width: (totalExpected / totalMax * 100) + '%' }} />
                </div>
              </td>
              <td className="tfoot-exp">
                <span className="exp-num">{totalExpected.toFixed(2)}</span>
                <span className="exp-of">/ {totalMax}</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <Legend />
    </div>
  );
}

function ItemRow({ row, nLikert, showBase, overridden, onSetParam, onResetParams }) {
  const mostLikely = window.argmax(row.plus);
  const exp = window.expectedScore(row.plus);
  return (
    <tr className={'item-row' + (row.isRev ? ' is-reversed' : '') + (overridden ? ' is-edited' : '')}>
      <td className="col-item">
        <div className="item-cell">
          <div className="item-idx">{row.idx}</div>
          <div className="item-text">
            {row.text}
            {row.isRev && <span className="rev-badge" title="Reversed item">R ↺</span>}
          </div>
        </div>
      </td>
      <td className="col-params">
        <div className="params">
          <EditParam label="a" value={row.a} min={0.2} max={6} step={0.05}
                     onChange={v => onSetParam('a', v)} />
          <EditParamList b={row.b} onChange={newB => onSetParam('b', newB)} />
          {overridden && (
            <button className="param-reset" onClick={onResetParams} title="reset item parameters">↺</button>
          )}
        </div>
      </td>
      {row.plus.map((p, k) => (
        <ProbCell
          key={k}
          p={p}
          pBase={row.base[k]}
          showBase={showBase}
          isMost={k === mostLikely}
        />
      ))}
      <td className="col-exp">
        <span className="exp-num">{exp.toFixed(2)}</span>
        <span className="exp-of">/ {nLikert - 1}</span>
      </td>
    </tr>
  );
}

function EditParam({ label, value, min, max, step, onChange }) {
  const [txt, setTxt] = React.useState(fmtP(value));
  React.useEffect(() => { setTxt(fmtP(value)); }, [value]);
  const commit = () => {
    const v = Number(txt);
    if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
    else setTxt(fmtP(value));
  };
  return (
    <label className="param">
      <span className="pk">{label}</span>
      <input
        className="pv-input"
        value={txt}
        onChange={e => setTxt(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') { commit(); e.target.blur(); } }}
      />
    </label>
  );
}

function EditParamList({ b, onChange }) {
  return (
    <>
      {b.map((bk, k) => (
        <EditParam key={k}
          label={<>b<sub>{k+1}</sub></>}
          value={bk}
          min={-5} max={5} step={0.01}
          onChange={v => {
            const nb = b.slice(); nb[k] = v; onChange(nb);
          }}
        />
      ))}
    </>
  );
}

function ProbCell({ p, pBase, showBase, isMost }) {
  const pct = (p * 100).toFixed(0);
  return (
    <td className={'cell' + (isMost ? ' is-most' : '')}>
      <div className="cell-bar-wrap">
        {showBase && (
          <div className="cell-bar-base" style={{ height: (pBase * 100) + '%' }} />
        )}
        <div className="cell-bar" style={{ height: (p * 100) + '%' }} />
      </div>
      <div className="cell-pct">{pct}<span className="pct-sign">%</span></div>
    </td>
  );
}

function Legend() {
  return (
    <div className="legend">
      <div className="legend-item"><span className="legend-sw sw-most" /> most-likely response</div>
      <div className="legend-item"><span className="legend-sw sw-bar" /> P(response) under GRM+</div>
      <div className="legend-item"><span className="legend-sw sw-base" /> base GRM (pre-ζ)</div>
      <div className="legend-item"><span className="rev-badge small">R ↺</span> reversed item</div>
      <div className="legend-item legend-hint">tip · click any parameter value to edit</div>
    </div>
  );
}

function fmtP(v) {
  if (v === 0) return '0.00';
  const s = (+v).toFixed(2);
  return (v > 0 ? '+' : '') + s;
}

Object.assign(window, { MatrixView });
