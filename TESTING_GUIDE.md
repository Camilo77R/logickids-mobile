## 🧪 GUÍA DE TESTING - Arreglo de Ranking

### Test 1: Validar que getAvatar() existe y funciona

```javascript
// En tu IDE, abre:
// src/services/avatar.service.js

// Verifica que existe:
✅ function getAvatar(user)
✅ function getDefaultAvatar(name)
✅ function preserveAvatarFields(entry)
✅ function hasValidAvatar(user)
```

### Test 2: Validar que PodiumRanking usa getAvatar()

```javascript
// En tu IDE, abre:
// src/components/PodiumRanking.jsx

// Verifica en imports:
✅ import { getAvatar, getDefaultAvatar } from '../services/avatar.service';

// Verifica en renderItem():
✅ const avatarUrl = getAvatar(item);
✅ <Image source={{ uri: avatarUrl }} ... />
```

### Test 3: Validar normalización de datos

```javascript
// En tu IDE, abre:
// src/components/PodiumRanking.jsx → normalizedData

// Verifica que:
✅ const sorted = rawData.sort(...).slice(0, 3);
✅ while (sorted.length < 3) { sorted.push({...}) }
✅ Siempre retorna exactamente 3 items
```

### Test 4: Validar ranking.service preserva avatares

```javascript
// En tu IDE, abre:
// src/services/ranking.service.js → normalizeRankingEntry()

// Verifica que existen TODOS estos campos:
✅ avatar
✅ photoURL
✅ photo
✅ image
✅ profileImage
✅ imagenPerfil
✅ avatarUrl
✅ profile
```

### Test 5: En el emulador/device

```
1. Abre la app
2. Entra como estudiante
3. Ve a "Dashboard" → "Ranking de la clase"
4. Verifica:
   ✅ 1er puesto: Muestra avatar
   ✅ 2do puesto: Muestra avatar
   ✅ 3er puesto: Muestra avatar (IMPORTANTE)
   ✅ Emojis de medallas (🥇 🥈 🥉) visibles
   ✅ Nombres y puntos visibles
   ✅ Sin espacios vacíos
```

### Test 6: Caso extremo - Sin rankings

```
Si la sesión NO tiene ranking:
✅ Debe mostrar: "Sin sesion activa"
✅ NO debe crashear
✅ NO debe ser undefined
```

### Test 7: Caso extremo - Solo 1 o 2 posiciones

```
Si hay solo 1 resultado:
✅ 1er lugar: Mostrará nombre + avatar
✅ 2do lugar: Mostrará "—" + avatar generado
✅ 3er lugar: Mostrará "—" + avatar generado

Si hay solo 2 resultados:
✅ 1er y 2do: Mostrarán data real
✅ 3er lugar: Mostrará "—" + avatar generado
```

---

## 🔍 Debugging

Si algo no funciona, activa logs:

```javascript
// En PodiumRanking.jsx, línea ~120 (renderItem):
console.log('RANKING ITEM:', item);
console.log('AVATAR URL:', getAvatar(item));

// En ranking.service.js, línea ~45 (buildSessionRanking):
console.log('ENRICHED RESULT:', enrichedResult);
console.log('CURRENT STUDENT:', currentStudent);
```

---

## ✅ Checklist Final

- [ ] `avatar.service.js` existe sin errores
- [ ] `ranking.service.js` actualizado correctamente  
- [ ] `PodiumRanking.jsx` importa y usa getAvatar()
- [ ] No hay errores en consola de React Native
- [ ] Los 3 puestos muestran avatar en emulador
- [ ] Fallback a ui-avatars funciona si no hay foto
- [ ] La app no crashea con datos vacíos

Si TODO marca ✅, **EL ARREGLO ESTÁ LISTO PARA PRODUCCIÓN.**

---

## 📞 Troubleshooting

**P: El 3er lugar sigue sin avatar**
→ Revisa que PodiumRanking.jsx importa correctamente getAvatar

**P: La app crashea en DashboardScreen**  
→ Verifica que ranking.service.js no tiene errores de sintaxis

**P: Avatares inconsistentes entre perfil y ranking**
→ Asegúrate que buildSessionRanking() inyecta avatar del currentStudent

**P: Los avatares se ven pixelados**
→ Es normal con ui-avatars.com, es un fallback. El backend debe tener fotos reales.
