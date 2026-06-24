const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeSessionRanking,
} = require('../../src/services/ranking.service.js');
const {
  resolveStudentAvatarUri,
} = require('../../src/services/studentAvatar.service.js');

test('normalizeSessionRanking acepta entries como fuente primaria del backend', () => {
  const ranking = normalizeSessionRanking({
    entries: [
      { estudiante_id: 11, estudiante_nombre: 'Ana', puntaje_total: 120 },
      { estudiante_id: 12, estudiante_nombre: 'Luis', puntaje_total: 90 },
      { estudiante_id: 13, estudiante_nombre: 'Mia', puntaje_total: 80 },
      { estudiante_id: 14, estudiante_nombre: 'Juan', puntaje_total: 70 },
    ],
    mi_posicion: {
      estudiante_id: 14,
      estudiante_nombre: 'Juan',
      puntaje_total: 70,
      posicion: 4,
    },
    total_participantes: 4,
  });

  assert.equal(ranking.top.length, 3);
  assert.equal(ranking.entries.length, 4);
  assert.equal(ranking.top[0].studentName, 'Ana');
  assert.equal(ranking.entries[3].isCurrentStudent, true);
  assert.equal(ranking.totalParticipants, 4);
});

test('ranking conserva avatar del backend y usa la misma identidad visual que el perfil', () => {
  const [entry] = normalizeSessionRanking({
    entries: [
      {
        estudiante_id: 11,
        estudiante_nombre: 'Ana Gomez',
        avatar_url: 'https://cdn.example.com/avatars/ana.svg',
        color_avatar: '#F3E8FA',
      },
    ],
  }).entries;

  assert.equal(entry.avatarUrl, 'https://cdn.example.com/avatars/ana.svg');
  assert.equal(entry.avatarColor, '#F3E8FA');
  assert.equal(resolveStudentAvatarUri(entry), entry.avatarUrl);
  assert.equal(
    resolveStudentAvatarUri({ studentName: 'Ana Gomez', studentId: 11 }),
    resolveStudentAvatarUri({ nombre: 'Ana Gomez', id: 11 }),
  );
});
