/// Projection "vue employé" pour une société donnée — équivalent de
/// personToEmployeeView() dans le prototype. C'est ce que le CRM (et les autres
/// modules métier) consomment : jamais l'entité Person brute d'une autre société.
export interface EmployeeView {
  personId: string;
  affectationId: string;
  name: string;
  email: string;
  phone: string | null;
  society: string;
  department: string;
  position: string;
  manager: string | null;
  entryDate: Date;
  status: string;
  replacement: string | null;
  isCommercial: boolean;
}
