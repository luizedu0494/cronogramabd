import { LISTA_CURSOS } from '../constants/cursos';

/**
 * Tenta inferir o nome do curso a partir do título/assunto da aula.
 */
export const inferirCursoDoTitulo = (titulo = '') => {
    if (!titulo) return null;
    const upper = titulo.toUpperCase();
    if (/\b(MED|MEDICINA)\b/.test(upper)) return 'Medicina';
    if (/\b(FARM|FARMACIA)\b/.test(upper)) return 'Farmácia';
    if (/\b(ENF|ENFERMAGEM)\b/.test(upper)) return 'Enfermagem';
    if (/\b(BIOMED|BIOMEDICINA)\b/.test(upper)) return 'Biomedicina';
    if (/\b(FISIO|FISIOTERAPIA)\b/.test(upper)) return 'Fisioterapia';
    if (/\b(ODONTO|ODONTOLOGIA)\b/.test(upper)) return 'Odontologia';
    if (/\b(PSICO|PSICOLOGIA)\b/.test(upper)) return 'Psicologia';
    if (/\b(NUTRI|NUTRICAO)\b/.test(upper)) return 'Nutrição';
    if (/\b(ED\.?\s*FIS|EDUCACAO\s*FISICA)\b/.test(upper)) return 'Ed. Física';
    if (/\b(VET|MED\.?\s*VET|VETERINARIA)\b/.test(upper)) return 'Medicina Veterinária';
    return null;
};

/**
 * Formata os cursos da aula em string legível para exibição nos cards.
 */
export const formatarCursos = (aula) => {
    if (!aula) return 'Curso não especificado';
    const c = aula.cursos || aula.curso;
    
    if (Array.isArray(c) && c.length > 0) {
        const mapped = c.map(v => {
            const found = LISTA_CURSOS.find(lc => lc.value === v || lc.label.toLowerCase() === String(v).toLowerCase());
            return found ? found.label : v;
        });
        return mapped.join(', ');
    }
    
    if (typeof c === 'string' && c.trim()) {
        const found = LISTA_CURSOS.find(lc => lc.value === c || lc.label.toLowerCase() === c.toLowerCase());
        if (found) return found.label;
        return c;
    }

    // Se cursos estiver ausente ou vazio, inferir pelo assunto/título
    const inferido = inferirCursoDoTitulo(aula.assunto || aula.disciplina || aula.titulo);
    if (inferido) return inferido;

    return 'Curso não especificado';
};
