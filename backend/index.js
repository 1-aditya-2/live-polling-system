const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET','POST'] }
});

// Global state
const state = {
  participants: {}, // Connected students
  questions: [],    // All questions
  currentQuestion: null, // Currently active question
  answers: {}      // Answers for questions
};

let lastId = 0;
function makeId(prefix='id') { 
  lastId++;
  return `${prefix}_${Date.now().toString(36)}_${lastId.toString(36)}_${Math.random().toString(36).slice(2,9)}`; 
}

io.on('connection', socket => {
  console.log('New connection:', socket.id);

  socket.on('teacher:createPoll', (cb) => {
    socket.join('teacher-room');
    const participantsArray = Object.entries(state.participants).map(([sid,info]) => ({ socketId: sid, ...info }));
    socket.emit('participants:updated', participantsArray);
    cb({ok: true});
    console.log('teacher connected');
  });

  socket.on('teacher:addQuestion', ({question}, cb) => {
    const q = {
      id: makeId('q'),
      text: question.text,
      options: question.options.map((t,i)=>({id:'o'+i, text:t})),
      timeLimit: question.timeLimit||60
    };
    state.questions.push(q);
    state.answers[q.id] = {};
    q.options.forEach(o => state.answers[q.id][o.id] = 0);
    
    const participantsArray = Object.entries(state.participants).map(([sid,info]) => ({ socketId: sid, ...info }));
    io.emit('poll:updated', { 
      questions: state.questions, 
      participants: participantsArray 
    });
    
    cb({q});
  });

  socket.on('student:join', ({name}, cb) => {
    // Check if name is already taken
    const isNameTaken = Object.values(state.participants)
      .some(p => p.name.toLowerCase() === name.toLowerCase());
    
    if (isNameTaken) {
      return cb({error: 'name_taken'});
    }
    
    // Add the student to participants with explicit answered status
    state.participants[socket.id] = { 
      name, 
      answered: false,
      joinedAt: Date.now()
    };
    
    console.log('Student joined:', {
      name,
      socketId: socket.id,
      totalParticipants: Object.keys(state.participants).length
    });
    
    // Send current state to the student
    const participantsArray = Object.entries(state.participants).map(([sid,info]) => ({ socketId: sid, ...info }));
    
    // Notify everyone about the new participant
    io.emit('participants:updated', participantsArray);
    
    // Send current state to the joining student
    socket.emit('poll:updated', { 
      questions: state.questions,
      participants: participantsArray 
    });

    // If there's an active question, send it with remaining time
    if (state.currentQuestion) {
      const remainingTime = Math.floor((state.currentQuestion.endsAt - Date.now()) / 1000);
      if (remainingTime > 0) {
        socket.emit('question:started', {
          question: state.currentQuestion.question,
          timeLimit: remainingTime
        });
      }
    }

    cb({ok: true});
    console.log(name, 'joined as student');
  });

  socket.on('teacher:startQuestion', ({questionId}, cb) => {
    console.log('Teacher attempting to start question:', {
      questionId,
      currentQuestion: state.currentQuestion,
      questionsInState: state.questions.length
    });

    // Check if there's a current question
    if(state.currentQuestion) {
      console.log('Cannot start - another question is active:', state.currentQuestion.question.id);
      return cb({error:'question_active'});
    }
    
    const q = state.questions.find(x=>x.id===questionId);
    if(!q) {
      console.log('Question not found in state:', {
        requestedId: questionId,
        availableIds: state.questions.map(q => q.id)
      });
      return cb({error:'invalid question'});
    }
    
    console.log('Starting question:', {
      id: q.id,
      text: q.text,
      timeLimit: q.timeLimit
    });

    // Reset answered status for all participants
    Object.keys(state.participants).forEach(sid => state.participants[sid].answered = false);
    
    // Set current question
    state.currentQuestion = { 
      question: q, 
      endsAt: Date.now() + q.timeLimit*1000, 
      timerId: null 
    };
    
    // Verify the question was set correctly
    console.log('Question activated:', {
      isActive: !!state.currentQuestion,
      questionId: state.currentQuestion.question.id,
      endsAt: state.currentQuestion.endsAt
    });
    
    // Initialize answers if needed
    if(!state.answers[q.id]) { 
      state.answers[q.id] = {}; 
      q.options.forEach(o => state.answers[q.id][o.id] = 0); 
    }
    
    // Notify all clients
    io.emit('question:started', {
      question: q,
      timeLimit: q.timeLimit
    });
    console.log('Broadcasting question to all students:', {
      questionId: q.id,
      text: q.text,
      timeLimit: q.timeLimit,
      currentTime: Date.now(),
      endsAt: state.currentQuestion.endsAt
    });
    
    // Set timer for question end
    state.currentQuestion.timerId = setTimeout(() => {
      console.log('Question timer expired:', {
        questionId: q.id,
        totalParticipants: Object.keys(state.participants).length,
        answeredParticipants: Object.values(state.participants).filter(p => p.answered).length
      });
      endQuestion(q.id);
    }, q.timeLimit*1000);
    
    cb({ok:true});
    console.log('Started question:', questionId);
  });

  socket.on('student:answer', ({questionId, optionId}, cb) => {
    // Debug logs to help diagnose the issue
    console.log('Student attempting to answer:', {
      questionId,
      optionId,
      currentQuestionId: state.currentQuestion?.question?.id,
      isQuestionActive: !!state.currentQuestion
    });
    
    // Check if this question is currently active
    if(!state.currentQuestion || state.currentQuestion.question.id !== questionId) {
      console.log('Question not active:', {
        currentQuestion: state.currentQuestion,
        attemptedQuestionId: questionId
      });
      return cb({error:'no_active_question'});
    }
    
    // Check if student already answered
    if(state.participants[socket.id]?.answered) 
      return cb({error:'already_answered'});
    
    // Record answer
    if(!state.answers[questionId]) state.answers[questionId] = {};
    state.answers[questionId][optionId] = (state.answers[questionId][optionId] || 0) + 1;
    
    // Mark student as answered
    if(state.participants[socket.id]) {
      state.participants[socket.id].answered = true;
    }
    
    // Broadcast updated results
    io.emit('answers:updated', {
      questionId, 
      results: state.answers[questionId]
    });
    
    // Check if all students have answered
    const totalParticipants = Object.values(state.participants).length;
    const answeredParticipants = Object.values(state.participants).filter(x => x.answered).length;
    
    console.log('Answer status:', {
      totalParticipants,
      answeredParticipants,
      questionId,
      timeLeft: state.currentQuestion ? Math.ceil((state.currentQuestion.endsAt - Date.now()) / 1000) : 0
    });

    // Only end the question if ALL participants have answered AND there's at least one participant
    const allAnswered = totalParticipants > 0 && answeredParticipants === totalParticipants;
    
    if(allAnswered) {
      console.log('All participants have answered, ending question');
      if(state.currentQuestion?.timerId) {
        clearTimeout(state.currentQuestion.timerId);
      }
      endQuestion(questionId);
    }
    
    cb({ok:true});
  });

  socket.on('teacher:kick', ({socketId}, cb) => {
    if (globalPoll.teacherId !== socket.id) return cb && cb({error:'not_authorized'});
    if(globalPoll.participants[socketId]) {
      io.to(socketId).emit('kicked', {reason:'removed by teacher'});
      delete globalPoll.participants[socketId];
      const participantsArray = Object.entries(globalPoll.participants).map(([sid,info]) => ({ socketId: sid, ...info }));
      io.emit('participants:updated', participantsArray);
      cb && cb({ok:true});
    } else cb && cb({error:'not_found'});
  });

  socket.on('chat:message', ({from, text}) => {
    io.emit('chat:message', {from, text, at: Date.now()});
  });

    socket.on('disconnect', ()=>{
    // Remove participant if they exist
    if(state.participants[socket.id]){
      delete state.participants[socket.id];
      const participantsArray = Object.entries(state.participants).map(([sid,info]) => ({ socketId: sid, ...info }));
      io.emit('participants:updated', participantsArray);
    }
    console.log('Disconnected:', socket.id);
  });

  function endQuestion(questionId){
    console.log('Attempting to end question:', {
      requestedId: questionId,
      currentQuestionId: state.currentQuestion?.question?.id,
      isActive: !!state.currentQuestion
    });

    // Verify we're ending the correct question
    if (state.currentQuestion && state.currentQuestion.question.id !== questionId) {
      console.log('Warning: Attempting to end a different question than the active one');
      return;
    }

    const results = state.answers[questionId] || {};
    
    // Clear any existing timer
    if(state.currentQuestion?.timerId) {
      clearTimeout(state.currentQuestion.timerId);
      state.currentQuestion.timerId = null;
    }
    
    // Clear current question
    state.currentQuestion = null;
    
    // Notify all clients
    io.emit('question:ended', {questionId, results});
    io.emit('results:available', {questionId, results});

    console.log('Question ended successfully:', {
      questionId,
      totalAnswers: Object.values(results).reduce((a, b) => a + b, 0)
    });
  }
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, ()=>console.log('Server listening', PORT));
