# D-IRT Explorer

**Live demo: https://nitzanshahar.github.io/grm-plus-explorer/**

An interactive, single-page explainer for **Distilled-Item Response Theory (D-IRT, also written GRM+)**: a graded response model extended with two person-level parameters, response noise σ (which divides the item logit, flattening or sharpening every item for that person) and acquiescence ζ (a linear tilt of the log-probability "choice values" toward agreement, applied on the raw response scale after reverse-keyed items are flipped). Move the sliders for the trait ψ, noise σ and acquiescence ζ, and for an item's discrimination *a*, thresholds *b*, number of categories *K* and keying, and watch three live views: the category probabilities for one item, the item's expected-answer and category curves across ψ, and a simulated questionnaire showing how noise and acquiescence distort the sum score relative to the true trait. Settings are stored in the page URL, so a configuration can be shared as a link.

## How it is built

Plain HTML, CSS and JavaScript in [`docs/`](docs), with no build step and no third-party requests (no fonts, analytics or cookies). GitHub Pages serves the `docs/` folder of `main`.

- [`docs/model.js`](docs/model.js): the response model, a line-by-line port of the likelihood in the paper's Stan model (`GRM+_sigma_acq.stan`) and R simulator (`GRM+_sigma_acq.R`).
- [`docs/app.js`](docs/app.js): controls, URL state and the SVG charts.
- [`tests/`](tests): checks `model.js` against the reference R simulator.

To run locally, serve the folder with any static server, e.g.

```bash
python -m http.server 8000 --directory docs
```

and open http://localhost:8000.

## Checking the model against the reference R code

```bash
Rscript tests/reference_probs.R path/to/GRM+_sigma_acq.R > ref.jsonl
node tests/check-model.mjs ref.jsonl
```

The R script evaluates the reference `generate_irt()` on 480 random item/person settings (K = 2…7, normal and reverse-keyed) and records its category probabilities; the Node script compares them with `model.js` (current maximum difference: 4e-16).
