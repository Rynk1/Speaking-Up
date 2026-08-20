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
  ShieldCheck
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-3xl text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden my-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/80 uppercase">
                  Community Issue Cluster
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">Aggregated Community Signal</span>
              </div>
              <h2 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white leading-tight mt-0.5">
                {cluster?.title || 'Loading issue details...'}
              </h2>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading || !cluster ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm animate-pulse">
            Loading aggregate cluster data and community timeline...
          </div>
        ) : (
          <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
            {/* Top Summary Card */}
            <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
              <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">{cluster.summary}</p>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                <div className="bg-white dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Total Confirmations</div>
                  <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{cluster.totalConfirmations}</div>
                  <div className="text-[10px] text-slate-500">citizens seeing this</div>
                </div>

                <div className="bg-white dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Citizen Reports</div>
                  <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{cluster.postCount}</div>
                  <div className="text-[10px] text-slate-500">independent posts</div>
                </div>

                <div className="bg-white dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Primary Location</div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">{cluster.district}</div>
                  <div className="text-[10px] text-slate-500">{cluster.region} Region</div>
                </div>

                <div className="bg-white dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Cluster Status</div>
                  <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase mt-1">
                    {cluster.status.replace(/_/g, ' ')}
                  </div>
                  <div className="text-[10px] text-slate-500">Live monitoring</div>
                </div>
              </div>
            </div>

            {/* Tagged Institutions */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                State Institutions Tagged in this Cluster:
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {(cluster.primaryInstitutions || []).map((instName, idx) => (
                  <div
                    key={`${instName}-${idx}`}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2"
                  >
                    <span className="font-semibold">{instName}</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline of Contributing Citizen Observations */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  Contributing Citizen Reports ({posts.length}):
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Ordered by impact & time</span>
              </div>

              <div className="space-y-2.5">
                {posts.map((post, idx) => (
                  <div
                    key={post.id ? `${post.id}-${idx}` : `post-${idx}`}
                    onClick={() => {
                      onSelectPost(post);
                      onClose();
                    }}
                    className="p-3.5 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl cursor-pointer transition-colors space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-200">{post.authorName}</span>
                        <span className="text-slate-500 dark:text-slate-400">@{post.authorHandle}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">{post.content}</p>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-3 h-3" /> {post.engagement.confirmations} confirmed
                      </span>
                      <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400">
                        View post <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
