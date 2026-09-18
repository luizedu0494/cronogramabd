import { describe, it, expect } from 'vitest';
import { BLOCOS_HORARIO } from '../constants/horarios';

describe('BLOCOS_HORARIO', () => {
  it('deve possuir exatamente 6 blocos de horário válidos', () => {
    expect(BLOCOS_HORARIO).toHaveLength(6);
  });

  it('todos os blocos devem possuir value, label, turno e startMin', () => {
    BLOCOS_HORARIO.forEach((bloco) => {
      expect(bloco.value).toBeDefined();
      expect(bloco.label).toBeDefined();
      expect(bloco.turno).toMatch(/Matutino|Vespertino|Noturno/);
      expect(typeof bloco.startMin).toBe('number');
    });
  });
});
