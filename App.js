import React, { useState } from 'react';
import DashboardScreen from './src/screens/DashboardScreen';
import StudentAccessScreen from './src/screens/StudentAccessScreen';

export default function App() {
  const [studentSession, setStudentSession] = useState(null);

  if (!studentSession) {
    return <StudentAccessScreen onAccessGranted={setStudentSession} />;
  }

  return (
    <DashboardScreen
      studentSession={studentSession}
      onLogout={() => setStudentSession(null)}
    />
  );
}
