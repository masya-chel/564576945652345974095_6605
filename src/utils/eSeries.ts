/**
 * Standard Electronics Value Series (E12, E24, E96)
 * and finding the closest standard component values.
 */

// E12 values (10% tolerance)
export const E12_BASE = [
  1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2,
];

// E24 values (5% tolerance - standard for inductors, ceramic MLCCs, standard resistors)
export const E24_BASE = [
  1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0,
  3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1,
];

// E96 values (1% tolerance - standard precision resistors for feedback dividers)
export const E96_BASE = [
  1.00, 1.02, 1.05, 1.07, 1.10, 1.13, 1.15, 1.18, 1.21, 1.24, 1.27, 1.30,
  1.33, 1.37, 1.40, 1.43, 1.47, 1.50, 1.54, 1.58, 1.62, 1.65, 1.69, 1.74,
  1.78, 1.82, 1.87, 1.91, 1.96, 2.00, 2.05, 2.10, 2.15, 2.21, 2.26, 2.32,
  2.37, 2.43, 2.49, 2.55, 2.61, 2.67, 2.74, 2.80, 2.87, 2.94, 3.01, 3.09,
  3.16, 3.24, 3.32, 3.40, 3.48, 3.57, 3.65, 3.74, 3.83, 3.92, 4.02, 4.12,
  4.22, 4.32, 4.42, 4.53, 4.64, 4.75, 4.87, 4.99, 5.11, 5.23, 5.36, 5.49,
  5.62, 5.76, 5.90, 6.04, 6.19, 6.34, 6.49, 6.65, 6.81, 6.98, 7.15, 7.32,
  7.50, 7.68, 7.87, 8.06, 8.25, 8.45, 8.66, 8.87, 9.09, 9.31, 9.53, 9.76,
];

/**
 * Finds the nearest value in an E-series for any positive real value
 */
export function findNearestESeries(
  target: number,
  series: 'E12' | 'E24' | 'E96'
): { nominal: number; errorPercent: number } {
  if (target <= 0) return { nominal: 0, errorPercent: 0 };

  const baseValues =
    series === 'E96' ? E96_BASE : series === 'E24' ? E24_BASE : E12_BASE;

  const exponent = Math.floor(Math.log10(target));
  const normalized = target / Math.pow(10, exponent);

  let bestBase = baseValues[0];
  let minDiff = Math.abs(normalized - bestBase);

  for (const val of baseValues) {
    const diff = Math.abs(normalized - val);
    if (diff < minDiff) {
      minDiff = diff;
      bestBase = val;
    }
  }

  // Also check wrapping to next power of 10 if near 10
  const wrapNext = baseValues[0] * 10;
  if (Math.abs(normalized - wrapNext) < minDiff) {
    bestBase = wrapNext;
  }

  const nominal = Number((bestBase * Math.pow(10, exponent)).toPrecision(3));
  const errorPercent = ((nominal - target) / target) * 100;

  return { nominal, errorPercent: Number(errorPercent.toFixed(2)) };
}

/**
 * Finds the nearest greater or equal standard value (ceil standard value),
 * critical for capacitance and inductance sizing to guarantee minimum requirements.
 */
export function findCeilESeries(
  target: number,
  series: 'E12' | 'E24' | 'E96'
): { nominal: number; errorPercent: number } {
  if (target <= 0) return { nominal: 0, errorPercent: 0 };

  const baseValues =
    series === 'E96' ? E96_BASE : series === 'E24' ? E24_BASE : E12_BASE;

  const exponent = Math.floor(Math.log10(target));
  const normalized = target / Math.pow(10, exponent);

  let chosenBase = baseValues.find((v) => v >= normalized);
  let finalExp = exponent;

  if (chosenBase === undefined) {
    chosenBase = baseValues[0];
    finalExp = exponent + 1;
  }

  const nominal = Number((chosenBase * Math.pow(10, finalExp)).toPrecision(3));
  const errorPercent = ((nominal - target) / target) * 100;

  return { nominal, errorPercent: Number(errorPercent.toFixed(2)) };
}

/**
 * Format component values with appropriate SI prefixes
 */
export function formatValue(value: number, unit: string): string {
  if (value === 0) return `0 ${unit}`;
  const abs = Math.abs(value);

  if (unit === 'Ω' || unit === 'Ohm') {
    if (abs >= 1e6) return `${(value / 1e6).toFixed(2).replace(/\.00$/, '')} MΩ`;
    if (abs >= 1e3) return `${(value / 1e3).toFixed(2).replace(/\.00$/, '')} kΩ`;
    return `${value.toFixed(1).replace(/\.0$/, '')} Ω`;
  }

  if (unit === 'F' || unit === 'µF' || unit === 'uF') {
    // If input is in microfarads
    if (unit === 'µF' || unit === 'uF') {
      if (abs < 0.001) return `${(value * 1e6).toFixed(0)} pF`;
      if (abs < 1) return `${(value * 1000).toFixed(1).replace(/\.0$/, '')} nF`;
      return `${value.toFixed(1).replace(/\.0$/, '')} µF`;
    }
  }

  if (unit === 'H' || unit === 'µH' || unit === 'uH') {
    return `${value.toFixed(2).replace(/\.00$/, '')} µH`;
  }

  if (unit === 'A') {
    if (abs < 1) return `${(value * 1000).toFixed(1).replace(/\.0$/, '')} mA`;
    return `${value.toFixed(2).replace(/\.00$/, '')} A`;
  }

  if (unit === 'V') {
    if (abs < 1) return `${(value * 1000).toFixed(0)} mV`;
    return `${value.toFixed(2).replace(/\.00$/, '')} V`;
  }

  return `${value.toFixed(2)} ${unit}`;
}
