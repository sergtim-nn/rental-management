import { Field, inputCls } from './shared';

interface ContractSectionProps {
  contractDate: string;
  plannedRent: number;
  today: string;
  onContractDateChange: (v: string) => void;
  onPlannedRentChange: (v: number) => void;
}

export default function ContractSection({
  contractDate,
  plannedRent,
  today,
  onContractDateChange,
  onPlannedRentChange,
}: ContractSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-3 pt-2 pb-3 sm:grid-cols-2">
      <Field label="Дата заключения договора">
        <input
          type="date"
          className={inputCls}
          max={today}
          value={contractDate}
          onChange={(e) => onContractDateChange(e.target.value)}
        />
      </Field>
      <Field label="Плановая аренда (₽)">
        <input
          type="number"
          step="0.01"
          min="0"
          className={inputCls}
          value={plannedRent || ''}
          onChange={(e) => onPlannedRentChange(Number(e.target.value))}
          placeholder="0"
        />
      </Field>
    </div>
  );
}
