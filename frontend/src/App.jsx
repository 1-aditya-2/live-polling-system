import React, {useState} from 'react';
import io from 'socket.io-client';
import Landing from './Landing';
import Teacher from './Teacher';
import Student from './Student';

const socket = io('https://live-polling-system-3gy1.onrender.com', {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity
});

socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

export default function App(){
  const [role, setRole] = useState(null);

  return (
    <div className="app-card">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="badge">Intervue Poll</div>
        </div>
        <div className="text-sm text-gray-500">In-memory demo</div>
      </div>
      {!role && <Landing onChoose={(r)=>setRole(r)} />}
      {role === 'teacher' && <Teacher socket={socket} onBack={()=>setRole(null)} />}
      {role === 'student' && <Student socket={socket} onBack={()=>setRole(null)} />}
    </div>
  );
}
