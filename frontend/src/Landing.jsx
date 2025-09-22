import React, {useState} from 'react';

export default function Landing({onChoose}){
  const [selected, setSelected] = useState('student');
  return (
    <div className="text-center">
      <h1 className="text-3xl font-semibold mb-2">Welcome to the Live Polling System</h1>
      <p className="text-gray-500 mb-8">Please select the role that best describes you to begin using the live polling system</p>
      <div className="flex justify-center gap-6 mb-6">
        <div onClick={()=>setSelected('student')} className={`p-6 w-80 rounded-lg border ${selected==='student'?'border-indigo-400 shadow-xl':'border-gray-200'} bg-white cursor-pointer`}>
          <h3 className="font-semibold">I'm a Student</h3>
          <p className="text-sm text-gray-500 mt-2">Submit answers and participate in polls</p>
        </div>
        <div onClick={()=>setSelected('teacher')} className={`p-6 w-80 rounded-lg border ${selected==='teacher'?'border-indigo-400 shadow-xl':'border-gray-200'} bg-white cursor-pointer`}>
          <h3 className="font-semibold">I'm a Teacher</h3>
          <p className="text-sm text-gray-500 mt-2">Create polls and view results in real-time</p>
        </div>
      </div>
      <div>
        <button onClick={()=>{ onChoose(selected); }} className="px-8 py-3 rounded-full purple text-white font-semibold">Continue</button>
      </div>
    </div>
  );
}
