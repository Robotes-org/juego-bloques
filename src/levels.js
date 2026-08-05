/* Level definitions for Ruta Robot.
   Loaded as a classic script so the game also runs from file:// (no fetch, no modules).

   Each level is a small ASCII map. One character per cell, all rows the same length:

     .   empty floor
     #   wall (the robot crashes into it)
     R   robot start position
     M   goal
     *   battery

   dir     where the robot looks at the start: N (up), E (right), S (down), O (left)
   blocks  which blocks the palette offers, in order
   max     hard limit of blocks (optional). Used when the point of the level is the
           loop: without a cap a child can always brute-force it with a long list.

   Reaching the flag finishes the level. The three batteries are the three stars, and
   they are optional on purpose: a child who cannot see the clever route still moves on,
   and has a reason to come back. Every level has exactly three — the checker enforces it.

   Where a level teaches a loop, the batteries sit ON the route the pattern walks, so
   getting the loop right collects them without any detour. Where the level is about
   reading the map, some batteries sit off the direct path and cost a detour. */
var LEVELS = [
  {
    name: 'Primeros pasos',
    hint: 'Arrastra bloques de "avanzar" hasta que el robot llegue a la bandera. Las pilas se recogen solas al pasar por encima.',
    dir: 'E',
    blocks: ['forward'],
    map: [
      '.....',
      'R***M',
      '.....'
    ]
  },
  {
    name: 'Dobla a la derecha',
    hint: 'El robot mira hacia la derecha. Para bajar tiene que girar primero.',
    dir: 'E',
    blocks: ['forward', 'right'],
    map: [
      '....',
      'R***',
      '...M'
    ]
  },
  {
    name: 'Dobla a la izquierda',
    hint: 'Hay un muro en el camino. Rodéalo por abajo y después sube.',
    dir: 'E',
    blocks: ['forward', 'left', 'right'],
    map: [
      '....M',
      '..##*',
      '....*',
      'R.*..'
    ]
  },
  {
    name: 'El pasillo largo',
    hint: 'Son muchos pasos iguales. Usa "repetir" para no arrastrar tantos bloques.',
    dir: 'E',
    blocks: ['forward', 'repeat'],
    max: 3,
    map: [
      '..........',
      'R..*.*.*.M',
      '..........'
    ]
  },
  {
    name: 'La escalera',
    hint: 'Avanzar, girar, avanzar, girar... el mismo patrón tres veces seguidas. Las pilas te muestran por dónde va.',
    dir: 'E',
    blocks: ['forward', 'left', 'right', 'repeat'],
    max: 5,
    map: [
      '.....',
      '...M.',
      '...*.',
      '..*..',
      'R*...'
    ]
  },
  {
    name: 'Vale la pena desviarse',
    hint: 'Llegar a la bandera es fácil. Las tres pilas no están en el camino corto.',
    dir: 'E',
    blocks: ['forward', 'left', 'right', 'repeat'],
    map: [
      '...*.',
      '.*...',
      '.....',
      'R.*.M'
    ]
  },
  {
    name: 'El laberinto',
    hint: 'Mira bien el camino antes de empezar a poner bloques.',
    dir: 'E',
    blocks: ['forward', 'left', 'right', 'repeat'],
    map: [
      'R.#....',
      '.*#.##.',
      '*...#..',
      '###*#.#',
      '......M'
    ]
  },
  {
    name: 'La escalera larga',
    hint: 'Cuatro escalones iguales: avanzar dos, subir uno. Un "repetir" hace los cuatro.',
    dir: 'E',
    blocks: ['forward', 'left', 'right', 'repeat'],
    max: 7,
    map: [
      '########M',
      '######...',
      '####.*.##',
      '##.*.####',
      'R*.######'
    ]
  },
  {
    name: 'La vuelta completa',
    hint: 'Un "repetir" puede ir dentro de otro "repetir".',
    dir: 'E',
    blocks: ['forward', 'left', 'right', 'repeat'],
    max: 5,
    // The solid block in the middle is what makes this "the whole way round": leave any
    // gap in it and there is a short cut up the inside, and the loop has nothing to teach.
    map: [
      'M.*..',
      '####.',
      '####*',
      '####.',
      'R...*'
    ]
  },
  {
    name: 'Pilas escondidas',
    hint: 'Las tres pilas están lejos unas de otras. Piensa el orden antes de armar.',
    dir: 'N',
    blocks: ['forward', 'left', 'right', 'repeat'],
    map: [
      '..*..M',
      '.###..',
      '*...*.',
      '.####.',
      'R.....'
    ]
  },
  {
    name: 'El caracol',
    hint: 'Da la vuelta por fuera y después entra hasta el centro.',
    dir: 'E',
    blocks: ['forward', 'left', 'right', 'repeat'],
    map: [
      '.......',
      '.#####.',
      '.#M*.#.',
      '.#.#.#.',
      '.#..*#.',
      '.###...',
      'R.*....'
    ]
  },
  {
    name: 'Desafío final',
    hint: 'Todo lo que aprendiste, junto. Tómate tu tiempo.',
    dir: 'E',
    blocks: ['forward', 'left', 'right', 'repeat'],
    map: [
      'R..#..*',
      '.#.#.#.',
      '.#*..#.',
      '.###.#.',
      '....#..',
      '.##...#',
      '*.....M'
    ]
  }
];
