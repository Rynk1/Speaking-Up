import React, { useState } from 'react';
import { Building2, X, Check, ShieldCheck, Loader2, Send, Clock, Plus, Trash2, FileText, Phone, ChevronDown, ChevronUp } from 'lucide-react';
import { CivicPost, Institution, ResponseTimelineStep } from '../types';
import { api } from '../services/api';

interface InstitutionResponseModalProps {
  post: CivicPost | null;
  isOpen: boolean;
  onClose: () => void;
  onResponseSubmitted: () => void;
  institutionsList: Institution[];
  currentInstitutionId?: string;
  existingResponse?: any;
}

export const InstitutionResponseModal: React.FC<InstitutionResponseModalProps> = ({
  post,
  isOpen,
  onClose,
  onResponseSubmitted,
  institutionsList,
  currentInstitutionId,
  existingResponse
}) => {
  const [selectedInstId, setSelectedInstId] = useState(
    currentInstitutionId || post?.institutionTags[0]?.institutionId || 'ghana-police-service'
  );
  const [responseType, setResponseType] = useState<any>(existingResponse?.responseType || 'WE_ARE_AWARE');
  const [statementTitle, setStatementTitle] = useState(existingResponse?.statementTitle || '');
  const [referenceNumber, setReferenceNumber] = useState(existingResponse?.referenceNumber || `REF-${Date.now().toString().slice(-6)}`);
  const [resolutionStatus, setResolutionStatus] = useState<'IN_PROGRESS' | 'RESOLVED' | 'UNDER_REVIEW'>(existingResponse?.resolutionStatus || 'IN_PROGRESS');
  const [message, setMessage] = useState(existingResponse?.message || '');
  const [fullStatement, setFullStatement] = useState(existingResponse?.fullStatement || '');
  const [responderName, setResponderName] = useState(existingResponse?.responderName || 'Official Communications Officer');
  const [responderTitle, setResponderTitle] = useState(existingResponse?.responderTitle || 'Public Relations Secretariat');
  const [redirectedTo, setRedirectedTo] = useState('');

  // Action Timeline Steps
  const [actionTimeline, setActionTimeline] = useState<ResponseTimelineStep[]>(
    existingResponse?.actionTimeline || [
      { step: 'Incident Awareness Recorded & Logged', status: 'completed', timestamp: 'Initial Log' },
      { step: 'Rapid Technical Assessment Team Dispatched', status: 'in_progress', timestamp: 'In Progress' }
    ]
  );

  // Documents & Hotlines
  const [documents, setDocuments] = useState<{ title: string; url: string; fileType: string; size?: string }[]>(
    existingResponse?.documents || []
  );
  const [hotlines, setHotlines] = useState<string[]>(
    existingResponse?.hotlines || ['0302-123456 (24/7 Rapid Response Desk)']
  );

  const [showAdvancedTimeline, setShowAdvancedTimeline] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !post) return null;

  // Timeline Step Handlers
  const handleAddTimelineStep = () => {
    setActionTimeline(prev => [
      ...prev,
      { step: 'New Operational Action', status: 'in_progress', timestamp: 'Today' }
    ]);
  };

  const handleUpdateTimelineStep = (index: number, field: keyof ResponseTimelineStep, value: string) => {
    setActionTimeline(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveTimelineStep = (index: number) => {
    setActionTimeline(prev => prev.filter((_, i) => i !== index));
  };

  // Document Handlers
  const handleAddDocument = () => {
    setDocuments(prev => [...prev, { title: 'Official Press Release / Advisory PDF', url: '#', fileType: 'pdf' }]);
  };

  const handleRemoveDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  // Hotline Handlers
  const handleAddHotline = () => {
    setHotlines(prev => [...prev, '0244-000000 (Duty Hotline)']);
  };

  const handleRemoveHotline = (index: number) => {
    setHotlines(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        institutionId: selectedInstId,
        responseType,
        statementTitle: statementTitle.trim() || undefined,
        referenceNumber: referenceNumber.trim() || undefined,
        resolutionStatus,
        message: message.trim(),
        fullStatement: fullStatement.trim() || message.trim(),
        responderName,
        responderTitle,
        actionTimeline,
        documents,
        hotlines,
        redirectedToInstitutionId: redirectedTo || undefined
      };

      if (existingResponse?.id) {
        await api.updateInstitutionResponse(existingResponse.id, payload);
      } else {
        await api.submitInstitutionResponse(post.id, payload);
      }

      setIsSubmitting(false);
      onResponseSubmitted();
      onClose();
    } catch (err) {
      console.error('Failed to submit institutional response:', err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl text-slate-100 shadow-2xl overflow-hidden my-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-white flex items-center gap-1.5">
                {existingResponse ? 'Update Official Communiqué & Action Timeline' : 'Publish Official Communiqué & Action Timeline'}
                <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800/60 font-semibold">
                  Verified Authority
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">Manage state response, reference code, live action timeline steps & direct hotlines</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          <div className="p-2.5 bg-slate-800/60 rounded-xl text-xs border border-slate-700">
            <span className="text-slate-400">Responding to Citizen Observation: </span>
            <strong className="text-slate-200">"{post.title}"</strong>
          </div>

          {/* Responding Institution & Response Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Responding Institution:
              </label>
              <select
                value={selectedInstId}
                onChange={e => setSelectedInstId(e.target.value)}
                className="w-full p-2 bg-slate-800 text-xs text-slate-100 rounded-lg border border-slate-700 font-semibold"
              >
                {institutionsList.map((inst, idx) => (
                  <option key={inst.id ? `${inst.id}-${idx}` : `inst-opt-${idx}`} value={inst.id}>
                    {inst.officialName} ({inst.acronym})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Official Response Type:
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
          </div>

          {/* Statement Title, Ref Code & Resolution Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="sm:col-span-2">
              <label className="block text-[11px] text-slate-400 mb-1">Communiqué / Statement Title:</label>
              <input
                type="text"
                value={statementTitle}
                onChange={e => setStatementTitle(e.target.value)}
                placeholder="e.g. Official Public Notice regarding Kumasi Highway Blockade"
                className="w-full p-2 bg-slate-800 text-slate-100 rounded-lg border border-slate-700"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Reference Number:</label>
              <input
                type="text"
                value={referenceNumber}
                onChange={e => setReferenceNumber(e.target.value)}
                className="w-full p-2 bg-slate-800 text-slate-100 font-mono text-[11px] rounded-lg border border-slate-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Resolution Status:</label>
              <select
                value={resolutionStatus}
                onChange={e => setResolutionStatus(e.target.value as any)}
                className="w-full p-2 bg-slate-800 text-slate-100 rounded-lg border border-slate-700 font-semibold"
              >
                <option value="IN_PROGRESS">IN_PROGRESS — Active Field Work</option>
                <option value="RESOLVED">RESOLVED — Fully Addressed</option>
                <option value="UNDER_REVIEW">UNDER_REVIEW — Under Assessment</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Spokesperson Name & Designation:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={responderName}
                  onChange={e => setResponderName(e.target.value)}
                  placeholder="Spokesperson Name"
                  className="w-1/2 p-2 bg-slate-800 text-slate-100 rounded-lg border border-slate-700 text-xs"
                />
                <input
                  type="text"
                  value={responderTitle}
                  onChange={e => setResponderTitle(e.target.value)}
                  placeholder="Official Designation"
                  className="w-1/2 p-2 bg-slate-800 text-slate-100 rounded-lg border border-slate-700 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Statement Excerpt & Full Text */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Public Summary / Brief Statement:
            </label>
            <textarea
              rows={2}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Concise summary shown on cards & social share previews..."
              className="w-full p-2.5 bg-slate-800 text-xs text-slate-100 placeholder-slate-500 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Full Statement / Detailed Public Directive (Optional):
            </label>
            <textarea
              rows={3}
              value={fullStatement}
              onChange={e => setFullStatement(e.target.value)}
              placeholder="Complete detailed communique text..."
              className="w-full p-2.5 bg-slate-800 text-xs text-slate-100 placeholder-slate-500 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          {/* ACTION TIMELINE BUILDER */}
          <div className="border border-slate-800 rounded-xl p-3 bg-slate-950/60 space-y-3">
            <button
              type="button"
              onClick={() => setShowAdvancedTimeline(!showAdvancedTimeline)}
              className="w-full flex items-center justify-between text-xs font-bold text-amber-400 hover:underline cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-400" />
                Live Action & Resolution Timeline Builder ({actionTimeline.length} Steps)
              </span>
              {showAdvancedTimeline ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAdvancedTimeline && (
              <div className="space-y-2.5 pt-1">
                {actionTimeline.map((step, idx) => (
                  <div key={`step-edit-${idx}`} className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-400 text-[11px]">Step {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTimelineStep(idx)}
                        className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                        title="Remove step"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={step.step}
                        onChange={e => handleUpdateTimelineStep(idx, 'step', e.target.value)}
                        placeholder="Step Action Title"
                        className="sm:col-span-2 p-1.5 bg-slate-800 text-white rounded border border-slate-700 text-xs"
                      />
                      <select
                        value={step.status}
                        onChange={e => handleUpdateTimelineStep(idx, 'status', e.target.value)}
                        className="p-1.5 bg-slate-800 text-white rounded border border-slate-700 text-xs"
                      >
                        <option value="completed">Completed (✓)</option>
                        <option value="in_progress">In Progress (⏱)</option>
                        <option value="pending">Pending (⏳)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={step.timestamp || ''}
                        onChange={e => handleUpdateTimelineStep(idx, 'timestamp', e.target.value)}
                        placeholder="Timestamp (e.g. 10:30 AM)"
                        className="p-1.5 bg-slate-800 text-slate-300 rounded border border-slate-700 text-xs font-mono"
                      />
                      <input
                        type="text"
                        value={step.description || ''}
                        onChange={e => handleUpdateTimelineStep(idx, 'description', e.target.value)}
                        placeholder="Details (Optional description)"
                        className="p-1.5 bg-slate-800 text-slate-300 rounded border border-slate-700 text-xs"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddTimelineStep}
                  className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold rounded-lg border border-slate-700 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Timeline Step
                </button>
              </div>
            )}
          </div>

          {/* HOTLINES & DIRECTIVES BUILDER */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Hotlines */}
            <div className="border border-slate-800 rounded-xl p-3 bg-slate-950/60 space-y-2">
              <div className="flex items-center justify-between font-bold text-slate-300 text-[11px]">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" /> Agency Emergency Hotlines
                </span>
                <button
                  type="button"
                  onClick={handleAddHotline}
                  className="text-amber-400 hover:underline cursor-pointer text-[10px]"
                >
                  + Add Hotline
                </button>
              </div>
              {hotlines.map((line, idx) => (
                <div key={`line-edit-${idx}`} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={line}
                    onChange={e => {
                      const val = e.target.value;
                      setHotlines(prev => prev.map((l, i) => (i === idx ? val : l)));
                    }}
                    className="flex-1 p-1.5 bg-slate-800 text-white rounded border border-slate-700 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveHotline(idx)}
                    className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Documents */}
            <div className="border border-slate-800 rounded-xl p-3 bg-slate-950/60 space-y-2">
              <div className="flex items-center justify-between font-bold text-slate-300 text-[11px]">
                <span className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-blue-400" /> Attached Documents / Directives
                </span>
                <button
                  type="button"
                  onClick={handleAddDocument}
                  className="text-amber-400 hover:underline cursor-pointer text-[10px]"
                >
                  + Add Document
                </button>
              </div>
              {documents.map((doc, idx) => (
                <div key={`doc-edit-${idx}`} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={doc.title}
                    onChange={e => {
                      const val = e.target.value;
                      setDocuments(prev => prev.map((d, i) => (i === idx ? { ...d, title: val } : d)));
                    }}
                    placeholder="Document Title"
                    className="flex-1 p-1.5 bg-slate-800 text-white rounded border border-slate-700 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveDocument(idx)}
                    className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !message.trim()}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {existingResponse ? 'Save Updated Communiqué & Timeline' : 'Publish Official Communiqué & Timeline'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
