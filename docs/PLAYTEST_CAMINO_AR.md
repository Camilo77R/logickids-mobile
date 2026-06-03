# Playtest Camino AR

## Objetivo

Esta version sirve como **playtest funcional** de `Camino AR`.

La meta de esta build es validar:

- flujo `tutor -> estudiante -> juego -> cierre`
- comportamiento de `single` con 1 o varios niveles
- resultado final, progreso y regreso al tablero

No es la version final de arte, audio o microanimacion.

## Lo que si debe funcionar

- el tutor abre una actividad `single`
- el estudiante entra y puede abrir `Camino AR`
- el tablero aparece sobre el suelo
- el estudiante juega una ronda
- si hay mas niveles, aparece `Siguiente reto`
- al final aparece el cierre y se puede volver al tablero

## Lo que todavia no es final

- estilo visual premium definitivo
- musica y efectos sonoros
- haptica y microfeedback
- pulido artistico completo

## Recomendacion para la prueba de manana

Usar **un solo celular controlado por el equipo**.

Esto evita:

- fallas por instalacion en otros dispositivos
- diferencias de ARCore entre celulares
- tiempo perdido en soporte tecnico

## Guion corto de prueba

### Caso 1: single de 1 nivel

1. Tutor abre actividad `single` con 1 nivel.
2. Estudiante entra y abre `Camino AR`.
3. Esperar a que aparezca el tablero sobre el suelo.
4. Jugar la ronda completa.
5. Confirmar que aparece el cierre final.
6. Volver al tablero.
7. Revisar en tutor que la actividad quede actualizada.

### Caso 2: single de 2 niveles o mas

1. Tutor abre actividad `single` con 2 o mas niveles.
2. Estudiante juega el primer nivel.
3. Confirmar que aparece `Siguiente reto`.
4. Jugar el siguiente nivel.
5. Confirmar que en el ultimo ya no aparece `Siguiente reto`.
6. Volver al tablero.

## Preparacion tecnica

### Importante

`Camino AR` **no se prueba con Expo Go**.

Se prueba con **development build** porque usa `@reactvision/react-viro`.

### Pasos

1. Instalar dependencias:

```bash
npm install
```

2. Iniciar Expo limpio:

```bash
npx expo start -c
```

3. Abrir la app en el **dev client** del celular.

## Que observar durante la prueba

- si la UI deja ver bien el juego
- si el tablero aparece firme sobre el suelo
- si el nino entiende rapido que hacer
- si los botones no estorban
- si el cierre final se entiende

## Como presentar esta version

Presentarla como:

> vertical slice funcional de Camino AR

No presentarla como:

> version final de arte o experiencia premium

