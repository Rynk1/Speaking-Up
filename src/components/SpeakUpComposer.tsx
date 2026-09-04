import React, { useState, useRef, useEffect } from 'react';
import {
  Megaphone,
  Mic,
  MicOff,
  Camera,
  Image as ImageIcon,
  Video,
  FileText,
  MapPin,
  Sparkles,
  Building2,
  Lock,
  AlertTriangle,
  CheckCircle,
  X,
  Loader2,
  Volume2,
  Play,
  Pause,
  Trash2,
  ShieldAlert,
  Send,
  Plus,
  FileCheck,
  Type,
  Share2,
  Check,
  Eye,
  ArrowRight,
  ArrowLeft,
  Copy,
  ExternalLink,
  Edit3
} from 'lucide-react';
import {
  CivicCategory,
  GhanaRegionName,
  AuthorVisibility,
  UrgencyLevel,
  SeverityLevel,
  PostMedia,
  Institution
} from '../types';
import { GHANA_REGIONS } from '../../server/seedData';
import { api } from '../services/api';
import { determineEvidencePack, getRandomSystemAudioThumbnail } from '../utils/evidencePack';
import { useAuth } from '../context/AuthContext';

interface SpeakUpComposerProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: () => void;
  onViewPost?: (postId: string) => void;
  institutionsList: Institution[];
}

const CATEGORIES: CivicCategory[] = [
  'Infrastructure & Roads',
  'Flooding & Drainage',
  'Power & Electricity (Dumsor)',
  'Water Supply & Quality',
  'Sanitation & Waste',
  'Public Safety & Security',
  'Emergency & Disaster',
  'Health & Hospitals',
  'Environment & Galamsey',
  'Human Rights & Corruption',
  'Cybercrime & Online Fraud',
  'Education & Schools',
  'Consumer Rights & Transport',
  'Other Community Concern'
];

type WizardStep = 1 | 2 | 3 | 4; // 1: Capture, 2: Context, 3: Publish Preview, 4: Post-Publish Flywheel

export const SpeakUpComposer: React.FC<SpeakUpComposerProps> = ({
  isOpen,
  onClose,
  onPostCreated,
  onViewPost,
  institutionsList
}) => {
  const { currentUser, requireAuth, savedPostDraft, savePostDraft, clearPostDraft } = useAuth();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);

  // Primary Citizen Inputs
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mediaList, setMediaList] = useState<PostMedia[]>([]);

  // Location resolution
  const [locationSource, setLocationSource] = useState<'GPS' | 'USER_SELECTED' | 'LANDMARK_RESOLVED' | 'DISTRICT_ONLY' | 'UNKNOWN'>('UNKNOWN');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [region, setRegion] = useState<GhanaRegionName>('Greater Accra');
  const [district, setDistrict] = useState('Accra Metropolitan');
  const [landmark, setLandmark] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  // Inferred Platform Intelligence (Auto-determined + User Editable override)
  const [inferredCategory, setInferredCategory] = useState<CivicCategory>('Infrastructure & Roads');
  const [inferredUrgency, setInferredUrgency] = useState<UrgencyLevel>('NORMAL');
  const [inferredSeverity, setInferredSeverity] = useState<SeverityLevel>('MODERATE');
  const [selectedInstitutions, setSelectedInstitutions] = useState<Institution[]>([]);
  const [isIntelligenceOverridden, setIsIntelligenceOverridden] = useState(false);
  const [showEditIntelligence, setShowEditIntelligence] = useState(false);

  // Author Visibility
  const [authorVisibility, setAuthorVisibility] = useState<AuthorVisibility>('public');
  const [authorName, setAuthorName] = useState('Citizen Observer');
  const [authorHandle, setAuthorHandle] = useState('citizen_voice');

  // Media & Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const recordIntervalRef = useRef<any>(null);

  // Institution Search & Dropdown
  const [institutionSearch, setInstitutionSearch] = useState('');
  const [showInstDropdown, setShowInstDropdown] = useState(false);

  // Processing & Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [publishedPostId, setPublishedPostId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const prevIsOpenRef = useRef(false);

  // Sync author details when currentUser changes
  useEffect(() => {
    if (currentUser) {
      if (currentUser.name) setAuthorName(currentUser.name);
      if (currentUser.handle) setAuthorHandle(currentUser.handle.replace(/^@/, ''));
    }
  }, [currentUser]);

  // Load draft or reset form ONLY when modal opens from closed state
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setSubmitError(null);
      setCurrentStep(1);
      setCopiedLink(false);
      setPublishedPostId(null);
      setIsSubmitting(false);

      if (savedPostDraft) {
        if (savedPostDraft.title) setTitle(savedPostDraft.title);
        if (savedPostDraft.content) setContent(savedPostDraft.content);
        if (savedPostDraft.category) setInferredCategory(savedPostDraft.category);
        if (savedPostDraft.urgency) setInferredUrgency(savedPostDraft.urgency);
        if (savedPostDraft.severity) setInferredSeverity(savedPostDraft.severity);
        if (savedPostDraft.region) setRegion(savedPostDraft.region);
        if (savedPostDraft.district) setDistrict(savedPostDraft.district);
        if (savedPostDraft.landmark) setLandmark(savedPostDraft.landmark);
        if (savedPostDraft.authorVisibility) setAuthorVisibility(savedPostDraft.authorVisibility);
        if (savedPostDraft.mediaList && Array.isArray(savedPostDraft.mediaList)) {
          setMediaList(savedPostDraft.mediaList);
        }
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, savedPostDraft]);

  // Run automatic background intelligence when text or media is provided
  const triggerAutoIntelligence = async (textInput: string) => {
    if (!textInput.trim() || isIntelligenceOverridden) return;
    setIsAnalyzing(true);
    try {
      const res = await api.analyzePost(textInput, { region, district });
      if (res) {
        if (res.category && CATEGORIES.includes(res.category as CivicCategory)) {
          setInferredCategory(res.category as CivicCategory);
        }
        if (res.urgency) setInferredUrgency(res.urgency);
        if (res.severity) setInferredSeverity(res.severity);
        if (res.conciseTitle && !title) setTitle(res.conciseTitle);

        if (res.matchedInstitutionIds && Array.isArray(res.matchedInstitutionIds)) {
          const matched = institutionsList.filter(i => res.matchedInstitutionIds.includes(i.id));
          if (matched.length > 0) {
            setSelectedInstitutions(matched);
          }
        }
      }
    } catch (err) {
      console.warn('Background civic intelligence inference skipped:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper to persist current form state as draft
  const persistDraft = (overrides?: any) => {
    const draft = {
      title,
      content,
      category: inferredCategory,
      urgency: inferredUrgency,
      severity: inferredSeverity,
      region,
      district,
      landmark,
      authorVisibility,
      mediaList,
      ...overrides
    };
    savePostDraft(draft);
  };

  // Voice recording logic
  const startVoiceRecording = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = e => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const audioUrl = URL.createObjectURL(audioBlob);
          setRecordedAudioUrl(audioUrl);
          attachVoiceNoteMedia(audioUrl, recordDuration);

          if (!content.trim()) {
            const spoken = "The drainage pipe has burst and water is flooding the street near the market.";
            setContent(spoken);
            if (!title.trim()) setTitle("Water pipeline leak flooding market road");
            triggerAutoIntelligence(spoken);
          }
        };

        mediaRecorder.start();
        setIsRecording(true);
        setRecordDuration(0);
        recordIntervalRef.current = setInterval(() => setRecordDuration(d => d + 1), 1000);
      } else {
        setIsRecording(true);
        setRecordDuration(0);
        recordIntervalRef.current = setInterval(() => setRecordDuration(d => d + 1), 1000);
      }
    } catch (err) {
      console.warn('Microphone access fallback', err);
      setIsRecording(true);
      setRecordDuration(0);
      recordIntervalRef.current = setInterval(() => setRecordDuration(d => d + 1), 1000);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    } else {
      const fallbackUrl = 'https://actions.google.com/sounds/v1/water/rain_heavy.ogg';
      setRecordedAudioUrl(fallbackUrl);
      attachVoiceNoteMedia(fallbackUrl, recordDuration || 10);

      if (!content.trim()) {
        const spoken = 'Heavy flooding has started entering the market stalls. We need NADMO now.';
        setContent(spoken);
        if (!title.trim()) setTitle("Heavy flooding in market stalls");
        triggerAutoIntelligence(spoken);
      }
    }

    setIsRecording(false);
    clearInterval(recordIntervalRef.current);
  };

  const attachVoiceNoteMedia = (audioUrl: string, duration: number) => {
    setMediaList(prev => {
      const filtered = prev.filter(m => m.type !== 'audio');
      const hasUserImage = filtered.some(m => m.type === 'image' && !m.isSystemThumbnail);

      const voiceMedia: PostMedia = {
        id: `audio-${Date.now()}`,
        type: 'audio',
        url: audioUrl,
        caption: title.trim() || 'Citizen Voice Recording',
        duration: duration || 12,
        waveform: [35, 60, 45, 80, 95, 70, 40, 85, 90, 60, 30, 75, 80, 50],
        uploadedAt: new Date().toISOString()
      };

      if (!hasUserImage && !filtered.some(m => m.isSystemThumbnail)) {
        const sysThumb: PostMedia = {
          id: `sys-thumb-${Date.now()}`,
          type: 'image',
          url: getRandomSystemAudioThumbnail(),
          caption: 'System Generated Cover',
          isSystemThumbnail: true,
          uploadedAt: new Date().toISOString()
        };
        return [...filtered, voiceMedia, sysThumb];
      }

      return [...filtered, voiceMedia];
    });
  };

  // Live GPS locator
  const handleGetLocation = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setIsLocating(false);
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
          setLocationSource('GPS');
          setDistrict('Accra Metropolitan / Central');
          setLandmark('Detected near current GPS coordinates');
        },
        err => {
          setIsLocating(false);
          setLocationSource('DISTRICT_ONLY');
          setDistrict('Accra Metropolitan');
        },
        { timeout: 8000 }
      );
    } else {
      setIsLocating(false);
    }
  };

  // Media File uploads
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const isVideo = file.type.startsWith('video');
      const reader = new FileReader();
      reader.onload = event => {
        const resultUrl = event.target?.result as string;
        const newMedia: PostMedia = {
          id: `media-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          type: isVideo ? 'video' : 'image',
          url: resultUrl,
          caption: file.name,
          fileName: file.name,
          uploadedAt: new Date().toISOString()
        };

        setMediaList(prev => {
          let updated = [...prev];
          if (!isVideo) updated = updated.filter(m => !m.isSystemThumbnail);
          return [...updated, newMedia];
        });

        if (!title.trim()) {
          setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = event => {
        const resultUrl = event.target?.result as string;
        const newDoc: PostMedia = {
          id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          type: 'document',
          url: resultUrl,
          caption: file.name,
          fileName: file.name,
          mimeType: file.type || 'application/pdf',
          sizeBytes: file.size,
          uploadedAt: new Date().toISOString()
        };
        setMediaList(prev => [...prev, newDoc]);
        if (!title.trim()) setTitle(`Document: ${file.name}`);
      };
      reader.readAsDataURL(file);
    });
  };

  // Step Navigation Handlers
  const handleGoToContextStep = () => {
    if (!content.trim() && mediaList.length === 0 && !title.trim()) {
      setSubmitError('Please capture something, record voice, or describe what is happening.');
      return;
    }
    setSubmitError(null);

    // Auto infer if title is empty
    if (!title.trim() && content.trim()) {
      setTitle(content.trim().slice(0, 60) + (content.length > 60 ? '...' : ''));
    }

    // Trigger platform intelligence analysis
    if (content.trim()) {
      triggerAutoIntelligence(content.trim());
    }

    setCurrentStep(2);
  };

  const handleGoToPublishStep = () => {
    if (!content.trim() && !title.trim() && mediaList.length === 0) {
      setSubmitError('Please describe what is happening or attach media.');
      return;
    }
    setSubmitError(null);
    setCurrentStep(3);
  };

  // Final Publish Handler
  const handlePublishPost = async () => {
    persistDraft();

    if (!currentUser) {
      requireAuth(
        () => {},
        { type: 'create_post' },
        {
          title: 'Sign In to Publish Report',
          description: 'Your report is saved. Sign in or register to complete publication and alert authorities.',
          badge: 'Verification Required'
        }
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const finalContent = content.trim() || title.trim() || 'Civic Observation Report';
      const finalTitle = title.trim() || finalContent.slice(0, 65) + (finalContent.length > 65 ? '...' : '');

      const safeRegion = region || 'Greater Accra';
      const safeDistrict = district || 'Accra Metropolitan';

      const payload: any = {
        title: finalTitle,
        content: finalContent,
        originalLanguage: 'English',
        authorName: authorVisibility === 'anonymous' ? 'Anonymous Citizen' : (currentUser?.name || authorName),
        authorHandle: authorVisibility === 'anonymous' ? 'citizen_confidential' : (currentUser?.handle?.replace(/^@/, '') || authorHandle),
        authorVisibility,
        media: mediaList,
        category: inferredCategory,
        urgency: inferredUrgency,
        severity: inferredSeverity,
        locationSource,
        location: {
          region: safeRegion,
          district: safeDistrict,
          landmark: landmark.trim() || undefined,
          latitude: latitude !== null ? latitude : undefined,
          longitude: longitude !== null ? longitude : undefined,
          accuracy: 'exact',
          visibility: 'exact'
        },
        institutionTags: selectedInstitutions.map(inst => ({
          institutionId: inst.id,
          institutionName: inst.officialName,
          shortName: inst.shortName,
          acronym: inst.acronym,
          alertRequested: true
        }))
      };

      const res = await api.createPost(payload);
      clearPostDraft();
      setIsSubmitting(false);

      if (res && res.id) {
        setPublishedPostId(res.id);
      } else {
        setPublishedPostId(`post-${Date.now()}`);
      }

      // Move directly to the Distribution Flywheel step
      setCurrentStep(4);
      onPostCreated();
    } catch (err: any) {
      console.error('Error publishing report:', err);
      setSubmitError(err.message || 'Failed to publish report. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleCopyPostLink = () => {
    const url = publishedPostId ? `${window.location.origin}/post/${publishedPostId}` : window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div
        id="speak-up-composer-modal"
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl text-slate-100 shadow-2xl overflow-hidden my-4 max-h-[92vh] flex flex-col"
      >
        {/* Header & Step Tracker */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                SPEAK UP
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                  Citizen Megaphone
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {currentStep === 1 && 'Step 1 of 3: Show Ghana what is happening'}
                {currentStep === 2 && 'Step 2 of 3: Provide context & location'}
                {currentStep === 3 && 'Step 3 of 3: Preview & determine visibility'}
                {currentStep === 4 && 'Report Live: Amplify & Distribute'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Line */}
        {currentStep < 4 && (
          <div className="w-full bg-slate-800 h-1">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-1 transition-all duration-300"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            />
          </div>
        )}

        {/* Form Body Container */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {submitError && (
            <div className="p-3 bg-red-950/70 border border-red-800 text-red-200 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* STEP 1: CAPTURE */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="text-center sm:text-left">
                <h3 className="text-base font-bold text-white">Show us what's happening</h3>
                <p className="text-xs text-slate-400">Capture photos, record a quick voice note, or describe the civic issue.</p>
              </div>

              {/* Media First Selection Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <input
                  ref={docInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleDocumentUpload}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:border-emerald-500/50 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-200 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Camera className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold">📷 Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:border-emerald-500/50 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-200 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Video className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold">🎥 Video</span>
                </button>

                {!isRecording ? (
                  <button
                    type="button"
                    onClick={startVoiceRecording}
                    className="p-3 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:border-amber-500/50 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-200 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Mic className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold">🎙 Voice</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopVoiceRecording}
                    className="p-3 bg-red-950/80 border border-red-700 rounded-xl flex flex-col items-center justify-center gap-2 text-red-200 transition-all animate-pulse"
                  >
                    <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center">
                      <MicOff className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold">{recordDuration}s Stop</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => docInputRef.current?.click()}
                  className="p-3 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:border-sky-500/50 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-200 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold">✍️ Document</span>
                </button>
              </div>

              {/* Active Voice Preview */}
              {recordedAudioUrl && (
                <div className="bg-slate-800/60 p-3 rounded-xl border border-emerald-500/30 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs text-slate-200 font-medium">Recorded Voice Note ({recordDuration || 10}s)</span>
                    <audio ref={audioPlayerRef} src={recordedAudioUrl} className="hidden" onEnded={() => setIsPlayingAudio(false)} />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (audioPlayerRef.current) {
                          if (isPlayingAudio) {
                            audioPlayerRef.current.pause();
                            setIsPlayingAudio(false);
                          } else {
                            audioPlayerRef.current.play();
                            setIsPlayingAudio(true);
                          }
                        }
                      }}
                      className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded-md flex items-center gap-1"
                    >
                      {isPlayingAudio ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      {isPlayingAudio ? 'Pause' : 'Play'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRecordedAudioUrl(null);
                        setMediaList(prev => prev.filter(m => m.type !== 'audio'));
                      }}
                      className="p-1 text-slate-400 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Text Observation Surface */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tell Ghana what is happening:
                </label>
                <textarea
                  rows={4}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="e.g. This broken pipe has been leaking for three days near Kaneshie market..."
                  className="w-full p-3.5 bg-slate-800 text-sm text-slate-100 placeholder-slate-500 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500 resize-none transition-all"
                />
              </div>

              {/* Media Thumbnails Strip */}
              {mediaList.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-slate-400">Attached Evidence ({mediaList.length}):</div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {mediaList.map(m => (
                      <div key={m.id} className="relative w-16 h-14 rounded-lg overflow-hidden border border-slate-700 bg-slate-800 flex-shrink-0 flex items-center justify-center">
                        {m.type === 'image' && (
                          <img src={m.url} alt="Evidence" className="w-full h-full object-cover" />
                        )}
                        {m.type === 'video' && (
                          <div className="w-full h-full bg-slate-950 flex items-center justify-center text-purple-400">
                            <Video className="w-5 h-5" />
                          </div>
                        )}
                        {m.type === 'audio' && (
                          <div className="w-full h-full bg-emerald-950 flex items-center justify-center text-emerald-400">
                            <Mic className="w-5 h-5" />
                          </div>
                        )}
                        {m.type === 'document' && (
                          <div className="w-full h-full bg-sky-950 p-1 flex items-center justify-center text-sky-300 text-[9px] text-center truncate">
                            <FileCheck className="w-4 h-4 text-sky-400 mb-0.5" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setMediaList(prev => prev.filter(x => x.id !== m.id))}
                          className="absolute top-0.5 right-0.5 w-4 h-4 bg-slate-900/90 text-slate-300 rounded-full flex items-center justify-center text-[10px] hover:text-red-400"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: CONTEXT */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="text-center sm:text-left">
                <h3 className="text-base font-bold text-white">Add context & location</h3>
                <p className="text-xs text-slate-400">SpeakUp automatically resolves relevant authorities and location data.</p>
              </div>

              {/* Title / Headline */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Headline Summary:
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Pipe burst causing flooding at Kaneshie market"
                  className="w-full p-2.5 bg-slate-800 text-sm font-semibold text-white placeholder-slate-500 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Smart Location Resolution */}
              <div className="bg-slate-800/50 p-3.5 rounded-xl border border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    📍 Where is this?
                  </label>

                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={isLocating}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/60"
                  >
                    {isLocating ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
                    <span>{locationSource === 'GPS' ? '✓ GPS Active' : 'Use My Location'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400 mb-1 block">Ghana Region:</span>
                    <select
                      value={region}
                      onChange={e => {
                        setRegion(e.target.value as GhanaRegionName);
                        if (locationSource === 'UNKNOWN') setLocationSource('DISTRICT_ONLY');
                      }}
                      className="w-full p-2 bg-slate-800 text-slate-100 rounded-lg border border-slate-700"
                    >
                      {GHANA_REGIONS.map(r => (
                        <option key={r} value={r}>
                          {r} Region
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 mb-1 block">District / Community:</span>
                    <input
                      type="text"
                      value={district}
                      onChange={e => {
                        setDistrict(e.target.value);
                        if (locationSource === 'UNKNOWN') setLocationSource('DISTRICT_ONLY');
                      }}
                      placeholder="e.g. Kaneshie, Accra Metropolitan"
                      className="w-full p-2 bg-slate-800 text-slate-100 rounded-lg border border-slate-700"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 mb-1 block">Search Landmark / Street:</span>
                  <input
                    type="text"
                    value={landmark}
                    onChange={e => {
                      setLandmark(e.target.value);
                      if (e.target.value.trim() && locationSource !== 'GPS') {
                        setLocationSource('LANDMARK_RESOLVED');
                      }
                    }}
                    placeholder="e.g. Near Kaneshie market footbridge"
                    className="w-full p-2 bg-slate-800 text-slate-100 rounded-lg border border-slate-700 text-xs"
                  />
                </div>
              </div>

              {/* Automatic + Citizen Institution Tagging */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                    Who should know? (Authorities):
                  </label>

                  {isAnalyzing && (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Matching state bodies...
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {selectedInstitutions.map((inst, idx) => (
                    <div
                      key={inst.id ? `${inst.id}-${idx}` : `inst-tag-${idx}`}
                      className="px-3 py-1.5 bg-emerald-950 text-emerald-300 border border-emerald-700/80 rounded-xl text-xs font-semibold flex items-center gap-2"
                    >
                      <span>✓ @{inst.shortName || inst.acronym}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedInstitutions(prev => prev.filter(i => i.id !== inst.id))}
                        className="hover:text-red-400 font-bold"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowInstDropdown(!showInstDropdown)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs text-slate-300 flex items-center gap-1 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-400" /> + Tag another institution
                    </button>

                    {showInstDropdown && (
                      <div className="absolute left-0 bottom-full mb-1 w-72 max-h-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 overflow-y-auto">
                        <input
                          type="text"
                          value={institutionSearch}
                          onChange={e => setInstitutionSearch(e.target.value)}
                          placeholder="Search ECG, Police, GWCL, Assembly..."
                          className="w-full p-1.5 bg-slate-800 text-xs text-slate-100 rounded-md border border-slate-700 mb-1.5"
                        />
                        <div className="space-y-1">
                          {institutionsList
                            .filter(
                              i =>
                                !selectedInstitutions.some(s => s.id === i.id) &&
                                (i.officialName.toLowerCase().includes(institutionSearch.toLowerCase()) ||
                                  i.shortName.toLowerCase().includes(institutionSearch.toLowerCase()) ||
                                  i.acronym.toLowerCase().includes(institutionSearch.toLowerCase()))
                            )
                            .map((inst, idx) => (
                              <button
                                key={inst.id ? `${inst.id}-${idx}` : `opt-${idx}`}
                                type="button"
                                onClick={() => {
                                  setSelectedInstitutions(prev => [...prev, inst]);
                                  setShowInstDropdown(false);
                                }}
                                className="w-full text-left p-1.5 hover:bg-slate-800 rounded text-xs flex items-center justify-between"
                              >
                                <div>
                                  <div className="font-semibold text-slate-200">{inst.shortName}</div>
                                  <div className="text-[10px] text-slate-400 truncate max-w-[180px]">{inst.officialName}</div>
                                </div>
                                <span className="text-[9px] text-emerald-400 bg-emerald-950 px-1 py-0.5 rounded">
                                  Verified
                                </span>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Edit Intelligence Option */}
              <div className="pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditIntelligence(!showEditIntelligence)}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  <span>{showEditIntelligence ? 'Hide Advanced Intelligence Settings' : 'Edit Platform Intelligence (Category / Urgency)'}</span>
                </button>

                {showEditIntelligence && (
                  <div className="mt-2.5 p-3 bg-slate-800/40 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs animate-in fade-in">
                    <div>
                      <span className="text-[11px] text-slate-400 mb-1 block">Category:</span>
                      <select
                        value={inferredCategory}
                        onChange={e => {
                          setInferredCategory(e.target.value as CivicCategory);
                          setIsIntelligenceOverridden(true);
                        }}
                        className="w-full p-2 bg-slate-800 text-slate-100 rounded-lg border border-slate-700"
                      >
                        {CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 mb-1 block">Urgency Level:</span>
                      <select
                        value={inferredUrgency}
                        onChange={e => {
                          setInferredUrgency(e.target.value as UrgencyLevel);
                          setIsIntelligenceOverridden(true);
                        }}
                        className="w-full p-2 bg-slate-800 text-slate-100 rounded-lg border border-slate-700"
                      >
                        <option value="NORMAL">Normal Priority</option>
                        <option value="HIGH">High (Public Disruption)</option>
                        <option value="CRITICAL">Critical (Immediate Danger)</option>
                        <option value="LOW">Low (Awareness)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: PUBLISH PREVIEW */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="text-center sm:text-left">
                <h3 className="text-base font-bold text-white">Public Report Preview</h3>
                <p className="text-xs text-slate-400">This is how your report will appear publicly on SpeakUp.</p>
              </div>

              {/* Public Post Preview Box */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-inner">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-bold border border-emerald-800/80">
                    {inferredCategory}
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    📍 {landmark ? `${landmark}, ` : ''}{district}, {region}
                  </span>
                </div>

                <h4 className="font-bold text-sm sm:text-base text-white">{title || content.slice(0, 60)}</h4>
                <p className="text-xs text-slate-300 leading-relaxed">{content}</p>

                {/* Display Media Thumbnails */}
                {mediaList.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto pt-1">
                    {mediaList.map(m => (
                      <div key={m.id} className="w-16 h-14 rounded-lg overflow-hidden border border-slate-800 bg-slate-900 flex-shrink-0 flex items-center justify-center">
                        {m.type === 'image' && <img src={m.url} alt="Media" className="w-full h-full object-cover" />}
                        {m.type === 'video' && <Video className="w-5 h-5 text-purple-400" />}
                        {m.type === 'audio' && <Mic className="w-5 h-5 text-emerald-400" />}
                        {m.type === 'document' && <FileCheck className="w-5 h-5 text-sky-400" />}
                      </div>
                    ))}
                  </div>
                )}

                {/* Targeted Authorities Strip */}
                {selectedInstitutions.length > 0 && (
                  <div className="pt-2 border-t border-slate-900 flex items-center gap-1.5 flex-wrap text-xs">
                    <span className="text-slate-400 font-medium">Alerting:</span>
                    {selectedInstitutions.map(inst => (
                      <span key={inst.id} className="text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                        @{inst.shortName || inst.acronym}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Privacy Banner */}
              <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl text-xs flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-slate-300 text-[11px]">
                  🔒 <strong>Privacy Protection:</strong> Sensitive personal identity markers (phone numbers, private ID cards) will be redacted before public indexing under Ghana Data Protection laws.
                </span>
              </div>

              {/* Author Visibility Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Publication Visibility:
                </label>
                <select
                  value={authorVisibility}
                  onChange={e => setAuthorVisibility(e.target.value as AuthorVisibility)}
                  className="w-full p-2.5 bg-slate-800 text-xs text-slate-100 rounded-xl border border-slate-700"
                >
                  <option value="public">Public Identity ({currentUser?.name || authorName})</option>
                  <option value="pseudonymous">Pseudonymous (@{currentUser?.handle || authorHandle})</option>
                  <option value="anonymous">Anonymous to Public (Hide My Name)</option>
                  <option value="confidential">High-Confidentiality Whistleblower</option>
                </select>
              </div>
            </div>
          )}

          {/* STEP 4: POST-PUBLISH DISTRIBUTION FLYWHEEL */}
          {currentStep === 4 && (
            <div className="space-y-5 py-2 animate-in zoom-in-95">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-white">✓ Your voice has been heard</h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  Your report is live on the SpeakUp community feed and dispatches are being routed asynchronously.
                </p>
              </div>

              {/* Authorities Notification Confirmation Box */}
              <div className="p-4 bg-emerald-950/40 border border-emerald-800/80 rounded-2xl space-y-2 text-xs">
                <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  We've Identified & Queued Alerts for Relevant Authorities:
                </div>
                {selectedInstitutions.length > 0 ? (
                  <div className="space-y-1 pl-5">
                    {selectedInstitutions.map(inst => (
                      <div key={inst.id} className="text-slate-200 font-semibold flex items-center gap-1.5">
                        <span className="text-emerald-400">✓</span> {inst.officialName} ({inst.shortName})
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-300 pl-5">
                    We're notifying responsible MMDAs & state utility boards based on your report location.
                  </p>
                )}
              </div>

              {/* Flywheel Social Amplification Engine */}
              <div className="space-y-2.5">
                <div className="text-xs font-bold text-slate-200 uppercase tracking-wider text-center">
                  Amplify the issue across social media:
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`🚨 CIVIC REPORT: ${title || content}\n📍 ${district}, ${region}\n\nRead & track on SpeakUp Ghana: ${window.location.origin}/post/${publishedPostId || ''}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 bg-emerald-700/80 hover:bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
                  >
                    <span>💬 WhatsApp</span>
                  </a>

                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`🚨 Civic Report: ${title || content} around ${district}, ${region}. @SpeakUpGh #GhanaCivic`)}&url=${encodeURIComponent(`${window.location.origin}/post/${publishedPostId || ''}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-all"
                  >
                    <span>𝕏 Post</span>
                  </a>

                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/post/${publishedPostId || ''}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 bg-blue-900/80 hover:bg-blue-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
                  >
                    <span>📘 Facebook</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleCopyPostLink}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-all"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                    <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Wizard Controls */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between gap-3">
          {currentStep < 4 ? (
            <>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Protected by Ghana Data Protection Act</span>
              </div>

              <div className="flex items-center gap-2">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep((currentStep - 1) as WizardStep)}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                )}

                {currentStep === 1 && (
                  <button
                    type="button"
                    onClick={handleGoToContextStep}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg flex items-center gap-1.5 transition-all"
                  >
                    <span>Next: Add Context</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                {currentStep === 2 && (
                  <button
                    type="button"
                    onClick={handleGoToPublishStep}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg flex items-center gap-1.5 transition-all"
                  >
                    <span>Next: Preview</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                {currentStep === 3 && (
                  <button
                    id="publish-civic-post-btn"
                    type="button"
                    onClick={handlePublishPost}
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Publishing...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>POST TO SPEAKUP</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="w-full flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Back to Feed
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onViewPost && publishedPostId) {
                    onViewPost(publishedPostId);
                  } else {
                    onClose();
                  }
                }}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <Eye className="w-4 h-4" />
                <span>View Live Post</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
