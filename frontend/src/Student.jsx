import React, {useEffect, useState} from 'react';

export default function Student({socket, onBack}){
  const [joined, setJoined] = useState(false);
  const [name, setName] = useState(() => localStorage.getItem('studentName') || '');
  const [current, setCurrent] = useState(null);
  const [results, setResults] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [timeLeft, setTimeLeft] = useState(null);
  const [answered, setAnswered] = useState(true);

  useEffect(()=>{
    socket.on('poll:updated', (data)=>{ 
      setQuestions(data.questions || []); 
      if(data.participants) setParticipants(data.participants);
    });
    socket.on('question:started', ({question, timeLimit})=>{ 
      console.log('Received question:', question);
      setCurrent(question); 
      setResults(null); 
      setAnswered(false);
      setTimeLeft(timeLimit);

      // Start countdown timer
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Cleanup timer when component unmounts or new question starts
      return () => clearInterval(timer);
    });
    socket.on('answers:updated', ({questionId, results}) => {
      if (current && questionId === current.id) {
        setResults(results);
      }
    });
    socket.on('question:ended', ({questionId, results}) => {
      if (current && questionId === current.id) {
        setResults(results);
      }
    });
    socket.on('participants:updated', (parts)=> setParticipants(parts || []));
    socket.on('kicked', ()=>{ 
      alert('You were kicked'); 
      setJoined(false); 
      setCurrent(null); 
      setResults(null); 
    });
    return ()=>{
      socket.off('poll:updated');
      socket.off('question:started');
      socket.off('answers:updated');
      socket.off('question:ended');
      socket.off('participants:updated');
      socket.off('kicked');
    };
  },[socket]);

  const join = ()=>{
    if(!name) return alert('Please enter your name');
    console.log('Attempting to join with name:', name);
    
    if (!socket.connected) {
      console.error('Socket not connected');
      alert('Unable to connect to server. Please try again.');
      return;
    }

    socket.emit('student:join', {name}, (res)=>{ 
      console.log('Join response:', res);
      if(res && res.ok){ 
        console.log('Successfully joined');
        localStorage.setItem('studentName', name);
        setJoined(true);
      } else if(res && res.error === 'name_taken') {
        console.error('Name already taken');
        alert('This name is already taken. Please choose another name.');
      } else if(res && res.error) {
        console.error('Join error:', res.error);
        alert(res.error);
      } else {
        console.log('Joined without explicit ok');
        localStorage.setItem('studentName', name);
        setJoined(true);
      }
    });
  };

  const answer = (optionId)=>{
    if(!current) return;
    socket.emit('student:answer', {questionId: current.id, optionId}, (res)=>{ 
      if(res && res.ok) {
        // Set answered immediately and wait for results update
        setAnswered(true);
        socket.once('answers:updated', ({results: newResults}) => {
          setResults(newResults);
        });
      } else if(res && res.error) {
        alert(res.error);
      }
    });
  };

  return (
    <div>
      {!joined ? (
        <div className="max-w-lg mx-auto p-8 bg-white rounded text-center">
          <h2 className="text-xl font-semibold mb-2">Join poll</h2>
          <p className="text-sm text-gray-500 mb-4">Enteryour name to join the live session</p>
          <input className="w-full border p-3 rounded mb-3" placeholder="Your name" value={name} onChange={e=>setName(e.target.value)} />
          <div className="flex justify-center gap-3">
            <button className="px-4 py-2 purple rounded text-white" onClick={join}>Join</button>
            <button className="px-4 py-2 border rounded" onClick={onBack}>Back</button>
          </div>
        </div>
      ) : (
        <div>
          <div className="text-sm text-gray-500 mb-3">Participants: {participants.length}</div>
          {current ? (
            <div className="p-6 bg-white rounded shadow-sm">
              <div className="border-b pb-4 mb-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold">{current.text}</h3>
                  <div className={`text-sm ${timeLeft <= 10 ? 'text-red-500' : 'text-gray-500'}`}>
                    Time left: {timeLeft}s
                  </div>
                </div>
                {answered && (
                  <div className="text-green-600 text-sm">
                    Your answer has been submitted!
                  </div>
                )}
              </div>
              
              <div className="space-y-3 mt-4">
                {current.options.map((opt, oi) => {
                  // Get the vote count for this option and ensure it's a number
                  const count = results ? parseInt(results[opt.id] || 0) : 0;
                  // Calculate total votes by summing all option counts
                  const total = results ? Object.values(results).reduce((a, b) => parseInt(a) + parseInt(b), 0) : 0;
                  // Calculate percentage, ensuring we don't divide by zero
                  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                  
                  return (
                    <div key={opt.id} className="relative">
                      {!answered ? (
                        <button 
                          className="option-btn flex items-center justify-between w-full p-3 border rounded hover:bg-indigo-50 relative z-10"
                          onClick={() => answer(opt.id)}
                          disabled={timeLeft === 0}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">{oi+1}</div>
                            <div>{opt.text}</div>
                          </div>
                          <div className="text-sm text-gray-500">Choose</div>
                        </button>
                      ) : (
                        <div className="p-3 border rounded">
                          <div className="flex justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">{oi+1}</div>
                              <div>{opt.text}</div>
                            </div>
                            <div className="text-sm font-medium">{count} votes ({percent}%)</div>
                          </div>
                          <div className="w-full bg-gray-100 h-4 rounded">
                            <div 
                              className="h-4 rounded purple transition-all duration-300" 
                              style={{width: percent + '%'}}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {answered && results && (
                  <div className="text-sm text-gray-500 text-center mt-4">
                    Total responses: {Object.values(results).reduce((a, b) => a + b, 0)}
                  </div>
                )}
              </div>
              
              {timeLeft === 0 && !answered && (
                <div className="text-center text-red-500 mt-4">
                  Time's up! You can no longer answer this question.
                </div>
              )}
            </div>
          ) : results ? (
            <div className="p-6 bg-white rounded shadow-sm">
              <h3 className="font-semibold mb-3">Results</h3>
              {Object.keys(results).map((k, i)=> (
                <div key={k} className="mb-3">
                  <div className="flex justify-between mb-2"><div>{k}</div><div>{results[k]}</div></div>
                  <div className="w-full bg-gray-100 h-3 rounded"><div style={{width: Math.min(100, (results[k]||0)*10) + '%'}} className="h-3 rounded purple"></div></div>
                </div>
              ))}
            </div>
          ) : questions && questions.length > 0 ? (
            <div className="text-center p-6 bg-white rounded shadow-sm">Wait for the teacher to start the next question...</div>
          ) : (
            <div className="text-center p-6 bg-white rounded shadow-sm">
              <p>Waiting for the teacher to create questions...</p>
              <p className="text-sm text-gray-500 mt-2">You'll see questions here once they're available</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
