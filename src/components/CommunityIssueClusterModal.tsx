import React, { useState, useEffect } from 'react';
import {
  Flame,
  X,
  MapPin,
  CheckCircle2,
  Users,
  Building2,
  Share2,
  Calendar,
  AlertTriangle,
  Camera,
  Layers,
  ArrowRight,
  ShieldCheck,
  FileText,
  Copy,
  Check,
  Download,
  Search,
  Eye,
  ExternalLink
} from 'lucide-react';
import { IssueCluster, CivicPost } from '../types';
import { api } from '../services/api';

interface CommunityIssueClusterModalProps {
  clusterId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectPost: (post: CivicPost) => void;
}

export const CommunityIssueClusterModal: React.FC<CommunityIssueClusterModalProps> = ({
  clusterId,
  isOpen,
  onClose,
  onSelectPost
}) => {
  const [clusterData, setClusterData] = useState<{ cluster: IssueCluster; posts: CivicPost[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedDossier, setCopiedDossier] = useState(false);
  const [postSearch, setPostSearch] = useState('');
  const [showDossierModal, setShowDossierModal] = useState(false);

  useEffect(() => {
    if (clusterId && isOpen) {
      setLoading(true);
      api
        .getClusterById(clusterId)
        .then(data => {
          setClusterData(data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching cluster:', err);
          setLoading(false);
        });
    }
  }, [clusterId, isOpen]);

  if (!isOpen || !clusterId) return null;

  const cluster = clusterData?.cluster;
  const posts = clusterData?.posts || [];

  const filteredPosts = posts.filter(p => {
    if (!postSearch.trim()) return true;
    const q = postSearch.toLowerCase();
    return p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q) || p.authorName.toLowerCase().includes(q);
  });

  const generateClusterDossierText = () => {
    if (!cluster) return '';

    const totalReportsCount = cluster.postCount || cluster.postsCount || cluster.postIds?.length || posts.length;
    const taggedBodies = (cluster.primaryInstitutions && cluster.primaryInstitutions.length > 0)
      ? cluster.primaryInstitutions.join(', ')
      : (cluster.taggedInstitutionIds && cluster.taggedInstitutionIds.length > 0)
        ? cluster.taggedInstitutionIds.join(', ')
        : 'None tagged';

    const postsListText = posts.length > 0
      ? posts.map((p, idx) => `
[REPORT #${idx + 1}] ID: ${p.id}
Author: ${p.authorName} (@${p.authorHandle})
Date: ${new Date(p.createdAt).toLocaleString()}
Confirmations: ${p.engagement?.confirmations || p.confirmationsCount || 0} residents
Content:
"${p.content}"
Official Response: ${p.officialResponses && p.officialResponses.length > 0 ? p.officialResponses.map(r => `[${r.institutionName}]: "${r.message}"`).join(' | ') : 'None yet'}
Verification Link: ${window.location.origin}/#post-${p.id}
----------------------------------------------------------------------`).join('\n')
      : 'No individual reports retrieved.';

    return `======================================================================
📰 GHANA CIVIC NETWORK - INVESTIGATIVE CLUSTER DOSSIER
======================================================================
CLUSTER TITLE : ${cluster.title.toUpperCase()}
CLUSTER ID    : ${cluster.id}
CATEGORY      : ${cluster.category}
LOCATION      : ${cluster.district} (${cluster.region} Region)
STATUS        : ${cluster.status}
TREND SCORE   : ${cluster.trendScore || 0} / 100

SUMMARY:
"${cluster.summary}"

COMMUNITY IMPACT:
- Total Independent Confirmations : ${cluster.totalConfirmations || cluster.confirmationCount || 0} local residents
- Total Linked Citizen Reports   : ${totalReportsCount} reports
- Tagged State Bodies            : ${taggedBodies}

======================================================================
LINKED CITIZEN REPORTS & GROUND WITNESS TIMELINE
======================================================================
${postsListText}

======================================================================
DEEP LINK: ${window.location.origin}/#cluster-${cluster.id}
======================================================================`;
  };

  const handleCopyDossier = () => {
    const dossier = generateClusterDossierText();
    navigator.clipboard.writeText(dossier);
    setCopiedDossier(true);
    setTimeout(() => setCopiedDossier(false), 2500);
  };

  const handleDownloadDossier = () => {
    const dossier = generateClusterDossierText();
    const blob = new Blob([dossier], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cluster-dossier-${cluster?.id || 'export'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl text-slate-100 shadow-2xl overflow-hidden my-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/80 uppercase">
                  Community Issue Cluster
                </span>
                <span className="text-xs text-slate-400">Aggregated Community Signal</span>
              </div>
              <h2 className="font-extrabold text-base sm:text-lg text-white leading-tight mt-0.5">
                {cluster?.title || 'Loading issue details...'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDossierModal(true)}
              className="px-3 py-1.5 bg-sky-950 hover:bg-sky-900 text-sky-300 border border-sky-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors hidden sm:flex"
            >
              <FileText className="w-3.5 h-3.5" /> Export Dossier
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading || !cluster ? (
          <div className="p-12 text-center text-slate-400 text-sm animate-pulse space-y-2">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p>Loading aggregate cluster details and contributing reports...</p>
          </div>
        ) : (
          <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
            {/* Top Summary Card */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
              <p className="text-sm text-slate-200 leading-relaxed">{cluster.summary}</p>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Confirmations</div>
                  <div className="text-lg font-black text-emerald-400 mt-0.5">{cluster.totalConfirmations}</div>
                  <div className="text-[10px] text-slate-500">citizens seeing this</div>
                </div>

                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Citizen Reports</div>
                  <div className="text-lg font-black text-white mt-0.5">{cluster.postCount}</div>
                  <div className="text-[10px] text-slate-500">independent posts</div>
                </div>

                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Primary Location</div>
                  <div className="text-sm font-bold text-slate-200 truncate mt-0.5">{cluster.district}</div>
                  <div className="text-[10px] text-slate-500">{cluster.region} Region</div>
                </div>

                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Cluster Status</div>
                  <div className="text-xs font-bold text-amber-400 uppercase mt-1">
                    {cluster.status.replace(/_/g, ' ')}
                  </div>
                  <div className="text-[10px] text-slate-500">Live monitoring</div>
                </div>
              </div>
            </div>

            {/* Tagged Institutions */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                State Institutions Tagged in this Cluster:
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {(cluster.primaryInstitutions || []).map((instName, idx) => (
                  <div
                    key={`${instName}-${idx}`}
                    className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 flex items-center gap-2"
                  >
                    <span className="font-semibold">{instName}</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  </div>
                ))}
              </div>
            </div>

            {/* Search & Filter Contributing Reports */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-sky-400" />
                  Contributing Citizen Reports ({filteredPosts.length}):
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filter reports..."
                      value={postSearch}
                      onChange={e => setPostSearch(e.target.value)}
                      className="pl-8 pr-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <button
                    onClick={handleCopyDossier}
                    className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow"
                  >
                    {copiedDossier ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedDossier ? 'Copied' : 'Copy Dossier'}
                  </button>
                </div>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {filteredPosts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl">
                    No reports match filter criteria.
                  </div>
                ) : (
                  filteredPosts.map((post, idx) => (
                    <div
                      key={post.id ? `${post.id}-${idx}` : `post-${idx}`}
                      onClick={() => {
                        onSelectPost(post);
                        onClose();
                      }}
                      className="p-3.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 rounded-xl cursor-pointer transition-colors space-y-2 group"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white group-hover:text-amber-300 transition-colors">{post.title}</span>
                          <span className="text-slate-400">by {post.authorName}</span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 line-clamp-2">{post.content}</p>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> {post.engagement?.confirmations || post.confirmationsCount || 0} confirmed
                        </span>
                        <span className="flex items-center gap-1 text-sky-400 group-hover:underline font-semibold">
                          Inspect report <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CLUSTER DOSSIER EXPORT MODAL */}
      {showDossierModal && cluster && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-400" />
                <h3 className="font-extrabold text-sm text-white">Investigative Cluster Dossier Export</h3>
              </div>
              <button onClick={() => setShowDossierModal(false)} className="p-1 text-slate-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 font-mono text-xs bg-slate-950/90 text-sky-200 whitespace-pre-wrap leading-relaxed select-all">
              {generateClusterDossierText()}
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2">
              <button
                onClick={handleDownloadDossier}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" /> Download .TXT Dossier
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDossierModal(false)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Close
                </button>
                <button
                  onClick={handleCopyDossier}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md"
                >
                  {copiedDossier ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedDossier ? 'Copied to Clipboard!' : 'Copy Dossier'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
