import React, {useEffect, useState} from 'react';

export default function PollHistory({ questions, results, onBack }) {
    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">Poll History</h2>
                <button onClick={onBack} className="px-4 py-2 border rounded hover:bg-gray-50">
                    Back to Questions
                </button>
            </div>
            <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-4">
                {questions.map((q, qi) => (
            <div key={`${q.id}-${qi}`} className="border rounded p-3 bg-white">
              <div className="bg-gray-800 text-white px-3 py-2 rounded-t">{q.text}</div>
              <div className="p-4">
                {q.options.map((o,oi)=> {
                  const count = results[q.id]?.[o.id] || 0;
                  const total = results[q.id] ? Object.values(results[q.id]).reduce((a, b) => a + b, 0) : 0;
                  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                  
                  return (
                    <div key={o.id} className="mb-3">
                      <div className="flex justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">{oi+1}</div>
                          <div>{o.text}</div>
                        </div>
                        <div className="text-sm font-medium">{count} votes ({percent}%)</div>
                      </div>
                      <div className="w-full bg-gray-100 h-4 rounded">
                        <div style={{width: percent + '%'}} className="h-4 rounded purple transition-all duration-300"></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
}