// Categorical accents for things that need to be told apart at a glance
// (menu sections, payment methods, request types, staff avatars). Muted,
// mutually distinct, and all strong enough to carry white text.
export const ACCENTS = ['#1a5a44', '#2a55c9', '#b4483a', '#6b4fa0', '#2e7f8c', '#b47a00', '#6d7a2a']

export const accentFor = (id) => {
  let h = 0
  const s = String(id || '')
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return ACCENTS[Math.abs(h) % ACCENTS.length]
}

// Longer series for charts with many categories (e.g. revenue per product):
// the seven accents, then lighter partners of each, so neighbours stay
// distinguishable without leaving the palette.
export const SERIES = [
  ...ACCENTS,
  '#7fb59c',
  '#8ea7ea',
  '#dc9a8f',
  '#b4a2d8',
  '#86c1c9',
  '#e0bb63',
  '#aab76a',
]
