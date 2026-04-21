// IRT item-parameter banks for preset questionnaires.
// Each item: { text, a, b[] }  with Nlikert implied by b.length + 1.
// reversed: index list of reversed items (none for these three clinical scales).

// --- R-GPTS Reference (5-point Likert, 0..4) — Freeman et al. 2021, Table 4 ---
const RGPTS_REF = {
  id: 'rgpts_ref',
  name: 'R-GPTS — Ideas of Reference',
  source: 'Freeman et al. (2021), Psychological Medicine',
  nLikert: 5,
  labels: ['Not at all', 'Somewhat', 'Moderately', 'Very', 'Totally'],
  reversed: [],
  items: [
    { text: 'I spent time thinking about friends gossiping about me.',            a: 2.65, b: [-0.10, 0.44, 1.17, 1.69] },
    { text: 'I often heard people referring to me.',                               a: 2.55, b: [-0.12, 0.53, 1.13, 1.74] },
    { text: 'I have been upset by friends and colleagues judging me critically.',  a: 2.40, b: [-0.17, 0.48, 1.09, 1.67] },
    { text: 'People definitely laughed at me behind my back.',                     a: 3.69, b: [ 0.17, 0.62, 0.97, 1.38] },
    { text: 'I have been thinking a lot about people avoiding me.',                a: 2.47, b: [ 0.10, 0.66, 1.26, 1.84] },
    { text: 'People have been dropping hints for me.',                             a: 2.80, b: [ 0.31, 0.83, 1.31, 1.84] },
    { text: 'I believed that certain people were not what they seemed.',           a: 2.10, b: [-0.51, 0.10, 0.73, 1.32] },
    { text: 'People talking about me behind my back upset me.',                    a: 3.37, b: [-0.07, 0.36, 0.80, 1.22] },
  ],
};

// --- R-GPTS Persecution (5-point Likert, 0..4) — Freeman et al. 2021, Table 4 ---
const RGPTS_PER = {
  id: 'rgpts_per',
  name: 'R-GPTS — Ideas of Persecution',
  source: 'Freeman et al. (2021), Psychological Medicine',
  nLikert: 5,
  labels: ['Not at all', 'Somewhat', 'Moderately', 'Very', 'Totally'],
  reversed: [],
  items: [
    { text: 'Certain individuals have had it in for me.',                            a: 2.95, b: [ 0.20, 0.71, 1.28, 1.70] },
    { text: 'People wanted me to feel threatened, so they stared at me.',            a: 2.87, b: [ 0.75, 1.14, 1.58, 2.02] },
    { text: 'I was certain people did things in order to annoy me.',                 a: 2.43, b: [-0.10, 0.46, 1.08, 1.61] },
    { text: 'I was convinced there was a conspiracy against me.',                    a: 3.68, b: [ 0.79, 1.08, 1.43, 1.75] },
    { text: 'I was sure someone wanted to hurt me.',                                 a: 4.25, b: [ 0.78, 1.08, 1.39, 1.68] },
    { text: 'I couldn’t stop thinking about people wanting to confuse me.',          a: 3.15, b: [ 0.65, 1.02, 1.49, 1.89] },
    { text: 'I was distressed by being persecuted.',                                 a: 4.45, b: [ 0.77, 1.07, 1.40, 1.75] },
    { text: 'It was difficult to stop thinking about people wanting to make me feel bad.', a: 3.99, b: [ 0.40, 0.79, 1.21, 1.59] },
    { text: 'People have been hostile towards me on purpose.',                       a: 3.54, b: [ 0.35, 0.79, 1.24, 1.63] },
    { text: 'I was angry that someone wanted to hurt me.',                           a: 3.59, b: [ 0.63, 0.98, 1.35, 1.69] },
  ],
};

// --- PHQ-9 (4-point Likert, 0..3) — Cumbe et al. 2020, Table 3 ---
// Two items (PHQ6, PHQ9) reported N/R at b2 — we interpolate (b1 + b3)/2.
const PHQ9 = {
  id: 'phq9',
  name: 'PHQ-9 — Depression Screener',
  source: 'Cumbe et al. (2020), BMC Psychiatry',
  nLikert: 4,
  labels: ['Not at all', 'Several days', 'More than half', 'Nearly every day'],
  reversed: [],
  items: [
    { text: 'Little interest or pleasure in doing things.',                                               a: 2.00, b: [-0.04, 1.94, 2.41] },
    { text: 'Feeling down, depressed, or hopeless.',                                                      a: 1.78, b: [ 0.25, 2.26, 2.57] },
    { text: 'Trouble falling or staying asleep, or sleeping too much.',                                   a: 1.40, b: [ 0.12, 1.94, 2.25] },
    { text: 'Feeling tired or having little energy.',                                                     a: 1.83, b: [-0.31, 1.93, 2.17] },
    { text: 'Poor appetite or overeating.',                                                               a: 1.29, b: [ 0.40, 2.25, 2.69] },
    { text: 'Feeling bad about yourself — or that you are a failure or have let yourself or your family down.', a: 1.78, b: [ 1.53, 2.12, 2.71] }, // b2 interp
    { text: 'Trouble concentrating on things, such as reading the newspaper or watching TV.',             a: 1.74, b: [ 0.56, 2.31, 2.51] },
    { text: 'Moving or speaking so slowly that other people could have noticed — or being so fidgety or restless that you have been moving around a lot more than usual.', a: 2.08, b: [ 0.60, 2.32, 2.57] },
    { text: 'Thoughts that you would be better off dead or of hurting yourself in some way.',             a: 1.63, b: [ 2.00, 2.72, 3.44] }, // b2 interp
  ],
};

// --- PCL-5 (5-point Likert, 0..4) — Mekawi et al. 2022, Table 2 ---
// Item text uses standard DSM-5 PCL-5 symptom descriptors.
const PCL5 = {
  id: 'pcl5',
  name: 'PCL-5 — PTSD Checklist',
  source: 'Mekawi et al. (2022), Journal of Anxiety Disorders',
  nLikert: 5,
  labels: ['Not at all', 'A little bit', 'Moderately', 'Quite a bit', 'Extremely'],
  reversed: [],
  items: [
    { text: 'Repeated, disturbing, and unwanted memories of the stressful experience.',                 a: 0.860, b: [-0.525,  0.094,  0.407,  0.983] },
    { text: 'Repeated, disturbing dreams of the stressful experience.',                                  a: 0.791, b: [-0.012,  0.443,  0.724,  1.354] },
    { text: 'Suddenly feeling or acting as if the stressful experience were actually happening again.',  a: 0.841, b: [-0.004,  0.443,  0.800,  1.354] },
    { text: 'Feeling very upset when something reminded you of the stressful experience.',               a: 0.871, b: [-0.602, -0.053,  0.201,  0.745] },
    { text: 'Having strong physical reactions when something reminded you of the stressful experience.', a: 0.843, b: [-0.226,  0.168,  0.425,  0.996] },
    { text: 'Avoiding memories, thoughts, or feelings related to the stressful experience.',             a: 0.795, b: [-0.563,  0.012,  0.269,  1.023] },
    { text: 'Avoiding external reminders of the stressful experience.',                                  a: 0.794, b: [-0.497, -0.045,  0.210,  0.870] },
    { text: 'Trouble remembering important parts of the stressful experience.',                          a: 0.569, b: [ 0.346,  0.563,  0.858,  1.513] },
    { text: 'Strong negative beliefs about yourself, other people, or the world.',                       a: 0.800, b: [-0.201,  0.218,  0.525,  1.156] },
    { text: 'Blaming yourself or someone else for the stressful experience or what happened after it.',  a: 0.670, b: [-0.012,  0.452,  0.682,  1.240] },
    { text: 'Having strong negative feelings such as fear, horror, anger, guilt, or shame.',             a: 0.879, b: [-0.398,  0.037,  0.372,  0.944] },
    { text: 'Loss of interest in activities that you used to enjoy.',                                    a: 0.881, b: [-0.497,  0.045,  0.260,  0.703] },
    { text: 'Feeling distant or cut off from other people.',                                             a: 0.867, b: [-0.507, -0.004,  0.226,  0.800] },
    { text: 'Trouble experiencing positive feelings.',                                                   a: 0.864, b: [-0.206,  0.274,  0.639,  1.256] },
    { text: 'Irritable behavior, angry outbursts, or acting aggressively.',                              a: 0.799, b: [-0.372,  0.201,  0.516,  1.051] },
    { text: 'Taking too many risks or doing things that could cause you harm.',                          a: 0.573, b: [ 0.735,  1.172,  1.595,  1.942] },
    { text: 'Being “super alert” or watchful or on guard.',                                              a: 0.651, b: [-0.789, -0.311, -0.029,  0.461] },
    { text: 'Feeling jumpy or easily startled.',                                                         a: 0.821, b: [-0.127,  0.269,  0.554,  1.125] },
    { text: 'Having difficulty concentrating.',                                                          a: 0.863, b: [-0.461,  0.119,  0.407,  0.858] },
    { text: 'Trouble falling or staying asleep.',                                                        a: 0.741, b: [-0.582, -0.226,  0.061,  0.582] },
  ],
};

window.PRESETS = { RGPTS_REF, RGPTS_PER, PHQ9, PCL5 };
window.PRESET_LIST = [RGPTS_REF, RGPTS_PER, PHQ9, PCL5];
