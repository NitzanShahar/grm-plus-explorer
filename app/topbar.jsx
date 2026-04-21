// Top bar: back + scale title.

function TopBar({ config, onBack }) {
  return (
    <header className="topbar">
      <button className="back-btn" onClick={onBack} title="Back to scale selection">
        <span className="back-arrow">←</span>
        <span className="back-label">Change scale</span>
      </button>

      <div className="scale-picker">
        <div className="tb-label">Questionnaire</div>
        <div className="tb-title">{config.name}</div>
        <div className="tb-source">{config.source} · {config.items.length} items · {config.nLikert}-pt Likert{config.reversed.length > 0 ? ` · ${config.reversed.length} reversed` : ''}</div>
      </div>

      <div className="brand">
        <div className="brand-mark">GRM+</div>
        <div className="brand-sub">Explorer</div>
      </div>
    </header>
  );
}

function defaultLikertLabels(K) {
  if (K === 2) return ['No', 'Yes'];
  if (K === 3) return ['Disagree', 'Neutral', 'Agree'];
  if (K === 4) return ['Strongly disagree', 'Disagree', 'Agree', 'Strongly agree'];
  if (K === 5) return ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'];
  if (K === 6) return ['Strongly disagree', 'Disagree', 'Slightly disagree', 'Slightly agree', 'Agree', 'Strongly agree'];
  return ['Strongly disagree', 'Disagree', 'Slightly disagree', 'Neutral', 'Slightly agree', 'Agree', 'Strongly agree'];
}

Object.assign(window, { TopBar, defaultLikertLabels });
