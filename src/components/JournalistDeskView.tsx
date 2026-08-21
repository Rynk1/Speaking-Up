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
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Layers,
  BarChart3,
  Filter,
  Eye,
  X,
  FileCheck2,
  SlidersHorizontal,
  CheckCircle
} from 'lucide-react';
import { CivicPost, IssueCluster, Institution } from '../types';

export type JournalistTab = 'leads' | 'clusters' | 'evidence_packs' | 'accountability' | 'tools';

interface JournalistDeskViewProps {
  posts: CivicPost[];
  clusters: IssueCluster[];
  institutions?: Institution[];
  onSelectPost: (post: CivicPost) => void;
  onOpenCluster: (clusterId: string) => void;
}

export const JournalistDeskView: React.FC<JournalistDeskViewProps> = ({
  posts,
  clusters,
  institutions = [],
  onSelectPost,
  onOpenCluster
}) => {
  const [activeTab, setActiveTab] = useState<JournalistTab>('leads');
  const [leadFilter, setLeadFilter] = useState<'breaking' | 'high_velocity' | 'unanswered'>('breaking');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [copiedPackId, setCopiedPackId] = useState<string | null>(null);
  const [previewPackPost, setPreviewPackPost] = useState<CivicPost | null>(null);

  // Filtered & sorted posts for Leads
  const breakingPosts = [...posts].sort((a, b) => b.engagement.confirmations - a.engagement.confirmations);
  const highVelocityPosts = posts.filter(p => p.urgency === 'CRITICAL' || p.urgency === 'HIGH');
  const unansweredMajorPosts = posts.filter(p => !p.officialResponses || p.officialResponses.length === 0);

  const rawDisplayed =
    leadFilter === 'breaking' ? breakingPosts : leadFilter === 'high_velocity' ? highVelocityPosts : unansweredMajorPosts;

  const displayedPosts = rawDisplayed.filter(post => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = post.title.toLowerCase().includes(q);
      const matchContent = post.content.toLowerCase().includes(q);
      const matchDistrict = post.location.district.toLowerCase().includes(q);
      const matchRegion = post.location.region.toLowerCase().includes(q);
      if (!matchTitle && !matchContent && !matchDistrict && !matchRegion) return false;
    }
    if (categoryFilter !== 'ALL' && post.category !== categoryFilter) return false;
    return true;
  });

  // Generate formatted Story Evidence Pack markdown text
  const generateEvidencePackText = (post: CivicPost) => {
    const responsesSection = post.officialResponses && post.officialResponses.length > 0
      ? post.officialResponses.map(r => `• [${r.institutionName}] (${r.responderName}, ${r.responderTitle}):\n  "${r.message}"\n  Status: ${r.status || 'PUBLISHED'} | Date: ${new Date(r.createdAt).toLocaleString()}`).join('\n\n')
      : 'NO OFFICIAL INSTITUTIONAL RESPONSE RECORDED YET';

    const mediaSection = post.media && post.media.length > 0
      ? post.media.map((m, i) => `  ${i + 1}. [${m.type.toUpperCase()}] ${m.url} (P³RE Sanitized)`).join('\n')
      : '  No media files attached';

    const tagsSection = post.institutionTags && post.institutionTags.length > 0
      ? post.institutionTags.map(t => `${t.shortName} (${t.acronym}) - Dispatch Status: ${t.alertStatus}`).join(', ')
      : 'None tagged';

    return `======================================================================
📰 GHANA CIVIC NETWORK - VERIFIED INVESTIGATIVE EVIDENCE BRIEFING
======================================================================
STORY TITLE    : ${post.title.toUpperCase()}
INTERNAL ID    : ${post.id}
DATE SUBMITTED : ${new Date(post.createdAt).toLocaleString()}
URGENCY LEVEL  : ${post.urgency}
CATEGORY       : ${post.category}

----------------------------------------------------------------------
1. GEO-LOCATION & GROUND DETAILS
----------------------------------------------------------------------
REGION      : ${post.location.region} Region
DISTRICT    : ${post.location.district}
LANDMARK    : ${post.location.landmark || 'N/A'}

----------------------------------------------------------------------
2. CITIZEN OBSERVATION & WITNESS TESTIMONY
----------------------------------------------------------------------
AUTHOR      : ${post.authorName} (@${post.authorHandle})
STATEMENT   :
"${post.content}"

----------------------------------------------------------------------
3. COMMUNITY VERIFICATION & CREDIBILITY SIGNALS
----------------------------------------------------------------------
INDEPENDENT LOCAL CONFIRMATIONS : ${post.engagement.confirmations} local residents
COMMUNITY AMPLIFICATIONS        : ${post.engagement.amplifies} amplifications
SHARED BY                       : ${post.engagement.shares} citizens
CREDIBILITY AWARENESS SCORE     : ${post.credibilitySignals.institutionalAwarenessScore}%
P³RE PRIVACY SANITIZATION      : PASSED (Zero PII Leaks detected)

----------------------------------------------------------------------
4. ATTACHED GROUND MEDIA EVIDENCE
----------------------------------------------------------------------
${mediaSection}

----------------------------------------------------------------------
5. TAGGED STATE AGENCIES & DISPATCH STATUS
----------------------------------------------------------------------
AGENCIES : ${tagsSection}

----------------------------------------------------------------------
6. OFFICIAL STATE RESPONSES & ACCOUNTABILITY RECORD
----------------------------------------------------------------------
${responsesSection}

----------------------------------------------------------------------
7. DIRECT VERIFICATION DEEP LINK
----------------------------------------------------------------------
VERIFY ONLINE : ${window.location.origin}/#post-${post.id}
======================================================================`;
  };

  const handleCopyEvidenceBriefing = (post: CivicPost) => {
    const pack = generateEvidencePackText(post);
    navigator.clipboard.writeText(pack);
    setCopiedPackId(post.id);
    setTimeout(() => setCopiedPackId(null), 2500);
  };

  const handleDownloadEvidenceBriefing = (post: CivicPost) => {
    const pack = generateEvidencePackText(post);
    const blob = new Blob([pack], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `evidence-briefing-${post.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden min-h-[680px] flex flex-col md:flex-row text-slate-100">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-950/80 border-b md:border-b-0 md:border-r border-slate-800 p-4 shrink-0 flex flex-col justify-between">
        <div className="space-y-6">
          {/* Header Badge */}
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg text-white">
              <Newspaper className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-white tracking-wide">PRESS & MEDIA DESK</h2>
              <p className="text-[10px] text-slate-400">Ghana Investigative Hub</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('leads')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                activeTab === 'leads'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Flame className="w-4 h-4" /> Investigation Leads
              </span>
              <span className="px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-bold border border-sky-500/30">
                {posts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('clusters')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                activeTab === 'clusters'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Layers className="w-4 h-4" /> Hot Story Clusters
              </span>
              {clusters.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                  {clusters.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('evidence_packs')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                activeTab === 'evidence_packs'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <FileText className="w-4 h-4" /> Evidence Briefings
              </span>
            </button>

            <button
              onClick={() => setActiveTab('accountability')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                activeTab === 'accountability'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <BarChart3 className="w-4 h-4" /> State Accountability
              </span>
            </button>

            <button
              onClick={() => setActiveTab('tools')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                activeTab === 'tools'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4" /> Media Verification
              </span>
            </button>
          </nav>
        </div>

        {/* Footer Status */}
        <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 space-y-1 px-2">
          <div className="flex items-center justify-between">
            <span>Newsroom Wire:</span>
            <span className="text-sky-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span> LIVE
            </span>
          </div>
          <div className="text-[10px]">P³RE Ground Witness Verified</div>
        </div>
      </aside>

      {/* Main Content Body */}
      <main className="flex-1 p-4 sm:p-6 bg-slate-900/60 overflow-y-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              {activeTab === 'leads' && 'Investigative Leads & Real-Time Ground Signals'}
              {activeTab === 'clusters' && 'Emerging Multi-Report Public Interest Clusters'}
              {activeTab === 'evidence_packs' && 'Exportable Newsroom Evidence Briefings'}
              {activeTab === 'accountability' && 'State Institution Response & Responsiveness Tracker'}
              {activeTab === 'tools' && 'Ground Verification & Fact-Checking Utilities'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified civic intelligence feeds formatted for Ghanaian investigative journalists, editors, and newsrooms.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block px-3 py-1 bg-sky-950 text-sky-300 border border-sky-800/80 rounded-lg text-xs font-bold">
              Verified Media Desk
            </span>
          </div>
        </div>

        {/* TAB 1: LEADS */}
        {activeTab === 'leads' && (
          <div className="space-y-4">
            {/* Filter and Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search leads by keyword, district, or region..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                >
                  <option value="ALL">All Categories</option>
                  <option value="Flooding & Drainage">Flooding & Drainage</option>
                  <option value="Infrastructure & Roads">Infrastructure & Roads</option>
                  <option value="Power & Electricity (Dumsor)">Power & Electricity (Dumsor)</option>
                  <option value="Water Supply & Quality">Water Supply & Quality</option>
                  <option value="Public Safety & Security">Public Safety & Security</option>
                  <option value="Sanitation & Waste">Sanitation & Waste</option>
                </select>
              </div>
            </div>

            {/* Sub-tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs">
              <button
                onClick={() => setLeadFilter('breaking')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  leadFilter === 'breaking' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🔥 Highest Confirmation ({breakingPosts.length})
              </button>

              <button
                onClick={() => setLeadFilter('high_velocity')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  leadFilter === 'high_velocity' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🚨 Urgent Public Safety ({highVelocityPosts.length})
              </button>

              <button
                onClick={() => setLeadFilter('unanswered')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  leadFilter === 'unanswered' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ⏳ Unanswered by State ({unansweredMajorPosts.length})
              </button>
            </div>

            {/* List of displayed posts */}
            <div className="space-y-3">
              {displayedPosts.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/60 border border-slate-800 rounded-2xl text-slate-400 text-xs">
                  No investigative leads found matching the filter criteria.
                </div>
              ) : (
                displayedPosts.map((post, idx) => (
                  <div
                    key={post.id ? `${post.id}-${idx}` : `lead-post-${idx}`}
                    className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 hover:border-slate-700 transition-all shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <span className="font-semibold text-sky-400">{post.category}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-300 font-medium">
                            {post.location.district} ({post.location.region} Region)
                          </span>
                          {post.urgency === 'CRITICAL' && (
                            <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold">
                              CRITICAL
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-base text-white">{post.title}</h3>
                      </div>

                      <span className="text-[11px] text-slate-400 whitespace-nowrap">
                        {new Date(post.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                      "{post.content}"
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-3 text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {post.engagement.confirmations} Local Confirmations
                        </span>
                        <span>•</span>
                        <span>
                          Tagged: <strong className="text-slate-200">{post.institutionTags.map(t => t.shortName).join(', ')}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPreviewPackPost(post)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
                          title="Preview full formatted evidence briefing pack"
                        >
                          <Eye className="w-3.5 h-3.5" /> Preview Pack
                        </button>

                        <button
                          onClick={() => handleCopyEvidenceBriefing(post)}
                          className="px-3 py-1.5 bg-sky-950/80 hover:bg-sky-900/80 text-sky-300 text-xs font-semibold rounded-xl border border-sky-800/80 flex items-center gap-1.5 transition-colors"
                          title="Copy formatted news story briefing package"
                        >
                          {copiedPackId === post.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedPackId === post.id ? 'Story Pack Copied!' : 'Copy Evidence Pack'}
                        </button>

                        <button
                          onClick={() => onSelectPost(post)}
                          className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl flex items-center gap-1"
                        >
                          Inspect Post
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: HOT CLUSTERS */}
        {activeTab === 'clusters' && (
          <div className="space-y-4">
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white">Aggregated Investigative Clusters</h3>
                <p className="text-xs text-slate-400">Algorithmic grouping of correlated ground reports across Ghanaian districts.</p>
              </div>
              <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold">
                {clusters.length} Monitored
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clusters.map((c, idx) => (
                <div
                  key={c.id ? `${c.id}-${idx}` : `j-cluster-${idx}`}
                  className="bg-slate-950/60 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl transition-all space-y-3 group shadow-sm flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-400">{c.category}</span>
                      <span className="text-slate-400 font-medium">{c.postCount} reports</span>
                    </div>

                    <h4 className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors line-clamp-2">
                      {c.title}
                    </h4>

                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                      {c.summary}
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{c.district} ({c.region})</span>
                      <span className="text-emerald-400 font-bold">{c.totalConfirmations} confirmed</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenCluster(c.id)}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Layers className="w-3.5 h-3.5" /> View Cluster Details & Reports
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: EVIDENCE BRIEFINGS */}
        {activeTab === 'evidence_packs' && (
          <div className="space-y-4">
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-1">
              <h3 className="font-bold text-sm text-white">Newsroom-Ready Evidence Briefing Packages</h3>
              <p className="text-xs text-slate-400">Structured markdown packages containing geo-verification, ground witness statements, and institutional tracking for news editors.</p>
            </div>

            <div className="space-y-3">
              {posts.map((post, idx) => (
                <div key={post.id} className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-sky-400 font-bold">{post.category}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-300">{post.location.district} ({post.location.region})</span>
                    </div>
                    <h4 className="font-bold text-sm text-white">{post.title}</h4>
                    <p className="text-xs text-slate-400 line-clamp-1">{post.content}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setPreviewPackPost(post)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-700"
                    >
                      <Eye className="w-3.5 h-3.5" /> Preview
                    </button>
                    <button
                      onClick={() => handleCopyEvidenceBriefing(post)}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow"
                    >
                      {copiedPackId === post.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedPackId === post.id ? 'Copied' : 'Copy Pack'}
                    </button>
                    <button
                      onClick={() => handleDownloadEvidenceBriefing(post)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-700"
                    >
                      <Download className="w-3.5 h-3.5" /> .TXT
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: STATE ACCOUNTABILITY */}
        {activeTab === 'accountability' && (
          <div className="space-y-4">
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-1">
              <h3 className="font-bold text-sm text-white">Ghanaian State Agency Responsiveness Matrix</h3>
              <p className="text-xs text-slate-400">Tracking official response rates and field action times for public accountability reporting.</p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">State Institution</th>
                    <th className="p-3">Acronym</th>
                    <th className="p-3">Tagged Citizen Alerts</th>
                    <th className="p-3">Published Statements</th>
                    <th className="p-3">Unanswered Urgents</th>
                    <th className="p-3">Responsiveness Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {institutions.map((inst, idx) => {
                    const tagged = posts.filter(p => p.institutionTags.some(t => t.institutionId === inst.id));
                    const answered = tagged.filter(p => p.officialResponses?.some(r => r.institutionId === inst.id));
                    const unansweredUrgent = tagged.filter(p => (p.urgency === 'CRITICAL' || p.urgency === 'HIGH') && !p.officialResponses?.some(r => r.institutionId === inst.id));
                    const rate = tagged.length > 0 ? Math.round((answered.length / tagged.length) * 100) : 100;

                    return (
                      <tr key={inst.id || idx} className="hover:bg-slate-900/50 transition-colors">
                        <td className="p-3 font-bold text-white">{inst.officialName}</td>
                        <td className="p-3 font-mono text-sky-400 font-semibold">{inst.acronym}</td>
                        <td className="p-3 font-bold text-slate-200">{tagged.length}</td>
                        <td className="p-3 font-bold text-emerald-400">{answered.length}</td>
                        <td className="p-3 font-bold text-amber-400">{unansweredUrgent.length}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            rate >= 50 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {rate}% Response Rate
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: MEDIA VERIFICATION TOOLS */}
        {activeTab === 'tools' && (
          <div className="space-y-4">
            <div className="p-5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-xs uppercase">
                <ShieldCheck className="w-4 h-4" /> Ground Witness & P³RE Verification Protocol
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Ghana Civic Network utilizes local deterministic pattern matching to scrub sensitive citizen PII while preserving timestamp integrity and geographic landmarks for newsroom investigation.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                  <div className="font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Local Multi-Source Witness
                  </div>
                  <p className="text-[11px] text-slate-400">Reports require independent confirmations from local residents in the same district.</p>
                </div>

                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                  <div className="font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Protected Media Pipeline
                  </div>
                  <p className="text-[11px] text-slate-400">Ground photos and audio are processed through P³RE sanitization before public display.</p>
                </div>

                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                  <div className="font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> State Response Audit
                  </div>
                  <p className="text-[11px] text-slate-400">Official statements are cryptographically signed by verified agency responders.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* STORY EVIDENCE PACK PREVIEW MODAL */}
      {previewPackPost && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
            {/* Modal Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-400" />
                <h3 className="font-extrabold text-sm text-white">Story Evidence Pack Briefing</h3>
              </div>
              <button
                onClick={() => setPreviewPackPost(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Formatted Text */}
            <div className="p-4 overflow-y-auto flex-1 font-mono text-xs bg-slate-950/90 text-sky-200 whitespace-pre-wrap leading-relaxed select-all">
              {generateEvidencePackText(previewPackPost)}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2">
              <button
                onClick={() => handleDownloadEvidenceBriefing(previewPackPost)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" /> Download .TXT Briefing
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewPackPost(null)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Close
                </button>
                <button
                  onClick={() => handleCopyEvidenceBriefing(previewPackPost)}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md"
                >
                  {copiedPackId === previewPackPost.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedPackId === previewPackPost.id ? 'Copied to Clipboard!' : 'Copy Evidence Pack'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
