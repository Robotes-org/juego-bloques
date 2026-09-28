# Ruta Robot · Objetivos de aprendizaje que se pueden sumar

Objetivos de las Bases Curriculares de 3º y 4º básico que el juego podría cubrir con
algunos cambios. Los que ya cubre están en [`GUIA-PROFESOR.md`](GUIA-PROFESOR.md).

Los textos entre comillas son los oficiales, tomados de
[curriculumnacional.cl](https://www.curriculumnacional.cl) en septiembre de 2026. El
Mineduc está actualizando las Bases Curriculares de básica, así que conviene revisar los
códigos antes de construir cualquiera de estas ideas.

---

## Resumen

| # | Cambio | Objetivos que suma | Esfuerzo |
|---|---|---|---|
| 1 | Contador de pasos y tabla de vueltas | MA03 OA 08 · MA03 OA 12 · MA04 OA 13 | Bajo |
| 2 | Niveles espejo | MA03 OA 17 · MA04 OA 18 | Bajo |
| 3 | Coordenadas en el borde del tablero | MA04 OA 15 · HI04 OAH e | Bajo a medio |
| 4 | Brújula y puntos cardinales | HI03 OA 06 · HI03 OAH e | Medio |
| 5 | Botones de vista del tablero | MA04 OA 16 | Medio |
| 6 | Rastro del robot y perímetro | MA03 OA 21 | Medio |
| 7 | Modo dibujo | MA04 OA 17 · MA04 OA 18 · MA04 OA 23 | Alto |
| 8 | Editor de niveles para los niños | TE03 OA 01 · TE03 OA 04 | Alto |

Las tres primeras se pueden hacer casi solo con niveles nuevos y poca interfaz. Son el
mejor punto de partida.

---

## 1 · Contador de pasos y tabla de vueltas

**MA03 OA 08** · «Demostrar que comprenden las tablas de multiplicar hasta 10 de manera
progresiva: usando representaciones concretas y pictóricas; expresando una
multiplicación como una adición de sumandos iguales; […]»

**MA03 OA 12** · «Generar, describir y registrar patrones numéricos, usando una variedad
de estrategias en tablas del 100, de manera manual y/o con software educativo.»

**MA04 OA 13** · «Identificar y describir patrones numéricos en tablas que involucren una
operación, de manera manual y/o usando software educativo.»

**Hoy.** El *repetir* es una multiplicación escondida. *repetir 3 { avanzar ×4 }* son
12 pasos, pero el juego no lo muestra en ningún lado.

**El cambio.**
- Mostrar al final de cada ejecución cuántos pasos dio el robot.
- En el bloque *repetir*, mostrar la cuenta. «3 veces × 4 pasos = 12 pasos».
- Una tabla chica que se llena mientras corre el programa, con la vuelta y los pasos
  acumulados (1 → 4, 2 → 8, 3 → 12).
- Niveles de predicción. Antes de Ejecutar, el niño escribe cuántos pasos cree que va a
  dar el robot.

**Esfuerzo.** Bajo. `Runner.compile` ya desenrolla el programa en la lista completa de
movimientos, así que la cuenta está a mano.

---

## 2 · Niveles espejo

**MA03 OA 17** · «Reconocer en el entorno figuras 2D que están trasladadas, reflejadas y
rotadas.»

**MA04 OA 18** · «Trasladar, rotar y reflejar figuras 2D.»

**El cambio.** Parejas de niveles donde el segundo es el reflejo del primero. El niño
resuelve el primero, y en el segundo descubre que el mismo programa sirve cambiando
cada *izquierda* por *derecha*. Una variante con el tablero rotado muestra que el
programa queda igual si el robot parte girado junto con el mapa.

**Esfuerzo.** Bajo. Son niveles nuevos en `src/levels.js`. Un botón «espejar programa»
es opcional.

---

## 3 · Coordenadas en el borde del tablero

**MA04 OA 15** · «Describir la localización absoluta de un objeto en un mapa simple con
coordenadas informales (por ejemplo con letras y números), y la localización relativa
en relación a otros objetos.»

**HI04 OAH e** · «Orientarse en el espacio, utilizando categorías de ubicación absoluta
(coordenadas geográficas) y relativa.»

**Hoy.** El juego trabaja solo la ubicación relativa, desde el robot.

**El cambio.**
- Letras en las columnas y números en las filas, en el borde del tablero.
- Pistas que nombran casillas. «La pila que falta está en C4».
- Niveles sin bandera dibujada, con la meta dada como coordenada. «Lleva al robot a E2».

**Esfuerzo.** Bajo a medio. Los rótulos van en el borde del tablero y tienen que
seguir a la cámara cuando se gira.

---

## 4 · Brújula y puntos cardinales

**HI03 OA 06** · «Ubicar personas, lugares y elementos en una cuadrícula, utilizando
líneas de referencia y puntos cardinales.»

**HI03 OAH e** · «Orientarse en el espacio, utilizando referencias, categorías de
ubicación relativa y puntos cardinales.»

**Hoy.** Los niveles ya guardan hacia dónde mira el robot con N, E, S y O, pero el niño
nunca lo ve.

**El cambio.**
- Una rosa de los vientos en una esquina del tablero.
- Un grupo de niveles aparte con bloques absolutos. *avanzar al norte*, *avanzar al
  este*.
- Un nivel puente que pide resolver el mismo mapa con los dos tipos de bloques, para
  comparar girar desde el robot con moverse según el mapa.

**Esfuerzo.** Medio. Los bloques absolutos son un tipo de bloque nuevo en el editor y en
el runner. Conviene mantenerlos en su propio grupo de niveles, porque el resto del juego
habla siempre desde el robot.

---

## 5 · Botones de vista del tablero

**MA04 OA 16** · «Determinar las vistas de figuras 3D, desde el frente, desde el lado y
desde arriba.»

**Hoy.** El tablero ya es un mundo de cubos en 3D y la cámara se puede girar con el
botón derecho.

**El cambio.**
- Botones para ver el tablero desde arriba, de frente y de lado.
- Un desafío al empezar ciertos niveles. Se muestran tres vistas planas y el niño elige
  la que corresponde al tablero.

**Esfuerzo.** Medio. La cámara existe. Falta fijar las tres posiciones y dibujar las
vistas del desafío.

---

## 6 · Rastro del robot y perímetro

**MA03 OA 21** · «Demostrar que comprenden el perímetro de una figura regular e
irregular: midiendo y registrando el perímetro de figuras del entorno en el contexto de
la resolución de problemas; determinando el perímetro de un cuadrado y de un
rectángulo.»

**El cambio.**
- El robot deja una huella en las casillas por donde pasa.
- Niveles «da la vuelta al corral». Un rectángulo de muros que el robot tiene que
  rodear. La huella dibuja el contorno y el contador de pasos (idea 1) da el perímetro.
- Pregunta antes de ejecutar. *¿Cuántos pasos necesita para dar la vuelta completa?*

**Esfuerzo.** Medio. La huella es una capa nueva sobre el tablero. Depende de la idea 1
para el conteo.

---

## 7 · Modo dibujo

**MA04 OA 17** · «Demostrar que comprenden una línea de simetría: identificando figuras
simétricas 2D, creando figuras simétricas 2D, dibujando una o más líneas de simetría en
figuras 2D, usando software geométrico.»

**MA04 OA 18** · «Trasladar, rotar y reflejar figuras 2D.»

**MA04 OA 23** · Área de rectángulos y cuadrados en unidades cuadradas. Revisa el texto
completo en el sitio del currículum.

**El cambio.** Un modo sin bandera donde el robot pinta cada casilla que pisa. Los
desafíos piden dibujar una figura.
- «Dibuja la otra mitad para que quede simétrica.»
- «Dibuja la misma figura, pero corrida tres casillas.»
- «Pinta un rectángulo de 3 por 4. ¿Cuántas casillas pintaste?»

**Esfuerzo.** Alto. Es una forma nueva de ganar un nivel, comparando el dibujo con una
figura objetivo, y necesita su propio chequeo en `tools/check-levels.js`.

---

## 8 · Editor de niveles para los niños

**TE03 OA 01** · «Crear diseños de objetos o sistemas tecnológicos simples para resolver
problemas: desde diversos ámbitos tecnológicos y tópicos de otras asignaturas,
representando sus ideas a través de dibujos a mano alzada, modelos concretos o usando
TIC, explorando y combinando productos existentes.»

**TE03 OA 04** · «Probar y evaluar la calidad de los trabajos propios o de otros, de
forma individual o en equipos, aplicando criterios técnicos, medioambientales y de
seguridad y dialogando sobre sus resultados e ideas de mejoramiento.»

En 4º básico corresponden a TE04 OA 01 y TE04 OA 04.

**Hoy.** La guía propone inventar niveles en papel. El editor de niveles ya está en los
pendientes del juego, pensado para el profesor.

**El cambio.** Un editor simple donde cada pareja pone muros, tres pilas y una bandera.
El solver de `tools/solver.js` avisa si el nivel tiene solución, y otra pareja lo juega.
Diseñar, probar y mejorar a partir de lo que le pasó al compañero es justo lo que piden
estos dos objetivos.

**Esfuerzo.** Alto. El solver ya corre en el navegador, porque lo usan las pruebas. Lo
grande es la interfaz del editor y cómo se comparten los niveles entre computadores sin
internet, por ejemplo con un código corto que se copia.
