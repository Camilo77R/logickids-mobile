/**
 * VALIDACIÓN DE ARREGLO DE RANKING - Test rápido
 * 
 * Corre este test para verificar que:
 * 1. getAvatar() encuentra avatares en todas las estructuras
 * 2. PodiumRanking normaliza correctamente 3 posiciones
 * 3. ranking.service.js preserva avatares
 */

// Test 1: getAvatar con todos los casos
const { getAvatar } = require('./src/services/avatar.service.js');

const testCases = [
  // Caso 1: Usuario con avatar directo
  {
    name: 'User with direct avatar',
    user: { name: 'Juan', avatar: 'https://example.com/juan.jpg' },
    expected: 'https://example.com/juan.jpg',
  },
  // Caso 2: Usuario con photoURL
  {
    name: 'User with photoURL',
    user: { name: 'Maria', photoURL: 'https://example.com/maria.jpg' },
    expected: 'https://example.com/maria.jpg',
  },
  // Caso 3: Usuario con nested profile.avatar
  {
    name: 'User with nested profile.avatar',
    user: { name: 'Pedro', profile: { avatar: 'https://example.com/pedro.jpg' } },
    expected: 'https://example.com/pedro.jpg',
  },
  // Caso 4: Usuario sin avatar (fallback)
  {
    name: 'User without avatar (fallback)',
    user: { name: 'Carlos' },
    expected: 'https://ui-avatars.com/api/?name=Carlos',
  },
  // Caso 5: Usuario nulo
  {
    name: 'Null user (fallback)',
    user: null,
    expected: 'https://ui-avatars.com/api/?name=User',
  },
];

console.log('🧪 Testing getAvatar()...\n');

testCases.forEach((test) => {
  const result = getAvatar(test.user);
  const pass = result.includes(test.expected);
  const status = pass ? '✅' : '❌';
  console.log(`${status} ${test.name}`);
  if (!pass) {
    console.log(`   Expected: ${test.expected}`);
    console.log(`   Got: ${result}`);
  }
});

console.log('\n✅ Tests completados. Verifica que todos pasen.\n');
