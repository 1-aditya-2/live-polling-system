import React, {useEffect, useState} from 'react';
import PollHistory from './PollHistory';

export default function Teacher({socket, onBack}){
  const [questions, setQuestions] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [qText, setQText] = useState('');
  const [opts, setOpts] = useState(['','']);
  const [timeLimit, setTimeLimit] = useState(60);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [results, setResults] = useState({});
  const [canAskQuestion, setCanAskQuestion] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const handleHistoryButton = () => {
    setShowHistory(true);
  };

  useEffect(()=>{
    console.log('Teacher component mounted');
    
    // Connect as teacher when component mounts
    socket.emit('teacher:createPoll', (res)=>{ 
      if(res && res.error) {
        console.error('Teacher creation error:', res.error);
        alert(res.error);
      } else if(res && res.ok) {
        console.log('Successfully registered as teacher');
      }
    });

    const handlers = {
      'poll:updated': (p) => {
        console.log('Poll updated:', p);
        // Ensure we don't have duplicate questions by checking IDs
        if (p.questions) {
          const uniqueQuestions = p.questions.reduce((acc, q) => {
            acc[q.id] = q;
            return acc;
          }, {});
          setQuestions(Object.values(uniqueQuestions));
        } else {
          setQuestions([]);
        }
      },
      'participants:updated': (parts) => {
        console.log('Participants updated:', parts);
        setParticipants(parts || []);
        
        // Check if all students have answered current question
        if (currentQuestion) {
          const allAnswered = parts.length > 0 && parts.every(p => p.answered);
          setCanAskQuestion(allAnswered);
        }
      },
      'question:started': ({question, timeLimit}) => {
        console.log('Question started:', question);
        setCurrentQuestion(question);
        setCanAskQuestion(false);
      },
      'question:ended': ({questionId, results}) => {
        console.log('Question ended:', questionId);
        setCurrentQuestion(null);
        setResults(prev => ({...prev, [questionId]: results}));
        setCanAskQuestion(true);
      },
      'answers:updated': ({questionId, results}) => {
        console.log('Answers updated:', results);
        setResults(prev => ({...prev, [questionId]: results}));
      }
    };

    // Register all event handlers
    Object.entries(handlers).forEach(([event, handler]) => {
      socket.on(event, handler);
    });
    
    return ()=>{
      // Cleanup all event handlers
      Object.keys(handlers).forEach(event => {
        socket.off(event);
      });
    };
  },[socket]);

  const addOption = ()=> setOpts(s=>[...s,'']);

  const setOpt = (i,v)=> { const a=[...opts]; a[i]=v; setOpts(a); }

  const addQuestion = ()=>{
    if(!qText) return alert('Enter question text');
    if(opts.filter(Boolean).length < 2) return alert('Add at least 2 options');
    
    socket.emit('teacher:addQuestion', {
      question:{text:qText, options:opts.filter(Boolean), timeLimit}
    }, (res)=>{ 
      if(res && res.q){ 
        // Use a Map to ensure unique questions by ID
        setQuestions(prev => {
          const questionsMap = new Map(prev.map(q => [q.id, q]));
          questionsMap.set(res.q.id, res.q);
          return Array.from(questionsMap.values());
        });
        setQText(''); 
        setOpts(['','']); 
      } 
    });
  };

  const startQuestion = (qId)=>{
    socket.emit('teacher:startQuestion', {questionId:qId}, (res)=>{ 
      if(res && res.error) alert(res.error); 
    });
  };

  const kick = (sid)=>{
    socket.emit('teacher:kick', {socketId: sid}, (res)=>{ 
      if(res && res.error) alert(res.error); 
    });
  };

  if (showHistory) {
    return (
      <PollHistory 
        questions={questions}
        results={results}
        onBack={() => setShowHistory(false)}
      />
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-semibold">Let’s Get Started</h2>
          <p className="text-gray-500">you'll have the ability to create and manage polls, ask questions, and monitor responses</p>
        </div>
      </div>
      <div className='flex justify-between items-start mb-4'>
        <h1 className="mt-9 text-xl font-bold">Enter your question here</h1>
          <div className="mt-6 ml-4">
            <select className="block mt-2 border rounded p-2" value={timeLimit} onChange={e=>setTimeLimit(Number(e.target.value))}>
              <option value={30}>30 seconds</option>
              <option value={45}>45 seconds</option>
              <option value={60}>60 seconds</option>
              <option value={90}>90 seconds</option>
            </select>
          </div>
      </div>
      
      <div className="mt-3 p-6 bg-gray-100 rounded">
        <div className="flex justify-between items-start mb-4">
          <textarea className="w-full p-4 bg-white rounded border h-32" placeholder="Enter your question here..." value={qText} onChange={e=>setQText(e.target.value)} maxLength={400} />
  
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className='flex justify-between items-start mb-4'>
            <h4 className=" mb-2 font-semibold">Edit Options</h4>
            <h3 className='mb-2 font-semibold'>Is it correct?</h3>
            </div>
            <div className="space-y-3">
              {opts.map((o,i)=> (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-medium">{i+1}</div>
                  <input className="w-full p-3 bg-gray-50 rounded border" value={o} onChange={e=>setOpt(i, e.target.value)} placeholder={'Option '+(i+1)} />
                  <div className="flex gap-2 items-center">
                    <label className="inline-flex items-center"><input type="radio" name={'correct_'+i} className="mr-1" /> Yes</label>
                    <label className="inline-flex items-center"><input type="radio" name={'correct_'+i} className="mr-1" /> No</label>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <button className="px-3 py-2 border rounded text-indigo-600" onClick={addOption}>+ Add More option</button>
            </div>
          </div>

          <div>
            {/* <h4 className="font-medium mb-2">Is it Correct?</h4>
            <div className="p-4 bg-white rounded border">
              <div className="text-sm text-gray-600 mb-2">Participants</div>
              <div className="space-y-2">
                {participants.length===0 && <div className="text-sm text-gray-500">No participants yet</div>}
                {participants.map((p,i)=> (
                  <div key={p.socketId || i} className="flex justify-between items-center">
                    <div>{p.name}</div>
                    <div><button className="text-red-500" onClick={()=>kick(p.socketId)}>Kick</button></div>
                  </div>
                ))}
              </div>
            </div> */}
          </div>
        </div>

        <div className="mt-6 flex justify-between items-center">
          <div className="text-sm">
            {!canAskQuestion && currentQuestion && 
              <span className="text-orange-500">Waiting for all students to answer...</span>
            }
            {!canAskQuestion && !currentQuestion && 
              <span className="text-orange-500">Question in progress...</span>
            }
          </div>
          <button 
            className={`px-6 py-3 bg-gray-300 text-gray-500'} rounded-full`}
            onClick={handleHistoryButton}
          >
            Show History
          </button>
          <button 
            className={`px-6 py-3 ${canAskQuestion ? 'purple text-white' : 'bg-gray-300 text-gray-500'} rounded-full`}
            onClick={addQuestion}
            disabled={!canAskQuestion}
          >
            Ask Question
          </button>
        </div>

        {/* Live Results Section */}
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Question History & Results</h3>
          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div key={q.id} className="p-4 bg-white rounded shadow">
                <div className="font-medium mb-2">Question {idx + 1}: {q.text}</div>
                {results[q.id] ? (
                  <div className="space-y-2">
                    {q.options.map(opt => {
                      const count = results[q.id][opt.id] || 0;
                      const total = Object.values(results[q.id]).reduce((a, b) => a + b, 0);
                      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                      
                      return (
                        <div key={opt.id} className="flex items-center gap-2">
                          <div className="w-32">{opt.text}</div>
                          <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                            <div 
                              className="h-full bg-indigo-500" 
                              style={{width: `${percentage}%`}}
                            />
                          </div>
                          <div className="w-20 text-sm">{count} ({percentage}%)</div>
                        </div>
                      );
                    })}
                    <div className="text-sm text-gray-500 mt-2">
                      Total responses: {Object.values(results[q.id]).reduce((a, b) => a + b, 0)}
                    </div>
                  </div>
                ) : (
                  currentQuestion?.id === q.id ? (
                    <div className="text-orange-500">Question in progress...</div>
                  ) : (
                    <button 
                      className="px-4 py-2 text-sm bg-indigo-50 text-indigo-600 rounded"
                      onClick={() => startQuestion(q.id)}
                    >
                      Start Question
                    </button>
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
