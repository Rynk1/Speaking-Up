import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Megaphone, Share2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { CivicPost, InstitutionResponse } from '../types';
import { api } from '../services/api';
import { CivicPostCard } from './CivicPostCard';
import { OfficialStatementModal } from './OfficialStatementModal';
import { SharePreviewModal } from './SharePreviewModal';
import { AddEvidenceModal } from './AddEvidenceModal';
import { InstitutionResponseModal } from './InstitutionResponseModal';
import { ReportAbuseModal } from './ReportAbuseModal';

interface PostDetailViewProps {
  userRole: 'citizen' | 'institution_rep' | 'journalist' | 'moderator' | 'admin';
  currentUser: any;
  selectedInstitutionId: string;
}

export const PostDetailView: React.FC<PostDetailViewProps> = ({
  userRole,
  currentUser,
  selectedInstitutionId
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [post, setPost] = useState<CivicPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [shareTarget, setShareTarget] = useState<{ post: CivicPost; response?: InstitutionResponse } | null>(null);
  const [evidencePost, setEvidencePost] = useState<CivicPost | null>(null);
  const [responsePost, setResponsePost] = useState<CivicPost | null>(null);
  const [abusePostId, setAbusePostId] = useState<string | null>(null);
  const [selectedStatement, setSelectedStatement] = useState<{ post: CivicPost; response: InstitutionResponse } | null>(null);

  const fetchPost = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await api.getPostById(id);
      if (data) {
        setPost(data);
        setError(null);
      } else {
        setError('Civic report not found or has been removed.');
      }
    } catch (err: any) {
      console.error('Error fetching post detail:', err);
      setError('Unable to load civic report details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPost();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto" />
        <p className="text-slate-400 text-sm">Loading civic report details...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-950/50 border border-red-800 flex items-center justify-center mx-auto text-red-400">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">{error || 'Post not found'}</h2>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          The requested report may have been archived, transferred, or does not exist.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all"
        >
          Return to National Feed
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-in fade-in py-2">
      {/* Top Header / Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span>REPORT ID: #{post.id}</span>
        </div>
      </div>

      {/* Main Dedicated Post Card */}
      <CivicPostCard
        post={post}
        onOpenShare={(p, r) => setShareTarget({ post: p, response: r })}
        onOpenAddEvidence={p => setEvidencePost(p)}
        onOpenReportAbuse={p => setAbusePostId(p)}
        onOpenCluster={cId => navigate(`/clusters/${cId}`)}
        onPostUpdated={fetchPost}
        userRole={userRole as any}
        onOpenInstitutionResponse={p => setResponsePost(p)}
        onViewOfficialResponse={(p, r) => setSelectedStatement({ post: p, response: r })}
        onViewResponseFeedPost={(p, r) => {
          navigate('/', { state: { focusedResponseId: r.id, tab: 'official_responded' } });
        }}
      />

      {/* Modals */}
      <SharePreviewModal
        post={shareTarget?.post || null}
        response={shareTarget?.response || null}
        isOpen={!!shareTarget}
        onClose={() => setShareTarget(null)}
      />

      <AddEvidenceModal
        post={evidencePost}
        isOpen={!!evidencePost}
        onClose={() => setEvidencePost(null)}
        onEvidenceAdded={fetchPost}
      />

      <InstitutionResponseModal
        post={responsePost}
        isOpen={!!responsePost}
        onClose={() => setResponsePost(null)}
        onResponseSubmitted={fetchPost}
        institutionsList={[]}
        currentInstitutionId={selectedInstitutionId}
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
          onPostUpdated={fetchPost}
          onOpenAnotherResponse={newResp => setSelectedStatement({ post: selectedStatement.post, response: newResp })}
          onOpenShare={(p, r) => setShareTarget({ post: p, response: r })}
          onViewAsFeedPost={(p, r) => {
            navigate('/', { state: { focusedResponseId: r.id, tab: 'official_responded' } });
          }}
        />
      )}
    </div>
  );
};
