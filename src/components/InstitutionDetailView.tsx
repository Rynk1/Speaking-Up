import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, BadgeCheck, Phone, Mail, Globe, MapPin, Loader2, AlertTriangle, MessageSquare, Plus } from 'lucide-react';
import { Institution, CivicPost, InstitutionResponse } from '../types';
import { api } from '../services/api';
import { CivicPostCard } from './CivicPostCard';
import { OfficialStatementModal } from './OfficialStatementModal';
import { SharePreviewModal } from './SharePreviewModal';
import { AddEvidenceModal } from './AddEvidenceModal';
import { InstitutionResponseModal } from './InstitutionResponseModal';
import { ReportAbuseModal } from './ReportAbuseModal';

interface InstitutionDetailViewProps {
  userRole: 'citizen' | 'institution_rep' | 'journalist' | 'moderator' | 'admin';
  currentUser: any;
  selectedInstitutionId: string;
  setSelectedInstitutionId: (id: string) => void;
  onOpenSpeakUp: () => void;
}

export const InstitutionDetailView: React.FC<InstitutionDetailViewProps> = ({
  userRole,
  currentUser,
  selectedInstitutionId,
  setSelectedInstitutionId,
  onOpenSpeakUp
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [institution, setInstitution] = useState<Institution | null>(null);
  const [taggedPosts, setTaggedPosts] = useState<CivicPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [sharePost, setSharePost] = useState<CivicPost | null>(null);
  const [evidencePost, setEvidencePost] = useState<CivicPost | null>(null);
  const [responsePost, setResponsePost] = useState<CivicPost | null>(null);
  const [abusePostId, setAbusePostId] = useState<string | null>(null);
  const [selectedStatement, setSelectedStatement] = useState<{ post: CivicPost; response: InstitutionResponse } | null>(null);

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [insts, posts] = await Promise.all([
        api.getInstitutions(),
        api.getPosts()
      ]);

      const found = insts.find(i => i.id === id || i.shortName.toLowerCase() === id?.toLowerCase());
      if (found) {
        setInstitution(found);
        setSelectedInstitutionId(found.id);
        const related = posts.filter(p =>
          p.institutionTags.some(t => t.institutionId === found.id || (t.shortName && t.shortName.toLowerCase() === found.shortName.toLowerCase()))
        );
        setTaggedPosts(related);
        setError(null);
      } else {
        setError('State institution public portal not found.');
      }
    } catch (err) {
      console.error('Error loading institution detail:', err);
      setError('Unable to load institution portal.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto" />
        <p className="text-slate-400 text-sm">Loading official institution portal...</p>
      </div>
    );
  }

  if (error || !institution) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">{error || 'Portal not found'}</h2>
        <button
          onClick={() => navigate('/institutions')}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all"
        >
          Return to Directory
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in py-2">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/institutions')}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Directory
        </button>

        {userRole === 'institution_rep' && (
          <button
            onClick={() => navigate('/portal')}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <Building2 className="w-3.5 h-3.5" /> Rep Dashboard
          </button>
        )}
      </div>

      {/* Institution Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-0.5 shadow-lg flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-emerald-400 font-extrabold text-lg">
                {institution.acronym || institution.shortName.charAt(0)}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  {institution.officialName || institution.shortName}
                </h1>
                {institution.verified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-extrabold">
                    <BadgeCheck className="w-3 h-3 text-emerald-400" /> VERIFIED STATE DESK
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                <span>{institution.category}</span>
                <span>•</span>
                <span className="text-emerald-400 font-medium">Alert Channel: {institution.alertMethod.replace('_', ' ')}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onOpenSpeakUp}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" /> Tag @{institution.shortName} in New Issue
          </button>
        </div>

        {/* Contact Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">{institution.officialEmail || 'desk@gov.gh'}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{institution.emergencyHotline || institution.whatsappNumber || '+233 30 200 0000'}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>National Jurisdiction (All 16 Regions)</span>
          </div>
        </div>
      </div>

      {/* Tagged Reports Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm font-bold text-slate-300">
          <span>Public Reports Tagging @{institution.shortName} ({taggedPosts.length})</span>
        </div>

        {taggedPosts.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
            <MessageSquare className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="text-slate-300 text-sm font-bold">No public reports tagged for this institution yet.</p>
            <p className="text-slate-400 text-xs">Citizens can tag @{institution.shortName} to direct civic observations here.</p>
          </div>
        ) : (
          taggedPosts.map((post, idx) => (
            <CivicPostCard
              key={post.id ? `${post.id}-${idx}` : `instpost-${idx}`}
              post={post}
              onOpenShare={p => setSharePost(p)}
              onOpenAddEvidence={p => setEvidencePost(p)}
              onOpenReportAbuse={p => setAbusePostId(p)}
              onOpenCluster={cId => navigate(`/clusters/${cId}`)}
              onPostUpdated={loadData}
              userRole={userRole}
              onOpenInstitutionResponse={p => setResponsePost(p)}
              onViewOfficialResponse={(p, r) => setSelectedStatement({ post: p, response: r })}
              onViewResponseFeedPost={(p, r) => setSelectedStatement({ post: p, response: r })}
            />
          ))
        )}
      </div>

      {/* Modals */}
      <SharePreviewModal
        post={sharePost}
        isOpen={!!sharePost}
        onClose={() => setSharePost(null)}
      />

      <AddEvidenceModal
        post={evidencePost}
        isOpen={!!evidencePost}
        onClose={() => setEvidencePost(null)}
        onEvidenceAdded={loadData}
      />

      <InstitutionResponseModal
        post={responsePost}
        isOpen={!!responsePost}
        onClose={() => setResponsePost(null)}
        onResponseSubmitted={loadData}
        institutionsList={[]}
        currentInstitutionId={institution.id}
      />

      <ReportAbuseModal
        postId={abusePostId}
        isOpen={!!abusePostId}
        onClose={() => setAbusePostId(null)}
      />

      {selectedStatement && (
        <OfficialStatementModal
          post={selectedStatement.post}
          response={selectedStatement.response}
          currentUser={currentUser}
          onClose={() => setSelectedStatement(null)}
          onPostUpdated={loadData}
          onOpenAnotherResponse={newResp => setSelectedStatement({ post: selectedStatement.post, response: newResp })}
          onViewAsFeedPost={() => {}}
        />
      )}
    </div>
  );
};
