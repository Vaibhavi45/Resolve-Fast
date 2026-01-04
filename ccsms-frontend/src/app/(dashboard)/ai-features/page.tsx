'use client';

import { Sparkles, MessageSquare, TrendingUp, Zap, Bot, Target } from 'lucide-react';

export default function AIFeaturesPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Embrace AI and Automation
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
          AI and automation are essential for managing customer complaints at scale. Here are several ways they can help support teams streamline and enhance the feedback management process.
        </p>
      </div>

      <div className="grid gap-8 mb-12">
        {/* Complaint Summarization */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="flex items-start gap-4">
            <div className="bg-[#1da9c3]/10 p-3 rounded-lg">
              <Sparkles className="text-[#1da9c3]" size={32} />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Complaint Summarization and Insights
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                AI can summarize complaints for agents, providing insights into customer sentiment and intent, helping agents understand the context and resolve issues more quickly. It can also provide surface resolutions for similar complaints so agents can see how their teammates effectively resolved a related issue.
              </p>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border-l-4 border-[#1da9c3]">
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Example Insight:</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Intent:</span> Product Defect | 
                  <span className="font-medium ml-2">Sentiment:</span> Frustrated | 
                  <span className="font-medium ml-2">Priority:</span> High
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Proactive Response Suggestions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="flex items-start gap-4">
            <div className="bg-[#1da9c3]/10 p-3 rounded-lg">
              <MessageSquare className="text-[#1da9c3]" size={32} />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Proactive Response Suggestions
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Agent copilots can suggest contextually relevant responses and actions to take, streamlining the ticket resolution process and ensuring faster, more accurate resolutions.
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <Bot size={16} className="text-[#1da9c3]" />
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Auto Assist Suggestion</p>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                  "Thank you for reaching out about your issue. I've reviewed your complaint and can help resolve this right away. Could you please confirm your booking ID so I can look into the details?"
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Intelligent Routing */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="flex items-start gap-4">
            <div className="bg-[#1da9c3]/10 p-3 rounded-lg">
              <Target className="text-[#1da9c3]" size={32} />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Intelligent Routing
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                AI can route complaints based on intent, sentiment, and priority, matching each customer with the right agent for their specific problem. For example, AI can analyze a customer's message about a delayed shipment, detect high frustration levels, and automatically escalate the ticket to a senior agent skilled in handling time-sensitive issues and de-escalating tense situations.
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Intent</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Billing Issue</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sentiment</p>
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400">High Frustration</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Route To</p>
                  <p className="text-sm font-semibold text-[#1da9c3]">Senior Agent</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 24/7 AI Agents */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="flex items-start gap-4">
            <div className="bg-[#1da9c3]/10 p-3 rounded-lg">
              <Zap className="text-[#1da9c3]" size={32} />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                24/7 AI Agents
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                AI-powered bots can resolve complaints even when human agents are off the clock. These advanced bots can handle complex issues independently and escalate to a human agent when necessary.
              </p>
              <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  AI Agent is online and ready to assist 24/7
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="bg-gradient-to-r from-[#1da9c3] to-[#178a9f] rounded-lg shadow-xl p-8 text-center text-white">
        <h3 className="text-2xl font-bold mb-3">
          Combine AI with Human Empathy
        </h3>
        <p className="text-lg mb-6 opacity-90">
          By combining AI capabilities with human empathy, you create a complaint management system that is both efficient and genuinely caring.
        </p>
        <button className="bg-white text-[#1da9c3] px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
          Get Started with AI
        </button>
      </div>
    </div>
  );
}
