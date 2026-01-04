'use client';

import { useState } from 'react';
import { Star, X, ArrowLeft, Zap } from 'lucide-react';
import { complaintsService } from '@/lib/api/services/complaints.service';

interface FeedbackFormProps {
  complaint: {
    id: string;
    complaint_number: string;
    title: string;
    status: string;
    resolved_at?: string;
    assigned_to?: {
      first_name: string;
      last_name: string;
    };
  };
  onClose: () => void;
  onSuccess: () => void;
}

export default function FeedbackForm({ complaint, onClose, onSuccess }: FeedbackFormProps) {
  const [overallRating, setOverallRating] = useState(0);
  const [agentProfessionalism, setAgentProfessionalism] = useState(3);
  const [resolutionSpeed, setResolutionSpeed] = useState(3);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const ratingLabels = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (overallRating === 0) {
      setError('Please rate your overall experience');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await complaintsService.addFeedback(complaint.id, {
        rating: overallRating,
        agent_professionalism_rating: agentProfessionalism,
        resolution_speed_rating: resolutionSpeed,
        comment: comment.trim() || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700 p-6 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-2xl font-bold text-white">Feedback</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Ticket Info Card */}
        <div className="relative mx-6 -mt-4 mb-6 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl p-6 text-white shadow-lg">
          <div className="absolute top-4 right-4 bg-green-500 rounded-full px-3 py-1 flex items-center gap-1 text-sm font-semibold">
            <div className="w-2 h-2 bg-white rounded-full"></div>
            Resolved
          </div>
          <h3 className="text-xl font-bold mb-2">Ticket #{complaint.complaint_number}: {complaint.title}</h3>
          <p className="text-blue-100 text-sm">
            Closed on {complaint.resolved_at ? new Date(complaint.resolved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'} • 
            {complaint.assigned_to ? ` Agent: ${complaint.assigned_to.first_name} ${complaint.assigned_to.last_name}` : ' No agent assigned'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Overall Experience */}
          <div>
            <h3 className="text-xl font-bold mb-2 dark:text-white">How was your experience?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
              Please rate the overall service provided for your recent complaint resolution.
            </p>
            <div className="flex gap-2 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setOverallRating(star)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    size={40}
                    className={star <= overallRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                  />
                </button>
              ))}
            </div>
            {overallRating > 0 && (
              <p className="text-blue-600 dark:text-blue-400 font-medium">{ratingLabels[overallRating - 1]}</p>
            )}
          </div>

          {/* Agent Professionalism */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-lg font-semibold dark:text-white">Agent Professionalism</label>
              <span className="text-blue-600 dark:text-blue-400 font-bold">{agentProfessionalism}/5</span>
            </div>
            <div className="relative">
              <input
                type="range"
                min="1"
                max="5"
                value={agentProfessionalism}
                onChange={(e) => setAgentProfessionalism(parseInt(e.target.value))}
                className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                style={{
                  background: `linear-gradient(to right, #2563eb 0%, #2563eb ${((agentProfessionalism - 1) / 4) * 100}%, #e5e7eb ${((agentProfessionalism - 1) / 4) * 100}%, #e5e7eb 100%)`
                }}
              />
              <div className="flex justify-between mt-2">
                <span className="text-gray-500 dark:text-gray-400 text-sm">😞 Poor</span>
                <span className="text-gray-500 dark:text-gray-400 text-sm">😊 Excellent</span>
              </div>
            </div>
          </div>

          {/* Resolution Speed */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-lg font-semibold dark:text-white flex items-center gap-2">
                <Zap size={20} className="text-yellow-500" />
                Resolution Speed
              </label>
              <span className="text-blue-600 dark:text-blue-400 font-bold">{resolutionSpeed}/5</span>
            </div>
            <div className="relative">
              <input
                type="range"
                min="1"
                max="5"
                value={resolutionSpeed}
                onChange={(e) => setResolutionSpeed(parseInt(e.target.value))}
                className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                style={{
                  background: `linear-gradient(to right, #2563eb 0%, #2563eb ${((resolutionSpeed - 1) / 4) * 100}%, #e5e7eb ${((resolutionSpeed - 1) / 4) * 100}%, #e5e7eb 100%)`
                }}
              />
              <div className="flex justify-between mt-2">
                <span className="text-gray-500 dark:text-gray-400 text-sm">🚫 Slow</span>
                <span className="text-blue-600 dark:text-blue-400 text-sm flex items-center gap-1">
                  <Zap size={16} /> Fast
                </span>
              </div>
            </div>
          </div>

          {/* Additional Comments */}
          <div>
            <label className="block text-lg font-semibold mb-2 dark:text-white">
              Additional Comments (Optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => {
                if (e.target.value.length <= 500) {
                  setComment(e.target.value);
                }
              }}
              rows={4}
              placeholder="Tell us what we could have done better..."
              className="w-full px-4 py-3 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 resize-none"
            />
            <div className="text-right text-sm text-gray-500 dark:text-gray-400 mt-1">
              {comment.length}/500
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || overallRating === 0}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Submitting...
              </>
            ) : (
              <>
                Submit Feedback
                <ArrowLeft size={20} className="rotate-180" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

