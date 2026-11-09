import { reminderTargets, type DeviceRow, type EmployeeTokenRow } from '../push-targets';

const LF = 'a6798a18-9565-4f2b-929a-0c6771e7ef54';
const BFM = '22604654-8a66-4a30-9a20-ab48d7a9c794';

const devices: DeviceRow[] = [
  { token: 'lf-caja', company_id: LF },
  { token: 'lf-laura', company_id: LF },
  { token: 'bfm-1', company_id: BFM },
  { token: 'bfm-2', company_id: BFM },
  { token: null, company_id: LF },
  { token: 'sin-empresa', company_id: null },
];
const emps: EmployeeTokenRow[] = [
  { id: 'laura', company_id: LF, push_token: 'lf-laura' },
  { id: 'eddie', company_id: LF, push_token: null },
  { id: 'misael', company_id: BFM, push_token: 'bfm-1' },
];

describe('reminderTargets', () => {
  it('una general de La Ferre sólo llega a los teléfonos de La Ferre', () => {
    expect(reminderTargets({ company_id: LF, assigned_employee_ids: [] }, devices, emps).sort()).toEqual(['lf-caja', 'lf-laura']);
  });

  it('una general de BFM sólo llega a los de BFM', () => {
    expect(reminderTargets({ company_id: BFM, assigned_employee_ids: null }, devices, emps).sort()).toEqual(['bfm-1', 'bfm-2']);
  });

  it('a nombre de alguien con teléfono: sólo a esa persona', () => {
    expect(reminderTargets({ company_id: LF, assigned_employee_ids: ['laura'] }, devices, emps)).toEqual(['lf-laura']);
  });

  it('si los asignados no tienen teléfono, a los de su empresa', () => {
    expect(reminderTargets({ company_id: LF, assigned_employee_ids: ['eddie'] }, devices, emps).sort()).toEqual(['lf-caja', 'lf-laura']);
  });

  it('nunca toma el teléfono de alguien de otra empresa aunque esté asignado', () => {
    expect(reminderTargets({ company_id: LF, assigned_employee_ids: ['misael'] }, devices, emps).sort()).toEqual(['lf-caja', 'lf-laura']);
  });

  it('sin empresa o sin teléfonos no manda nada', () => {
    expect(reminderTargets({ company_id: null, assigned_employee_ids: [] }, devices, emps)).toEqual([]);
    expect(reminderTargets({ company_id: 'otra', assigned_employee_ids: [] }, devices, emps)).toEqual([]);
  });

  it('sin repetidos', () => {
    const dup: DeviceRow[] = [{ token: 'x', company_id: LF }, { token: 'x', company_id: LF }];
    expect(reminderTargets({ company_id: LF, assigned_employee_ids: [] }, dup, [])).toEqual(['x']);
  });
});
