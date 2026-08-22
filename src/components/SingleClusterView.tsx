import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Flame, MapPin, Loader2, AlertTriangle, Building2, Layers } from 'lucide-react';
import { IssueCluster, CivicPost, InstitutionResponse } from '../types';
import { api } from '../services/api';
import { CivicPostCard } from './CivicPostCard';
import { OfficialStatementModal } from './OfficialStatementModal';
import { SharePreviewModal } from './SharePreviewModal';
import { AddEvidenceModal } from './AddEvidenceModal';
import { InstitutionResponseModal } from './InstitutionResponseModal';
import { ReportAbuseModal } from './ReportAbuseModal';

interface SingleClusterViewProps {
  userRole: 'citizen' | 'institution_rep' | 'journalist' | 'moderator' | 'admin';
  currentUser: any;
  selectedInstitutionId: string;
}

export const SingleClusterView: React.FC<SingleClusterViewProps> = ({
  userRole,
  currentUser,
  selectedInstitutionId
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [cluster, setCluster] = useState<IssueCluster | null>(null);
  const [clusterPosts, setClusterPosts] = useState<CivicPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [sharePost, setSharePost] = useState<CivicPost | null>(null);
  const [evidencePost, setEvidencePost] = useState<CivicPost | null>(null);
  const [responsePost, setResponsePost] = useState<CivicPost | null>(null);
  const [abusePostId, setAbusePostId] = useState<string | null>(null);
  const [selectedStatement, setSelectedStatement] = useState<{ post: CivicPost; response: InstitutionResponse } | null>(null);

  const loadClusterData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [allClusters, allPosts] = await Promise.all([
        api.getClusters(),
        api.getPosts()
      ]);

      const found = allClusters.find(c => c.id === id);
      if (found) {
        setCluster(found);
        const related = allPosts.filter(p => found.memberPostIds?.includes(p.id) || p.id === found.primaryPostId);
        setClusterPosts(related.length > 0 ? related : allPosts.slice(0, 3));
        setError(null);
      } else {
        setError('Community issue cluster not found.');
      }
    } catch (err) {
      console.error('Error loading cluster:', err);
      setError('Failed to load community issue cluster.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClusterData();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
        <p className="text-slate-400 text-sm">Loading community cluster details...</p>
      </div>
    );
  }

  if (error || !cluster) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-950/50 border border-amber-800 flex items-center justify-center mx-auto text-amber-400">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">{error || 'Cluster not found'}</h2>
        <button
          onClick={() => navigate('/clusters')}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold rounded-xl transition-all"
        >
          View All Clusters
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in py-2">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/clusters')}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> All Clusters
        </button>

        <span className="px-2.5 py-1 bg-amber-950/80 text-amber-300 border border-amber-800 rounded-lg text-xs font-mono font-bold uppercase">
          Cluster #{cluster.id}
        </span>
      </div>

      {/* Cluster Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
            <Flame className="w-4 h-4" />
            <span>{cluster.category}</span>
          </div>

          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 uppercase">
            {cluster.status.replace(/_/g, ' ')}
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-snug">
          {cluster.title}
        </h1>

        <p className="text-sm text-slate-300 leading-relaxed">
          {cluster.summary}
        </p>

        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-slate-300">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span>{cluster.district} ({cluster.region})</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-emerald-400 font-bold">{cluster.totalConfirmations} Citizen Confirmations</span>
            <span>•</span>
            <span className="text-slate-300 font-medium">Tagging: {cluster.primaryInstitutions.join(', ')}</span>
          </div>
        </div>
      </div>

      {/* Related Civic Reports Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm font-bold text-slate-300">
          <span className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            Cluster Report Stream ({clusterPosts.length})
          </span>
        </div>

        {clusterPosts.map((post, idx) => (
          <CivicPostCard
            key={post.id ? `${post.id}-${idx}` : `cpost-${idx}`}
            post={post}
            onOpenShare={p => setSharePost(p)}
            onOpenAddEvidence={p => setEvidencePost(p)}
            onOpenReportAbuse={p => setAbusePostId(p)}
            onOpenCluster={cId => navigate(`/clusters/${cId}`)}
            onPostUpdated={loadClusterData}
            userRole={userRole as any}
            onOpenInstitutionResponse={p => setResponsePost(p)}
            onViewOfficialResponse={(p, r) => setSelectedStatement({ post: p, response: r })}
            onViewResponseFeedPost={(p, r) => setSelectedStatement({ post: p, response: r })}
          />
        ))}
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
        onEvidenceAdded={loadClusterData}
      />

      <InstitutionResponseModal
        post={responsePost}
        isOpen={!!responsePost}
        onClose={() => setResponsePost(null)}
        onResponseSubmitted={loadClusterData}
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
          onPostUpdated={loadClusterData}
          onOpenAnotherResponse={newResp => setSelectedStatement({ post: selectedStatement.post, response: newResp })}
          onViewAsFeedPost={() => {}}
        />
      )}
    </div>
  );
};
