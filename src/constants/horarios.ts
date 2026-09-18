export interface BlocoHorario {
  value: string;
  label: string;
  turno: 'Matutino' | 'Vespertino' | 'Noturno';
  startMin?: number;
}

export const BLOCOS_HORARIO: BlocoHorario[] = [
  { value: '07:00-09:10', label: '07:00 - 09:10', turno: 'Matutino', startMin: 7 * 60 },
  { value: '09:30-12:00', label: '09:30 - 12:00', turno: 'Matutino', startMin: 9 * 60 + 30 },
  { value: '13:00-15:10', label: '13:00 - 15:10', turno: 'Vespertino', startMin: 13 * 60 },
  { value: '15:30-18:00', label: '15:30 - 18:00', turno: 'Vespertino', startMin: 15 * 60 + 30 },
  { value: '18:30-20:10', label: '18:30 - 20:10', turno: 'Noturno', startMin: 18 * 60 + 30 },
  { value: '20:30-22:00', label: '20:30 - 22:00', turno: 'Noturno', startMin: 20 * 60 + 30 },
];
