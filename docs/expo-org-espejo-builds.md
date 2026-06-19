# Expo org espejo - guia para builds del equipo

## Objetivo

Este documento explica como generar builds Android usando la org espejo
`logickids-sena-org-v2` y como diagnosticar rapido si una persona del equipo
esta mal logueada o mal enlazada.

## Concepto clave

- El repo guarda la **direccion del proyecto**:
  - `owner`: `logickids-sena-org-v2`
  - `projectId`: `6c2a15a3-0027-4354-9907-7c5a08fe42a7`
- Cada computador guarda la **sesion del usuario** de Expo.

Analogía:
El repo dice a que oficina hay que ir. `eas login` define con que carnet entra
cada persona.

## Estado esperado del proyecto

Este repo debe apuntar a:

```text
owner     logickids-sena-org-v2
fullName  @logickids-sena-org-v2/logickids
ID        6c2a15a3-0027-4354-9907-7c5a08fe42a7
```

## Caso 1 - Si SI estas bien logueado

### Como verificarlo

Corre:

```bash
eas whoami
```

Debe pasar esto:

- sale tu usuario actual
- sale tu correo correcto
- en `Accounts` aparece `logickids-sena-org-v2`

Luego corre:

```bash
eas project:info
```

Debe salir algo muy parecido a esto:

```text
fullName  @logickids-sena-org-v2/logickids
ID        6c2a15a3-0027-4354-9907-7c5a08fe42a7
```

### Que hacer despues

Para desarrollo diario:

```bash
eas build -p android --profile development
```

Para una APK interna mas compartible:

```bash
eas build -p android --profile preview
```

### Cuando usar cada perfil

- `development`: cuando vas a desarrollar, probar seguido y usar `npx expo start`
- `preview`: cuando vas a compartir una APK interna con otra persona

## Caso 2 - Si NO estas bien logueado

### Sintomas comunes

- `eas whoami` muestra otra cuenta
- no aparece `logickids-sena-org-v2` en `Accounts`
- `eas project:info` no muestra el `fullName` esperado
- `eas build` falla por permisos o intenta usar otra org

### Como arreglarlo

1. Cierra sesion:

```bash
eas logout
```

2. Inicia sesion otra vez:

```bash
eas login
```

3. En el navegador, entra con la cuenta correcta.

4. Verifica:

```bash
eas whoami
```

5. Si no aparece la org espejo en `Accounts`, pide invitacion a:

```text
logickids-sena-org-v2
```

6. Verifica de nuevo el proyecto:

```bash
eas project:info
```

## Caso 3 - Si el repo local no tiene los cambios correctos

### Sintoma

`eas project:info` no coincide aunque el login si parece correcto.

### Solucion

1. Trae los cambios:

```bash
git pull
```

2. Revisa `app.json` y confirma:

```json
{
  "expo": {
    "owner": "logickids-sena-org-v2",
    "slug": "logickids",
    "extra": {
      "eas": {
        "projectId": "6c2a15a3-0027-4354-9907-7c5a08fe42a7"
      }
    }
  }
}
```

3. Verifica:

```bash
eas project:info
```

## Regla importante

No cambiar manualmente estas cosas salvo decision coordinada:

- `owner`
- `projectId`
- `android.package`

Si se cambian por error, el equipo puede quedar construyendo sobre otra cuenta,
otra org o incluso otra identidad de app.

## Advertencia de firma Android

Si una APK nueva no instala encima de una anterior, muchas veces no es problema
de Expo sino de la firma.

Imagen mental:
Dos apps con el mismo `package` pero firmadas distinto son como dos llaves
distintas para la misma cerradura. Android no las considera la misma instalacion.

Si pasa esto:

- desinstala la app anterior del celular
- instala la nueva APK

Para publicar o mantener continuidad real de la misma app, hay que conservar la
misma keystore.

## Checklist rapido para el equipo

Antes de correr una build, confirme:

```text
[ ] hice git pull
[ ] eas whoami muestra mi cuenta correcta
[ ] logickids-sena-org-v2 aparece en Accounts
[ ] eas project:info muestra @logickids-sena-org-v2/logickids
[ ] voy a usar development o preview segun el objetivo
```

## Comandos utiles

```bash
eas whoami
eas project:info
eas build -p android --profile development
eas build -p android --profile preview
eas logout
eas login
```
