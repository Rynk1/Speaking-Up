import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle, XCircle, RefreshCw, Eye, Edit3, Lock } from 'lucide-react';

interface PrivacyReviewItem {
  id: string;
  author_id: string;
  author_name: string;
  author_handle: string;
  post_type: string;
  privacy_status: string;
  findings_count: number;
  created_at: string;
}

interface ItemDetail {
  submission: any;
  sources: any[];
  findings: any[];
  publicProjection: any;
}

export const PrivacyReviewPortal: React.FC = () => {
  const [items, setItems] = useState<PrivacyReviewItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ItemDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [overrideText, setOverrideText] = useState<string>('');
  const [decisionMessage, setDecisionMessage] = useState<string>('');

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/privacy-review');
      if (res.ok) {
        const data = await res.json();
        setItems(data);
        if (data.length > 0 && !selectedId) {
          setSelectedId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load review items', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/privacy-review/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDetail(data);
        setOverrideText(data.publicProjection?.text || '');
      }
    } catch (err) {
      console.error('Failed to load detail', err);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    if (selectedId) {
      fetchDetail(selectedId);
    }
  }, [selectedId]);

  const handleDecision = async (action: 'approve' | 'modify' | 'block' | 'reprocess') => {
    if (!selectedId) return;
    try {
      const res = await fetch(`/api/admin/privacy-review/${selectedId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          modifiedText: action === 'modify' ? overrideText : undefined,
          reason: `Action executed by moderator via P3RE Privacy Portal`
        })
      });

      if (res.ok) {
        setDecisionMessage(`Action "${action.toUpperCase()}" applied successfully.`);
        fetchItems();
      }
    } catch (err) {
      setDecisionMessage('Failed to submit decision');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-2.5 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center space-x-3 border-b border-gray-200 dark:border-gray-800 pb-3">
        <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white shrink-0 shadow-md">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[10px] sm:text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
            Safety & Privacy Review Desk
          </div>
          <h1 className="text-base sm:text-2xl font-extrabold text-gray-900 dark:text-gray-100 leading-snug">
            P³RE Privacy Review Portal
          </h1>
        </div>
      </div>

      {decisionMessage && (
        <div className="p-3 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-800 text-green-800 dark:text-green-300 rounded-lg text-sm flex justify-between items-center">
          <span>{decisionMessage}</span>
          <button onClick={() => setDecisionMessage('')} className="text-xs text-green-700 dark:text-green-400 font-bold">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Queue Column */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800">
            <h2 className="font-semibold text-gray-800 dark:text-gray-200">Review Queue ({items.length})</h2>
            <button onClick={fetchItems} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-gray-500 p-4">Loading queue...</p>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-gray-500 space-y-2">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
              <p className="text-sm font-medium">Privacy review queue is clear!</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {items.map(item => (
                <div
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition ${
                    selectedId === item.id
                      ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20'
                      : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <div className="flex justify-between items-start text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span className="font-mono">{item.id.slice(0, 12)}...</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-semibold">
                      {item.privacy_status}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.author_name}</p>
                  <p className="text-xs text-gray-500">{item.findings_count} findings detected</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dual Pane Inspector Column */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-5">
          {!detail ? (
            <div className="text-center py-16 text-gray-500">
              <Eye className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Select a submission from the queue to inspect findings and projections.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Findings Summary */}
              <div>
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-2">
                  Detected Findings ({detail.findings.length})
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {detail.findings.map((f, i) => (
                    <div key={i} className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-xs flex justify-between items-center">
                      <div>
                        <span className="font-bold text-gray-900 dark:text-gray-100">{f.type}</span>
                        <span className="text-gray-500 ml-1">({f.detector})</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 font-medium">
                        {f.policy_action}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dual-Pane Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Original Source */}
                <div className="p-4 bg-red-50/30 dark:bg-red-950/10 border border-red-200 dark:border-red-900/50 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-red-800 dark:text-red-300">
                    <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5" /> CANONICAL ORIGINAL EVIDENCE</span>
                    <span>RESTRICTED</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-gray-950 rounded border text-sm text-gray-800 dark:text-gray-200 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {detail.sources.find(s => s.source_type === 'TEXT')?.content_text || 'No text content'}
                  </div>
                </div>

                {/* Generated Public Projection */}
                <div className="p-4 bg-green-50/30 dark:bg-green-950/10 border border-green-200 dark:border-green-900/50 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-green-800 dark:text-green-300">
                    <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> PUBLIC PROJECTION PREVIEW</span>
                    <span>PUBLIC SAFE</span>
                  </div>
                  <textarea
                    value={overrideText}
                    onChange={e => setOverrideText(e.target.value)}
                    className="w-full p-3 bg-white dark:bg-gray-950 rounded border text-sm text-gray-800 dark:text-gray-200 font-sans focus:ring-2 focus:ring-amber-500 min-h-[120px]"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => handleDecision('block')}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" /> Block Report
                </button>
                <button
                  onClick={() => handleDecision('reprocess')}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium flex items-center gap-1.5"
                >
                  <RefreshCw className="w-4 h-4" /> Reprocess
                </button>
                <button
                  onClick={() => handleDecision('modify')}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium flex items-center gap-1.5"
                >
                  <Edit3 className="w-4 h-4" /> Override & Save
                </button>
                <button
                  onClick={() => handleDecision('approve')}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" /> Approve & Publish
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
