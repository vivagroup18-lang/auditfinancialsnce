export interface FinancialYearPair {
  cyYear: string;
  cyPeriod: string;
  pyYear: string;
  pyPeriod: string;
  assessmentYear: string;
  isCurrentActive?: boolean;
}

export const POPULAR_INDIAN_FY_PRESETS: FinancialYearPair[] = [
  {
    cyYear: '2025-26',
    cyPeriod: 'March 31, 2026',
    pyYear: '2024-25',
    pyPeriod: 'March 31, 2025',
    assessmentYear: '2026-27',
    isCurrentActive: true,
  },
  {
    cyYear: '2024-25',
    cyPeriod: 'March 31, 2025',
    pyYear: '2023-24',
    pyPeriod: 'March 31, 2024',
    assessmentYear: '2025-26',
  },
  {
    cyYear: '2023-24',
    cyPeriod: 'March 31, 2024',
    pyYear: '2022-23',
    pyPeriod: 'March 31, 2023',
    assessmentYear: '2024-25',
  },
  {
    cyYear: '2022-23',
    cyPeriod: 'March 31, 2023',
    pyYear: '2021-22',
    pyPeriod: 'March 31, 2022',
    assessmentYear: '2023-24',
  },
  {
    cyYear: '2021-22',
    cyPeriod: 'March 31, 2022',
    pyYear: '2020-21',
    pyPeriod: 'March 31, 2021',
    assessmentYear: '2022-23',
  },
];

/**
 * Parses a financial year string (e.g., "2025-26" or "2025-2026") into start and end years.
 */
export function parseFY(fyStr: string): { startYear: number; endYear: number } | null {
  if (!fyStr) return null;
  const cleaned = fyStr.trim();
  const match = cleaned.match(/^(\d{4})[-/](\d{2,4})$/);
  if (!match) return null;

  const startYear = parseInt(match[1], 10);
  let endYear = parseInt(match[2], 10);
  if (match[2].length === 2) {
    const century = Math.floor(startYear / 100) * 100;
    endYear = century + endYear;
  }
  return { startYear, endYear };
}

/**
 * Derives previous financial year and default reporting period dates from a CY financial year.
 */
export function derivePriorYearDetails(cyYear: string): {
  pyYear: string;
  cyPeriod: string;
  pyPeriod: string;
  assessmentYear: string;
} {
  const parsed = parseFY(cyYear);
  if (!parsed) {
    return {
      pyYear: '2024-25',
      cyPeriod: 'March 31, 2026',
      pyPeriod: 'March 31, 2025',
      assessmentYear: '2026-27',
    };
  }

  const { startYear, endYear } = parsed;
  const pyStart = startYear - 1;
  const pyEnd = endYear - 1;
  const pyEndTwoDigits = String(pyEnd).slice(-2);
  const pyYear = `${pyStart}-${pyEndTwoDigits}`;

  const cyPeriod = `March 31, ${endYear}`;
  const pyPeriod = `March 31, ${pyEnd}`;

  const ayStart = endYear;
  const ayEndTwoDigits = String(endYear + 1).slice(-2);
  const assessmentYear = `${ayStart}-${ayEndTwoDigits}`;

  return {
    pyYear,
    cyPeriod,
    pyPeriod,
    assessmentYear,
  };
}

/**
 * Rolls forward the current and previous year by +1 year.
 */
export function rollForwardOneYear(cyYear: string): {
  newCY: string;
  newCYPeriod: string;
  newPY: string;
  newPYPeriod: string;
} {
  const parsed = parseFY(cyYear);
  if (!parsed) {
    return {
      newCY: '2026-27',
      newCYPeriod: 'March 31, 2027',
      newPY: cyYear || '2025-26',
      newPYPeriod: 'March 31, 2026',
    };
  }

  const nextStart = parsed.startYear + 1;
  const nextEnd = parsed.endYear + 1;
  const nextEndTwoDigits = String(nextEnd).slice(-2);
  const newCY = `${nextStart}-${nextEndTwoDigits}`;

  return {
    newCY,
    newCYPeriod: `March 31, ${nextEnd}`,
    newPY: cyYear,
    newPYPeriod: `March 31, ${parsed.endYear}`,
  };
}

/**
 * Rolls back the current and previous year by -1 year.
 */
export function rollBackOneYear(cyYear: string): {
  newCY: string;
  newCYPeriod: string;
  newPY: string;
  newPYPeriod: string;
} {
  const parsed = parseFY(cyYear);
  if (!parsed) {
    return {
      newCY: '2024-25',
      newCYPeriod: 'March 31, 2025',
      newPY: '2023-24',
      newPYPeriod: 'March 31, 2024',
    };
  }

  const prevStart = parsed.startYear - 1;
  const prevEnd = parsed.endYear - 1;
  const prevEndTwoDigits = String(prevEnd).slice(-2);
  const newCY = `${prevStart}-${prevEndTwoDigits}`;

  const pyDetails = derivePriorYearDetails(newCY);

  return {
    newCY,
    newCYPeriod: `March 31, ${prevEnd}`,
    newPY: pyDetails.pyYear,
    newPYPeriod: pyDetails.pyPeriod,
  };
}
