import { TriviaQuestion } from './trivia.models';

/**
 * Banco local de preguntas. Se usa cuando no hay API key o falla OpenRouter,
 * para que la Trivia funcione sin gastar tokens.
 */
export const LOCAL_TRIVIA: TriviaQuestion[] = [
  {
    q: '¿Cuál es el planeta más grande del Sistema Solar?',
    options: ['Saturno', 'Júpiter', 'Neptuno', 'La Tierra'],
    answer: 1,
    fun: 'En Júpiter cabrían más de 1.300 Tierras.',
  },
  {
    q: '¿Qué órgano del cuerpo humano consume más energía en reposo?',
    options: ['El corazón', 'Los músculos', 'El cerebro', 'El hígado'],
    answer: 2,
    fun: 'El cerebro gasta ~20% de tu energía siendo el 2% de tu peso.',
  },
  {
    q: '¿En qué país se inventó el papel?',
    options: ['Egipto', 'China', 'Grecia', 'India'],
    answer: 1,
    fun: 'Se atribuye a Cai Lun, hacia el año 105 d.C.',
  },
  {
    q: '¿Cuántos huesos tiene aproximadamente un adulto humano?',
    options: ['106', '206', '306', '406'],
    answer: 1,
    fun: 'Los bebés nacen con ~300; algunos se fusionan al crecer.',
  },
  {
    q: '¿Qué animal tiene tres corazones?',
    options: ['El pulpo', 'La ballena', 'El cocodrilo', 'El avestruz'],
    answer: 0,
    fun: 'Dos bombean a las branquias y uno al resto del cuerpo.',
  },
  {
    q: '¿Cuál es el río más largo del mundo?',
    options: ['Nilo', 'Amazonas', 'Yangtsé', 'Misisipi'],
    answer: 1,
    fun: 'Mediciones recientes sitúan al Amazonas por delante del Nilo.',
  },
  {
    q: '¿Qué gas es el más abundante en la atmósfera terrestre?',
    options: ['Oxígeno', 'Dióxido de carbono', 'Nitrógeno', 'Hidrógeno'],
    answer: 2,
    fun: 'El nitrógeno es el 78% del aire que respiras.',
  },
  {
    q: '¿En qué año llegó el ser humano a la Luna por primera vez?',
    options: ['1965', '1969', '1972', '1958'],
    answer: 1,
    fun: 'Apollo 11, 20 de julio de 1969.',
  },
  {
    q: '¿Cuál es el metal líquido a temperatura ambiente?',
    options: ['Plomo', 'Mercurio', 'Aluminio', 'Sodio'],
    answer: 1,
    fun: 'Su símbolo Hg viene del griego "hydrargyros": plata líquida.',
  },
  {
    q: '¿Qué instrumento mide la presión atmosférica?',
    options: ['Termómetro', 'Barómetro', 'Anemómetro', 'Higrómetro'],
    answer: 1,
    fun: 'Lo inventó Torricelli en 1643 con un tubo de mercurio.',
  },
  {
    q: '¿Cuántos lados tiene un icoságono?',
    options: ['12', '16', '20', '24'],
    answer: 2,
    fun: '"Icosi" es 20 en griego; un icosaedro tiene 20 caras.',
  },
  {
    q: '¿Qué pintor cortó parte de su oreja?',
    options: ['Picasso', 'Van Gogh', 'Monet', 'Dalí'],
    answer: 1,
    fun: 'Ocurrió en Arlés en 1888, tras una discusión con Gauguin.',
  },
];

/** Baraja y devuelve `count` preguntas del banco local */
export function pickLocal(count: number): TriviaQuestion[] {
  const shuffled = [...LOCAL_TRIVIA].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
