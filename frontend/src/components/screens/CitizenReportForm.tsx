import React, { useState } from 'react';
import { Send, CheckCircle, AlertCircle } from 'lucide-react';
import { postEvent } from '../../services/api';

export const CitizenReportForm: React.FC = () => {
  const [reportType, setReportType] = useState<string>('landslide');
  const [description, setDescription] = useState<string>('');
  const [segmentId, setSegmentId] = useState<number>(100001);
  const [submitted, setSubmitted] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await postEvent({
        type: reportType,
        payload: {
          segment_ids: [segmentId],
          description: description || 'Citizen reported road hazard'
        },
        source_type: 'citizen'
      });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-2 text-center">
        <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
          <Send className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-bold text-white">Public Citizen Hazard Report</h2>
        <p className="text-xs text-gray-400">Submits low-trust report (Trust=0.30) to verification queue. Corroboration threshold triggers road status updates.</p>
      </div>

      {submitted ? (
        <div className="glass-panel p-6 rounded-2xl border border-emerald-500/30 text-center space-y-3">
          <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
          <h3 className="text-sm font-bold text-white">Report Submitted Successfully</h3>
          <p className="text-xs text-gray-400">Thank you. Your report has been logged and assigned for corroboration.</p>
          <button onClick={() => setSubmitted(false)} className="text-xs font-semibold text-blue-400 underline">Submit Another Report</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4 text-xs">
          <div>
            <label className="text-gray-400 font-semibold block mb-1">Hazard Type:</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl p-2.5 text-white"
            >
              <option value="landslide">Landslide / Mudslide</option>
              <option value="flood">Flash Flood / Waterlogging</option>
              <option value="breakdown">Bridge Damage / Blockage</option>
            </select>
          </div>

          <div>
            <label className="text-gray-400 font-semibold block mb-1">Target Segment ID:</label>
            <input
              type="number"
              value={segmentId}
              onChange={(e) => setSegmentId(Number(e.target.value))}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl p-2.5 text-white font-mono"
            />
          </div>

          <div>
            <label className="text-gray-400 font-semibold block mb-1">Description / Details:</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe road blockage or landslide observation..."
              className="w-full bg-gray-900 border border-gray-800 rounded-xl p-2.5 text-white"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            Submit Citizen Hazard Report
          </button>
        </form>
      )}
    </div>
  );
};
