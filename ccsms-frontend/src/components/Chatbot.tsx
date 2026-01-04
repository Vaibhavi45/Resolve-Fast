'use client';

import { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ text: string; isBot: boolean }[]>([
    { text: "Hi! I'm here to help. Ask me anything about ResolveFast!", isBot: true }
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;

    setMessages([...messages, { text: input, isBot: false }]);
    
    // Simple bot responses
    setTimeout(() => {
      let botResponse = '';
      const lowerInput = input.toLowerCase();
      
      if (lowerInput.includes('price') || lowerInput.includes('cost') || lowerInput.includes('pricing')) {
        botResponse = 'We offer 3 plans: Starter ($29/mo), Professional ($99/mo), and Enterprise ($299/mo). Each plan includes different features and complaint limits.';
      } else if (lowerInput.includes('complaint') || lowerInput.includes('issue')) {
        botResponse = 'You can submit complaints through web, email, or SMS. Our AI will automatically route it to the right agent based on your location and issue type.';
      } else if (lowerInput.includes('ai') || lowerInput.includes('automation')) {
        botResponse = 'Our AI features include complaint summarization, proactive response suggestions, intelligent routing, and 24/7 AI agents to help resolve issues faster.';
      } else if (lowerInput.includes('agent') || lowerInput.includes('support')) {
        botResponse = 'Our agents are available 24/7 with AI assistance. Average first reply time is 2.5 hours, and we maintain 95% customer satisfaction.';
      } else if (lowerInput.includes('how') || lowerInput.includes('work')) {
        botResponse = 'It\'s simple: 1) Submit your complaint, 2) AI routes it to the right agent, 3) Get rapid resolution with AI-powered suggestions.';
      } else if (lowerInput.includes('hello') || lowerInput.includes('hi')) {
        botResponse = 'Hello! How can I help you today? Feel free to ask about pricing, features, or how ResolveFast works.';
      } else {
        botResponse = 'I can help you with information about pricing, features, AI capabilities, and how ResolveFast works. What would you like to know?';
      }
      
      setMessages(prev => [...prev, { text: botResponse, isBot: true }]);
    }, 500);
    
    setInput('');
  };

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-[#1da9c3] text-white p-4 rounded-full shadow-lg hover:bg-[#178a9f] transition-all z-50 animate-bounce"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl flex flex-col z-50 border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="bg-[#1da9c3] text-white p-4 rounded-t-lg flex justify-between items-center">
            <div className="flex items-center gap-2">
              <MessageCircle size={20} />
              <span className="font-semibold">ResolveFast Assistant</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-[#178a9f] p-1 rounded">
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[80%] p-3 rounded-lg ${
                  msg.isBot 
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' 
                    : 'bg-[#1da9c3] text-white'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask a question..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1da9c3] dark:bg-gray-700 dark:text-white"
              />
              <button
                onClick={handleSend}
                className="bg-[#1da9c3] text-white p-2 rounded-lg hover:bg-[#178a9f] transition-colors"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
