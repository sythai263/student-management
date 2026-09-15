import { GRADE_SLOT_LABEL, GRADE_SLOT_WEIGHT, GRADE_SLOTS } from "@constants";
import type { ReportCardFieldValues } from "@types";

interface ScoreTableBlockViewProps {
  values: ReportCardFieldValues;
}

/**
 * Bordered 3×6 score table: header row (TX1-4, GK, CK), score row,
 * coefficient row — average stays as its own block below.
 */
export function ScoreTableBlockView({ values }: ScoreTableBlockViewProps) {
  const cell = "border border-black px-0.5 py-0.5 text-center";

  return (
    <table className="w-full border-collapse border border-black">
      <tbody>
        <tr>
          {GRADE_SLOTS.map((slot) => (
            <td key={slot} className={`${cell} font-bold`}>
              {GRADE_SLOT_LABEL[slot]}
            </td>
          ))}
        </tr>
        <tr>
          {GRADE_SLOTS.map((slot) => (
            <td key={slot} className={cell}>
              {values[slot]}
            </td>
          ))}
        </tr>
        <tr>
          {GRADE_SLOTS.map((slot) => (
            <td key={slot} className={`${cell} text-black/60`}>
              ×{GRADE_SLOT_WEIGHT[slot]}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}
