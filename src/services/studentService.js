import { STUDENT_PROFILE_PATH } from '../config/api';
import { request } from './httpClient';

const readStudentProfileFromPayload = (payload) => {
  const data = payload?.data || payload || {};

  return data.estudiante || data.student || data.perfil || data.profile || data || null;
};

export const getMyStudentProfile = async (token) => {
  if (!token) {
    throw new Error('No hay token de estudiante para cargar el perfil.');
  }

  const payload = await request(STUDENT_PROFILE_PATH, {
    method: 'GET',
    token,
  });

  const profile = readStudentProfileFromPayload(payload);

  if (!profile) {
    throw new Error('El backend no devolvio el perfil del estudiante.');
  }

  return profile;
};
