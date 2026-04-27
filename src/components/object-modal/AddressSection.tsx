import { Field, inputCls } from './shared';

interface AddressSectionProps {
  street: string;
  building: string;
  onStreetChange: (v: string) => void;
  onBuildingChange: (v: string) => void;
}

export default function AddressSection({
  street,
  building,
  onStreetChange,
  onBuildingChange,
}: AddressSectionProps) {
  return (
    <div className="grid grid-cols-2 gap-3 pt-2 pb-3">
      <Field label="Улица">
        <input className={inputCls} value={street} onChange={(e) => onStreetChange(e.target.value)} placeholder="ул. Ленина" />
      </Field>
      <Field label="Дом / корпус">
        <input className={inputCls} value={building} onChange={(e) => onBuildingChange(e.target.value)} placeholder="12А" />
      </Field>
    </div>
  );
}
