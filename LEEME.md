# Ruta Robot

Juego de programación por bloques para los niños de 3º y 4º básico del taller.

El niño arma un programa con bloques —**avanzar**, **girar**, **repetir**— y el robot
recorre el tablero hasta la bandera. Son 12 niveles: los primeros enseñan a avanzar y
girar, y los últimos obligan a usar repeticiones dentro de repeticiones.

**Llegar a la bandera basta para pasar de nivel. Las tres estrellas son las tres pilas
del mapa.** Están separadas a propósito: el niño que no encuentra el camino ingenioso
igual avanza, y las pilas son la razón para volver a un nivel que ya ganó.

El juego está dibujado como el concepto de **Rovi** (`assets/rovi-concept.png`): un mundo
de cubos visto desde arriba, con pasto, piedra y un rover de cara celeste. Los bloques
siguen con la forma de Scratch a propósito, porque es a donde pasan los niños después.

**Todo el tablero está en 2.5D**: es una isla de cubos vista en diagonal, con el pasto,
los muros, las pilas, la bandera y el robot dibujados desde una sola cámara fija. El
robot tiene volumen y gira de verdad, así que cuando el niño pone un bloque de *girar* ve
al robot dar la vuelta, no cambiar de dibujo. Cuando camina alejándose le ve la espalda,
y por eso lleva una franja celeste en la cabeza que apunta siempre hacia donde avanzará.

Ojo con esto en la sala: con el tablero girado, el "norte" del mapa queda arriba y a la
izquierda. Los bloques y las pistas hablan siempre desde el robot ("dobla a la derecha"),
no desde la pantalla, que es lo que debería salvarlo — pero vale la pena mirar cómo les
resulta la primera vez.

## Cómo abrirlo

Haz doble clic en `index.html`. Eso es todo: no necesita internet, ni instalación, ni
servidor. Se puede copiar la carpeta completa a un pendrive y abrirla en cualquier
notebook del taller.

## Cómo se juega

- **Agregar un bloque:** haz clic en un bloque de la izquierda y se suma al final del
  programa. También se puede arrastrar hasta el lugar exacto donde va.
- **Mover o sacar un bloque:** arrástralo. Si lo sueltas fuera del programa, se borra.
- **Repetir:** los bloques que van adentro del *repetir* se ejecutan varias veces. Con
  los botones **−** y **+** se cambia cuántas.
- **Las pilas:** giran despacio y sueltan chispas mientras están en el tablero, para que
  el niño las vea de lejos. Al pasarles por encima estallan en un puñado de cubitos.
- **La bandera:** cuando el robot la toca, la bandera se deshace en un montón de cubos
  que salen volando. Vale la pena dejar que los niños lo vean antes de apretar
  "Siguiente".
- **▶ Ejecutar:** el robot sigue el programa completo. El bloque que está corriendo se
  ilumina, para que el niño vea qué instrucción se está ejecutando.
- **Paso:** ejecuta **un solo bloque** y espera. Sirve para encontrar el error cuando el
  programa no hace lo que el niño esperaba: se avanza de a uno mirando qué bloque se
  ilumina y qué hace el robot. Abajo aparece "Paso 3 de 9". Si en la mitad se aprieta
  Ejecutar, sigue solo desde donde iba.
- **Detener:** para el robot **donde va**, sin devolverlo al inicio, para poder mirar
  dónde se equivocó.
- **Reiniciar:** devuelve el robot al principio.
- **Rápido / Normal:** cambia la velocidad. Sirve para no esperar cuando ya se sabe la
  respuesta.

Los tres círculos al lado del nombre del nivel se van llenando cuando el robot pasa por
encima de una pila. El avance queda guardado en el mismo computador, así que si el niño
cierra el juego puede seguir donde iba. Los niveles terminados con las tres pilas quedan
marcados en amarillo arriba.

## Para el profe

- **Los 12 niveles están abiertos desde el principio**, sin importar cuáles se hayan
  terminado. Sirve para saltar al nivel que toca en la clase sin tener que jugar los
  anteriores. Si más adelante conviene que cada nivel se abra al terminar el anterior,
  se cambia `UNLOCK_ALL` a `false` en `src/game.js`.
- **El programa que gana un nivel queda guardado.** Al volver a ese nivel aparece de
  nuevo en el panel, para poder revisar con el niño cómo lo resolvió. Se guarda el mejor
  intento, no el último: si después juega peor, no se pierde el programa de las tres
  pilas. Ojo con los notebooks compartidos — el niño que abra un nivel ya resuelto se va
  a encontrar con la solución del anterior.
- El nivel se pasa llegando a la bandera. Las estrellas son la excusa para la segunda
  pregunta: *¿y cómo lo harías pasando por las tres pilas?*
- En los niveles de patrón, **las pilas están puestas sobre el camino que recorre la
  repetición correcta**. Si el niño arma bien el bucle, las junta sin desviarse: son la
  confirmación visible de que encontró el patrón. En los niveles de laberinto, en cambio,
  están fuera del camino corto y hay que ir a buscarlas.
- Algunos niveles tienen un **máximo de bloques**. Están hechos para que la solución
  larga no quepa y el niño tenga que usar *repetir*. Si se atasca, la pista del panel
  izquierdo dice qué patrón buscar.
- Los mensajes de error dicen qué pasó ("El robot chocó con un muro"), no que el niño se
  equivocó. Vale la pena leerlos en voz alta las primeras sesiones.
- Cuando un niño diga "no me funciona", el botón **Paso** es la respuesta: en vez de
  revisar el programa entero, se avanza de a un bloque hasta ver exactamente en cuál el
  robot hace algo distinto de lo que el niño creía. Es depurar, y a esta edad se entiende
  mucho mejor haciéndolo que explicándolo.

## Cambiar o agregar niveles

Los niveles están en `src/levels.js`, escritos como dibujos de texto: `.` es piso,
`#` es muro, `R` es donde parte el robot, `M` es la bandera y `*` es una pila.

```js
{
  name: 'El pasillo largo',
  hint: 'Son muchos pasos iguales. Usa "repetir".',
  dir: 'E',                          // hacia dónde mira el robot al empezar: N, E, S u O
  blocks: ['forward', 'repeat'],     // qué bloques aparecen en la paleta
  max: 3,                            // tope de bloques (opcional)
  map: ['..........', 'R..*.*.*.M', '..........']
}
```

**Cada nivel lleva exactamente tres pilas**, porque son las tres estrellas.

Después de editar un mapa hay que revisarlo:

```sh
node tools/check-levels.js
```

Ese comando resuelve cada nivel solo, por los dos caminos que le importan al niño: el
corto hasta la bandera y el que además junta las tres pilas. Avisa si alguno de los dos
no existe, si las pilas no son tres, o si el tope de bloques quedó tan holgado que la
repetición dejó de ser necesaria.

Para probar el juego completo (necesita Chrome):

```sh
./tools/test.sh
```
