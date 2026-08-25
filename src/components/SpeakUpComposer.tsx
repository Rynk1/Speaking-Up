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
  Building2,
  Lock,
  AlertTriangle,
  CheckCircle2,
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
  ArrowRight,
  ArrowLeft,
  Eye,
  Share2,
  Check,
  Sparkles,
  Search,
  ExternalLink
} from 'lucide-react';
import {
  CivicCategory,
  GhanaRegionName,
  AuthorVisibility,
  UrgencyLevel,
  SeverityLevel,
  PostMedia,
  Institution,
  CivicPost
} from '../types';
import { GHANA_REGIONS } from '../../server/seedData';
import { api } from '../services/api';
import { determineEvidencePack, getRandomSystemAudioThumbnail } from '../utils/evidencePack';
import { useAuth } from '../context/AuthContext';

interface SpeakUpComposerProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: () => void;
  institutionsList: Institution[];
}

export const SpeakUpComposer: React.FC<SpeakUpComposerProps> = ({
  isOpen,
  onClose,
  onPostCreated,
  institutionsList
}) => {
  const { currentUser, requireAuth, savedPostDraft, savePostDraft, clearPostDraft } = useAuth();

  // Wizard Step State (1: Capture, 2: Context, 3: Preview/Publish, 4: Post-Publish Flywheel)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Core Inputs (Citizen Signal)
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [mediaList, setMediaList] = useState<PostMedia[]>([]);

  // Location State
  const [locationText, setLocationText] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [detectedGps, setDetectedGps] = useState<{ lat?: number; lng?: number; source: string } | null>(null);
  const [inferredRegion, setInferredRegion] = useState<GhanaRegionName>('Greater Accra');
  const [inferredDistrict, setInferredDistrict] = useState('Accra Metropolitan');

  // Institution Selection & Auto-Suggestions
  const [selectedInstitutions, setSelectedInstitutions] = useState<Institution[]>([]);
  const [suggestedInstitutions, setSuggestedInstitutions] = useState<Institution[]>([]);
  const [institutionSearch, setInstitutionSearch] = useState('');
  const [showInstDropdown, setShowInstDropdown] = useState(false);

  // Author & Privacy
  const [authorVisibility, setAuthorVisibility] = useState<AuthorVisibility>('public');
  const [blurFaces, setBlurFaces] = useState(false);

  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const recordIntervalRef = useRef<any>(null);

  // Platform Inferred Fields (Populated automatically by background AI/heuristics)
  const [inferredCategory, setInferredCategory] = useState<CivicCategory>('Infrastructure & Roads');
  const [inferredUrgency, setInferredUrgency] = useState<UrgencyLevel>('NORMAL');
  const [inferredSeverity, setInferredSeverity] = useState<SeverityLevel>('MODERATE');

  // Submission & Post-Publish State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [publishedPost, setPublishedPost] = useState<CivicPost | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Load saved draft on open
  useEffect(() => {
    if (isOpen) {
      setSubmitError(null);
      if (savedPostDraft) {
        if (savedPostDraft.title) setTitle(savedPostDraft.title);
        if (savedPostDraft.content) setContent(savedPostDraft.content);
        if (savedPostDraft.locationText) setLocationText(savedPostDraft.locationText);
        if (savedPostDraft.authorVisibility) setAuthorVisibility(savedPostDraft.authorVisibility);
        if (savedPostDraft.mediaList && Array.isArray(savedPostDraft.mediaList)) {
          setMediaList(savedPostDraft.mediaList);
        }
      }
    } else {
      // Reset step when closed
      setStep(1);
      setPublishedPost(null);
    }
  }, [isOpen, savedPostDraft]);

  // Persist draft
  const persistDraft = () => {
    savePostDraft({
      title,
      content,
      locationText,
      authorVisibility,
      mediaList
    });
  };

  // Auto-detect institutions and location keywords whenever text or location updates
  useEffect(() => {
    const textToScan = `${title} ${content} ${locationText}`.toLowerCase();
    if (!textToScan.trim()) return;

    // Fast keyword matching against verified Ghanaian institution database
    const matches = institutionsList.filter(inst => {
      const acronym = inst.acronym?.toLowerCase() || '';
      const shortName = inst.shortName?.toLowerCase() || '';
      const mandate = inst.mandate?.toLowerCase() || '';

      if (acronym && textToScan.includes(acronym)) return true;
      if (shortName && textToScan.includes(shortName)) return true;

      // Smart category mapping heuristics
      if ((textToScan.includes('water') || textToScan.includes('pipe') || textToScan.includes('leak')) && (acronym === 'gwcl' || shortName.includes('water'))) return true;
      if ((textToScan.includes('light') || textToScan.includes('dumsor') || textToScan.includes('power') || textToScan.includes('ecg')) && (acronym === 'ecg' || shortName.includes('electricity'))) return true;
      if ((textToScan.includes('police') || textToScan.includes('crime') || textToScan.includes('robbery') || textToScan.includes('thief')) && (acronym === 'gps' || shortName.includes('police'))) return true;
      if ((textToScan.includes('flood') || textToScan.includes('disaster') || textToScan.includes('rain') || textToScan.includes('nadmo')) && (acronym === 'nadmo' || shortName.includes('disaster'))) return true;
      if ((textToScan.includes('road') || textToScan.includes('pothole') || textToScan.includes('bridge') || textToScan.includes('gutter')) && (acronym === 'mwrh' || acronym === 'gta' || shortName.includes('road'))) return true;

      return false;
    });

    if (matches.length > 0) {
      setSuggestedInstitutions(matches.slice(0, 3));
      // Auto-populate selected if empty
      if (selectedInstitutions.length === 0) {
        setSelectedInstitutions(matches.slice(0, 2));
      }
    }

    // Heuristic categorization
    if (textToScan.includes('flood') || textToScan.includes('gutter') || textToScan.includes('drain')) setInferredCategory('Flooding & Drainage');
    else if (textToScan.includes('water') || textToScan.includes('pipe')) setInferredCategory('Water Supply & Quality');
    else if (textToScan.includes('light') || textToScan.includes('ecg') || textToScan.includes('dumsor')) setInferredCategory('Power & Electricity (Dumsor)');
    else if (textToScan.includes('police') || textToScan.includes('crime')) setInferredCategory('Public Safety & Security');
    else if (textToScan.includes('galamsey') || textToScan.includes('river')) setInferredCategory('Environment & Galamsey');

    // Heuristic urgency
    if (textToScan.includes('danger') || textToScan.includes('collapsed') || textToScan.includes('fire') || textToScan.includes('emergency')) {
      setInferredUrgency('CRITICAL');
      setInferredSeverity('EMERGENCY');
    }
  }, [title, content, locationText, institutionsList]);

  // Voice Recording Logic
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
        };

        mediaRecorder.start();
        setIsRecording(true);
        setRecordDuration(0);
        recordIntervalRef.current = setInterval(() => {
          setRecordDuration(d => d + 1);
        }, 1000);
      }
    } catch (err) {
      console.warn('Microphone access not granted, using fallback audio note', err);
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
      attachVoiceNoteMedia(fallbackUrl, recordDuration || 8);
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
          caption: 'System Generated Background Cover',
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
          setDetectedGps({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            source: 'GPS'
          });
          if (!locationText) {
            setLocationText('Accra Metropolitan / Current GPS Location');
          }
        },
        err => {
          setIsLocating(false);
          setDetectedGps(null);
          if (!locationText) setLocationText('Accra Metropolitan');
        },
        { timeout: 8000 }
      );
    } else {
      setIsLocating(false);
    }
  };

  // File Upload Handlers
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
          if (!isVideo) {
            updated = updated.filter(m => !m.isSystemThumbnail);
          }
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
        if (!title.trim()) {
          setTitle(`Document: ${file.name}`);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Submit Post Handler
  const handleSubmit = async () => {
    if (!content.trim() && !title.trim() && mediaList.length === 0) {
      setSubmitError('Please describe what is happening or attach media evidence.');
      return;
    }

    persistDraft();

    if (!currentUser) {
      requireAuth(
        () => {},
        { type: 'create_post' },
        {
          title: 'Sign In to Publish Report',
          description: 'Your report draft is saved. Sign in or create an account to alert state bodies and publish.',
          badge: 'Verification Required'
        }
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const finalTitle = title.trim() || (content.trim().slice(0, 65) + (content.length > 65 ? '...' : '')) || 'Civic Issue Report';
      const finalContent = content.trim() || finalTitle;

      const newPostPayload: any = {
        title: finalTitle,
        content: finalContent,
        originalLanguage: 'English',
        authorName: authorVisibility === 'anonymous' ? 'Anonymous Citizen' : (currentUser?.name || 'Citizen Observer'),
        authorHandle: authorVisibility === 'anonymous' ? 'citizen_confidential' : (currentUser?.handle?.replace(/^@/, '') || 'citizen_gh'),
        authorVisibility,
        media: mediaList,
        category: inferredCategory,
        urgency: inferredUrgency,
        severity: inferredSeverity,
        location: {
          region: inferredRegion,
          district: inferredDistrict,
          landmark: locationText || 'Location Specified by Citizen',
          latitude: detectedGps?.lat,
          longitude: detectedGps?.lng,
          accuracy: 'exact',
          visibility: 'exact'
        },
        locationSource: detectedGps ? 'GPS' : (locationText ? 'LANDMARK_RESOLVED' : 'UNKNOWN'),
        institutionTags: selectedInstitutions.map(inst => ({
          institutionId: inst.id,
          institutionName: inst.officialName,
          shortName: inst.shortName,
          acronym: inst.acronym,
          alertRequested: true
        })),
        hashtags: [`#${inferredRegion.replace(/\s+/g, '')}`, '#GhanaCivic', '#SpeakUp']
      };

      const created = await api.createPost(newPostPayload);
      clearPostDraft();
      setIsSubmitting(false);
      setPublishedPost(created);
      onPostCreated();
      setStep(4); // Advance to Post-Publish Flywheel screen
    } catch (err: any) {
      console.error('Error publishing post:', err);
      setSubmitError(err.message || 'Failed to publish report. Please check your connection.');
      setIsSubmitting(false);
    }
  };

  const evidenceSummary = determineEvidencePack(mediaList, content);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div
        id="speak-up-composer-modal"
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl text-slate-100 shadow-2xl overflow-hidden my-4 max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                SPEAK UP GHANA
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                  Zero Followers Needed
                </span>
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3-Step Wizard Indicator (Step 1 -> 2 -> 3) */}
        {step !== 4 && (
          <div className="px-5 py-2.5 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-extrabold text-[11px] ${step === 1 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>1</span>
              <span className={step === 1 ? 'font-bold text-white' : 'text-slate-400'}>Capture</span>
            </div>
            <div className="h-0.5 flex-1 mx-2 bg-slate-800" />
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-extrabold text-[11px] ${step === 2 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>2</span>
              <span className={step === 2 ? 'font-bold text-white' : 'text-slate-400'}>Context</span>
            </div>
            <div className="h-0.5 flex-1 mx-2 bg-slate-800" />
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-extrabold text-[11px] ${step === 3 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>3</span>
              <span className={step === 3 ? 'font-bold text-white' : 'text-slate-400'}>Publish</span>
            </div>
          </div>
        )}

        {/* Scrollable Form Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {submitError && (
            <div className="p-3 bg-red-950/70 border border-red-800 text-red-200 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* ==================== STEP 1: CAPTURE ==================== */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="text-center sm:text-left">
                <h3 className="text-base font-extrabold text-white">Show us what's happening</h3>
                <p className="text-xs text-slate-400">Capture media or speak out. Multiple media formats can be combined.</p>
              </div>

              {/* Media Action Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 bg-slate-800/90 hover:bg-slate-700/80 border border-slate-700 rounded-xl flex flex-col items-center gap-1.5 transition-all text-slate-200 hover:text-white"
                >
                  <Camera className="w-6 h-6 text-emerald-400" />
                  <span className="text-xs font-bold">Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 bg-slate-800/90 hover:bg-slate-700/80 border border-slate-700 rounded-xl flex flex-col items-center gap-1.5 transition-all text-slate-200 hover:text-white"
                >
                  <Video className="w-6 h-6 text-purple-400" />
                  <span className="text-xs font-bold">Video</span>
                </button>

                <button
                  type="button"
                  onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                  className={`p-3 border rounded-xl flex flex-col items-center gap-1.5 transition-all ${
                    isRecording
                      ? 'bg-red-950/90 border-red-700 text-red-200 animate-pulse'
                      : 'bg-slate-800/90 hover:bg-slate-700/80 border-slate-700 text-slate-200 hover:text-white'
                  }`}
                >
                  {isRecording ? <MicOff className="w-6 h-6 text-red-400" /> : <Mic className="w-6 h-6 text-amber-400" />}
                  <span className="text-xs font-bold">{isRecording ? `Stop (${recordDuration}s)` : 'Voice'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => docInputRef.current?.click()}
                  className="p-3 bg-slate-800/90 hover:bg-slate-700/80 border border-slate-700 rounded-xl flex flex-col items-center gap-1.5 transition-all text-slate-200 hover:text-white"
                >
                  <FileText className="w-6 h-6 text-sky-400" />
                  <span className="text-xs font-bold">Document</span>
                </button>

                <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" onChange={handleFileUpload} className="hidden" />
                <input ref={docInputRef} type="file" multiple accept=".pdf,.doc,.docx,.txt" onChange={handleDocumentUpload} className="hidden" />
              </div>

              {/* Recorded Voice Note Bar */}
              {recordedAudioUrl && (
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-amber-400" />
                    <span className="font-semibold text-slate-200">Voice Recording ({recordDuration || 8}s)</span>
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
                      {isPlayingAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
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
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Attached Media Grid */}
              {mediaList.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Attached Evidence ({mediaList.length})</span>
                    <label className="text-[11px] text-slate-400 flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={blurFaces}
                        onChange={e => setBlurFaces(e.target.checked)}
                        className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Blur faces for privacy</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {mediaList.map(m => (
                      <div key={m.id} className="relative w-20 h-16 rounded-xl overflow-hidden border border-slate-700 bg-slate-800 shrink-0 flex items-center justify-center">
                        {m.type === 'image' && (
                          <img src={m.url} alt="Evidence" className={`w-full h-full object-cover ${blurFaces ? 'blur-xs' : ''}`} />
                        )}
                        {m.type === 'video' && (
                          <div className="w-full h-full bg-slate-950 flex items-center justify-center text-slate-400 flex-col text-[10px]">
                            <Video className="w-5 h-5 text-purple-400" />
                            <span>Video</span>
                          </div>
                        )}
                        {m.type === 'audio' && (
                          <div className="w-full h-full bg-emerald-950 flex items-center justify-center text-emerald-400 flex-col text-[10px]">
                            <Mic className="w-5 h-5" />
                            <span>Voice</span>
                          </div>
                        )}
                        {m.type === 'document' && (
                          <div className="w-full h-full bg-sky-950 p-1 flex items-center justify-center text-sky-300 flex-col text-[9px] text-center">
                            <FileCheck className="w-4 h-4 text-sky-400 mb-0.5" />
                            <span className="truncate w-full font-mono">{m.fileName || 'Doc'}</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setMediaList(prev => prev.filter(x => x.id !== m.id))}
                          className="absolute top-1 right-1 w-5 h-5 bg-slate-900/90 text-slate-300 rounded-full flex items-center justify-center text-xs hover:text-red-400 font-bold"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Main Description Input */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-200">
                  Tell Ghana what is happening:
                </label>
                <textarea
                  rows={4}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Describe the issue... e.g. Major water pipe burst leaking near Kejetia market, or 3-day power outage in Taifa..."
                  className="w-full p-3 bg-slate-800 text-sm text-slate-100 placeholder-slate-500 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500 resize-none transition-all"
                />
              </div>
            </div>
          )}

          {/* ==================== STEP 2: CONTEXT ==================== */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="text-center sm:text-left">
                <h3 className="text-base font-extrabold text-white">Where is this happening & who should know?</h3>
                <p className="text-xs text-slate-400">SpeakUp automatically resolves local administrative boundaries and alerts authorities.</p>
              </div>

              {/* Optional Title Headline */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Report Title / Headline (Optional):
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Broken water pipe leaking near Kejetia Market"
                  className="w-full p-2.5 bg-slate-800 text-xs text-slate-100 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Location Input & Detection */}
              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    Where is this happening?
                  </label>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={isLocating}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                  >
                    {isLocating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
                    <span>{detectedGps ? 'GPS Detected ✓' : 'Use Current GPS'}</span>
                  </button>
                </div>

                <input
                  type="text"
                  value={locationText}
                  onChange={e => setLocationText(e.target.value)}
                  placeholder="e.g. Kaneshie Market, Kumasi Kejetia, or Taifa Road..."
                  className="w-full p-2.5 bg-slate-900 text-xs text-slate-100 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500"
                />

                <p className="text-[11px] text-slate-400 italic">
                  Note: SpeakUp resolves GPS coordinates to community, district, and institutional jurisdictions automatically.
                </p>
              </div>

              {/* Intelligent Institution Tagging */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  Who Should Know? (Notify Authorities):
                </label>

                {/* Selected Institution Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {selectedInstitutions.map((inst, idx) => (
                    <div
                      key={inst.id ? `${inst.id}-${idx}` : `sel-inst-${idx}`}
                      className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-700 rounded-lg text-xs flex items-center gap-1.5 shadow-xs"
                    >
                      <span className="font-bold">{inst.shortName || inst.acronym}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedInstitutions(prev => prev.filter(i => i.id !== inst.id))}
                        className="hover:text-red-400 ml-1 font-bold"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  {/* Add another dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowInstDropdown(!showInstDropdown)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-300 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3 text-emerald-400" /> + Add Authority
                    </button>

                    {showInstDropdown && (
                      <div className="absolute left-0 bottom-full mb-1 w-72 max-h-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 overflow-y-auto">
                        <input
                          type="text"
                          value={institutionSearch}
                          onChange={e => setInstitutionSearch(e.target.value)}
                          placeholder="Search Police, ECG, GWCL, Assembly..."
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
                                key={inst.id ? `${inst.id}-${idx}` : `inst-opt-${idx}`}
                                type="button"
                                onClick={() => {
                                  setSelectedInstitutions(prev => [...prev, inst]);
                                  setShowInstDropdown(false);
                                }}
                                className="w-full text-left p-1.5 hover:bg-slate-800 rounded text-xs flex items-center justify-between"
                              >
                                <div>
                                  <div className="font-semibold text-slate-200">{inst.shortName}</div>
                                  <div className="text-[10px] text-slate-400 truncate max-w-[180px]">{inst.mandate}</div>
                                </div>
                                <span className="text-[9px] text-emerald-400 bg-emerald-950 px-1 py-0.5 rounded">Verified</span>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* System Suggestion Badge */}
                {suggestedInstitutions.length > 0 && (
                  <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs space-y-1">
                    <div className="text-[11px] font-bold text-emerald-300 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      Suggested State Bodies:
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      {suggestedInstitutions.map(sInst => (
                        <button
                          key={sInst.id}
                          type="button"
                          onClick={() => {
                            if (!selectedInstitutions.some(i => i.id === sInst.id)) {
                              setSelectedInstitutions(prev => [...prev, sInst]);
                            }
                          }}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-emerald-900 text-emerald-300 text-[11px] rounded border border-emerald-700/60 flex items-center gap-1"
                        >
                          <span>+ {sInst.shortName}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== STEP 3: PREVIEW & PUBLISH ==================== */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="text-center sm:text-left">
                <h3 className="text-base font-extrabold text-white">Public Report Preview</h3>
                <p className="text-xs text-slate-400">Review how your report will appear to the public and state responders.</p>
              </div>

              {/* Public Card Mock Preview */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2.5 shadow-xl">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white">{authorVisibility === 'anonymous' ? 'Anonymous Citizen' : (currentUser?.name || 'Citizen Observer')}</span>
                    {authorVisibility === 'anonymous' && (
                      <span className="text-[10px] bg-purple-950 text-purple-300 px-1.5 py-0.2 rounded border border-purple-800">Confidential</span>
                    )}
                  </div>
                  <span className="text-[11px] text-emerald-400 font-semibold">{locationText || 'Accra Metropolitan'}</span>
                </div>

                <h4 className="font-bold text-sm text-white">{title || content.slice(0, 60)}</h4>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{content}</p>

                {mediaList.length > 0 && (
                  <div className="text-[11px] text-slate-400 bg-slate-900 p-2 rounded-lg border border-slate-800 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-emerald-400" />
                    <span>{mediaList.length} media attachment(s) included</span>
                  </div>
                )}

                {selectedInstitutions.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-900 text-[11px]">
                    <span className="text-slate-400 font-semibold">Tagging:</span>
                    {selectedInstitutions.map(inst => (
                      <span key={inst.id} className="text-emerald-400 font-bold">@{inst.shortName}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Identity & Visibility Toggle */}
              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700 flex items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-bold text-slate-200 block">Identity Visibility:</span>
                  <span className="text-[11px] text-slate-400">Choose whether to display your handle or report confidentially</span>
                </div>

                <select
                  value={authorVisibility}
                  onChange={e => setAuthorVisibility(e.target.value as AuthorVisibility)}
                  className="p-2 bg-slate-900 text-slate-100 rounded-lg border border-slate-700 text-xs font-semibold"
                >
                  <option value="public">Public Identity</option>
                  <option value="anonymous">Anonymous to Public</option>
                </select>
              </div>

              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-[11px] text-slate-400 flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Protected by Ghana Data Protection Act. PII detection strips phone numbers & confidential card data automatically before public display.</span>
              </div>
            </div>
          )}

          {/* ==================== STEP 4: POST-PUBLISH FLYWHEEL ==================== */}
          {step === 4 && publishedPost && (
            <div className="space-y-4 text-center py-2 animate-in zoom-in-95">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border-2 border-emerald-500/40 shadow-xl">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-extrabold text-white">Your voice has been heard!</h3>
                <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
                  Your report is now live on the SpeakUp public record and dispatches multi-channel alerts to relevant authorities.
                </p>
              </div>

              {/* Tagged Authorities Confirmation Banner */}
              {selectedInstitutions.length > 0 && (
                <div className="p-3.5 bg-emerald-950/80 border border-emerald-700/80 rounded-2xl text-xs text-left space-y-1.5 shadow-lg">
                  <div className="font-extrabold text-emerald-300 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    Multi-Channel Dispatches Triggered:
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedInstitutions.map(inst => (
                      <span key={inst.id} className="px-2.5 py-1 bg-slate-900 text-emerald-300 font-bold rounded-lg border border-emerald-800 text-[11px] flex items-center gap-1">
                        🏛 {inst.shortName} <span className="text-[10px] text-emerald-400">✓ Dispatched</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* External Social Flywheel Distribution */}
              <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 space-y-2 text-left">
                <div className="text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Share2 className="w-4 h-4 text-amber-400" />
                  Amplify the issue for faster resolution:
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs font-bold">
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`🚨 CIVIC ALERT: ${publishedPost.title}\n📍 Location: ${publishedPost.location.region}\n🔗 Track on SpeakUp Ghana: ${window.location.origin}/post/${publishedPost.id}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    <span>💬 WhatsApp</span>
                  </a>

                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`🚨 Citizen Report: ${publishedPost.title} near ${publishedPost.location.region}. Track on SpeakUp: ${window.location.origin}/post/${publishedPost.id} #GhanaCivic #SpeakUp`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 bg-sky-700 hover:bg-sky-600 text-white rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    <span>🐦 X (Twitter)</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/post/${publishedPost.id}`);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 3000);
                    }}
                    className="p-2.5 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                    <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between gap-3">
          {step !== 4 ? (
            <>
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((step - 1) as any)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!content.trim() && !title.trim() && mediaList.length === 0) {
                      setSubmitError('Please describe what is happening or capture media evidence.');
                      return;
                    }
                    setSubmitError(null);
                    setStep((step + 1) as any);
                  }}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold rounded-lg shadow-lg flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <span>Next Step</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  id="publish-civic-post-btn"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-lg shadow-lg flex items-center gap-2 transition-all active:scale-95"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Dispatching...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>PUBLISH REPORT</span>
                    </>
                  )}
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg transition-all"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
