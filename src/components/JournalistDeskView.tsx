import React, { useState } from 'react';
import {
  Newspaper,
  Flame,
  Download,
  Share2,
  CheckCircle2,
  Clock,
  MapPin,
  Building2,
  ExternalLink,
  Copy,
  Check,
  Search,
  Sparkles
} from 'lucide-react';
import { CivicPost, IssueCluster } from '../types';

interface JournalistDeskViewProps {
  posts: CivicPost[];
  clusters: IssueCluster[];
  onSelectPost: (post: CivicPost) => void;
  onOpenCluster: (clusterId: string) => void;
}

export const JournalistDeskView: React.FC<JournalistDeskViewProps> = ({
  posts,
  clusters,
  onSelectPost,
  onOpenCluster
}) => {
  const [filter, setFilter] = useState<'breaking' | 'high_velocity' | 'unanswered'>('breaking');
  const [copiedPackId, setCopiedPackId] = useState<string | null>(null);

  const breakingPosts = [...posts].sort((a, b) => b.engagement.confirmations - a.engagement.confirmations);
  const highVelocityPosts = posts.filter(p => p.urgency === 'CRITICAL' || p.urgency === 'HIGH');
  const unansweredMajorPosts = posts.filter(p => !p.officialResponses || p.officialResponses.length === 0);

  const displayed =
    filter === 'breaking' ? breakingPosts : filter === 'high_velocity' ? highVelocityPosts : unansweredMajorPosts;

  const handleCopyEvidenceBriefing = (post: CivicPost) => {
    const pack = `📰 GHANA CIVIC NETWORK - JOURNALIST EVIDENCE BRIEFING
======================================================
STORY LEAD: ${post.title}
LOCATION: ${post.location.district} (${post.location.region} Region) ${post.location.landmark ? `[Landmark: ${post.location.landmark}]` : ''}
TIMESTAMP: ${new Date(post.createdAt).toLocaleString()}

CITIZEN OBSERVATION:
"${post.content}"
Author: ${post.authorName} (@${post.authorHandle})

COMMUNITY SIGNALS:
- Independent Confirmations: ${post.engagement.confirmations} local residents
- Urgency: ${post.urgency} (${post.category})
- Tagged State Institutions: ${post.institutionTags.map(t => t.shortName).join(', ')}

OFFICIAL RESPONSE STATUS:
${post.officialResponses?.length ? post.officialResponses.map(r => `[${r.institutionName}]: "${r.message}" (${r.responderName}, ${r.responderTitle})`).join('\n') : 'NO OFFICIAL RESPONSE RECORDED YET'}

DIRECT VERIFICATION LINK:
${window.location.origin}/app/post/${post.id}
======================================================`;

    navigator.clipboard.writeText(pack);
    setCopiedPackId(post.id);
    setTimeout(() => setCopiedPackId(null), 2500);
  };

  return (
    <div className="space-y-4 animate-in fade-in">
      {/* Media Desk Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <Newspaper className="w-4 h-4" />
            </div>
            <h2 className="font-extrabold text-lg sm:text-xl text-white tracking-tight">
              Journalist & Media Investigation Desk
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Real-time public interest leads, ground verification evidence packages, and official response accountability tracking for Ghanaian newsrooms.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1 bg-sky-950 text-sky-300 border border-sky-800 rounded-lg font-bold">
            Verified Media Tools
          </span>
        </div>
      </div>

      {/* Cluster Highlights for Journalists */}
      {clusters.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            Emerging Investigative Clusters:
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {clusters.map((c, idx) => (
              <div
                key={c.id ? `${c.id}-${idx}` : `j-cluster-${idx}`}
                onClick={() => onOpenCluster(c.id)}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-3.5 rounded-xl cursor-pointer transition-all space-y-2 group shadow-sm"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-amber-400">{c.category}</span>
                  <span className="text-slate-400">{c.postCount} reports</span>
                </div>
                <h4 className="font-bold text-xs text-white group-hover:text-amber-300 transition-colors line-clamp-2">
                  {c.title}
                </h4>
                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
                  <span>{c.district}</span>
                  <span className="text-emerald-400 font-semibold">{c.totalConfirmations} confirmed</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs">
        <button
          onClick={() => setFilter('breaking')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
            filter === 'breaking' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          🔥 Highest Community Confirmation ({breakingPosts.length})
        </button>

        <button
          onClick={() => setFilter('high_velocity')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
            filter === 'high_velocity' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          🚨 Urgent Public Safety ({highVelocityPosts.length})
        </button>

        <button
          onClick={() => setFilter('unanswered')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
            filter === 'unanswered' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          ⏳ Unanswered by State Bodies ({unansweredMajorPosts.length})
        </button>
      </div>

      {/* Stories List */}
      <div className="space-y-3">
        {displayed.map((post, idx) => (
          <div
            key={post.id ? `${post.id}-${idx}` : `j-post-${idx}`}
            className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 hover:border-slate-700 transition-all shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="font-semibold text-sky-400">{post.category}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-300 font-medium">
                    {post.location.district} ({post.location.region})
                  </span>
                </div>
                <h3 className="font-bold text-base text-white">{post.title}</h3>
              </div>

              <span className="text-[11px] text-slate-400">
                {new Date(post.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800">
              "{post.content}"
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-3 text-slate-400">
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {post.engagement.confirmations} Independent Confirmations
                </span>
                <span>•</span>
                <span>
                  Tagged: <strong className="text-slate-200">{post.institutionTags.map(t => t.shortName).join(', ')}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyEvidenceBriefing(post)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
                  title="Copy formatted news story briefing package"
                >
                  {copiedPackId === post.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedPackId === post.id ? 'Story Pack Copied!' : 'Copy Story Evidence Pack'}
                </button>

                <button
                  onClick={() => onSelectPost(post)}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl flex items-center gap-1"
                >
                  Inspect Full Post
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
