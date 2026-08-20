import React, { useState } from 'react';
import { Building2, X, Check, ShieldCheck, Loader2, Send } from 'lucide-react';
import { CivicPost, Institution } from '../types';
import { api } from '../services/api';

interface InstitutionResponseModalProps {
  post: CivicPost | null;
  isOpen: boolean;
  onClose: () => void;
  onResponseSubmitted: () => void;
  institutionsList: Institution[];
  currentInstitutionId?: string;
}

export const InstitutionResponseModal: React.FC<InstitutionResponseModalProps> = ({
  post,
  isOpen,
  onClose,
  onResponseSubmitted,
  institutionsList,
  currentInstitutionId
}) => {
  const [selectedInstId, setSelectedInstId] = useState(
    currentInstitutionId || post?.institutionTags[0]?.institutionId || 'ghana-police-service'
  );
  const [responseType, setResponseType] = useState<any>('WE_ARE_AWARE');
  const [message, setMessage] = useState('');
  const [responderName, setResponderName] = useState('Official Communications Officer');
  const [responderTitle, setResponderTitle] = useState('Public Relations Secretariat');
  const [redirectedTo, setRedirectedTo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !post) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    try {
      await api.submitInstitutionResponse(post.id, {
        institutionId: selectedInstId,
        responseType,
        message: message.trim(),
        responderName,
        responderTitle,
        redirectedToInstitutionId: redirectedTo || undefined
      });
      setIsSubmitting(false);
      onResponseSubmitted();
      onClose();
    } catch (err) {
      console.error('Failed to submit institutional response:', err);
      setIsSubmitting(false);
    }
  };

  const selectedInst = institutionsList.find(i => i.id === selectedInstId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg text-slate-100 shadow-2xl overflow-hidden my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-white flex items-center gap-1.5">
                Official Public Response
                <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800/60 font-semibold">
                  Verified Authority
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">Publish a verified public update directly onto the post timeline</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div className="p-2.5 bg-slate-800/60 rounded-xl text-xs border border-slate-700">
            <span className="text-slate-400">Responding to Citizen Observation: </span>
            <strong className="text-slate-200">"{post.title}"</strong>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Responding Institution:
            </label>
            <select
              value={selectedInstId}
              onChange={e => setSelectedInstId(e.target.value)}
              className="w-full p-2 bg-slate-800 text-xs text-slate-100 rounded-lg border border-slate-700 font-semibold"
            >
              {institutionsList.map(inst => (
                <option key={inst.id} value={inst.id}>
                  {inst.officialName} ({inst.acronym})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Official Response Status:
            </label>
            <select
              value={responseType}
              onChange={e => setResponseType(e.target.value)}
              className="w-full p-2 bg-slate-800 text-xs text-slate-100 rounded-lg border border-slate-700"
            >
              <option value="WE_ARE_AWARE">We are aware (Acknowledged by leadership)</option>
              <option value="ACTION_TAKEN">Action taken / Officers or equipment deployed</option>
              <option value="INVESTIGATING">Technical team investigating</option>
              <option value="PUBLIC_GUIDANCE">Public safety guidance issued</option>
              <option value="OUTSIDE_MANDATE">Outside our mandate / Redirected to another agency</option>
              <option value="CONTACT_DIRECTLY">Please contact our designated direct desk</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Official Statement / Public Guidance:
            </label>
            <textarea
              rows={4}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="e.g. Our rapid response team has dispatched dewatering pumps to the site. Citizens are advised to use alternative routes..."
              className="w-full p-2.5 bg-slate-800 text-xs text-slate-100 placeholder-slate-500 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Spokesperson Name:</label>
              <input
                type="text"
                value={responderName}
                onChange={e => setResponderName(e.target.value)}
                className="w-full p-2 bg-slate-800 text-slate-100 rounded-lg border border-slate-700"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Official Designation:</label>
              <input
                type="text"
                value={responderTitle}
                onChange={e => setResponderTitle(e.target.value)}
                className="w-full p-2 bg-slate-800 text-slate-100 rounded-lg border border-slate-700"
              />
            </div>
          </div>

          {responseType === 'OUTSIDE_MANDATE' && (
            <div>
              <label className="block text-xs font-semibold text-amber-300 mb-1">
                Redirect to Appropriate State Body:
              </label>
              <select
                value={redirectedTo}
                onChange={e => setRedirectedTo(e.target.value)}
                className="w-full p-2 bg-slate-800 text-xs text-slate-100 rounded-lg border border-slate-700"
              >
                <option value="">Select target authority...</option>
                {institutionsList
                  .filter(i => i.id !== selectedInstId)
                  .map(i => (
                    <option key={i.id} value={i.id}>
                      {i.officialName}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !message.trim()}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Publish Official Response
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
