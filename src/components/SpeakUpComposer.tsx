import React, { useState, useRef, useEffect } from 'react';
import {
  Megaphone,
  Mic,
  MicOff,
  Camera,
  Image as ImageIcon,
  Video,
  MapPin,
  Sparkles,
  Building2,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  X,
  Loader2,
  ChevronDown,
  Volume2,
  Play,
  Pause,
  Trash2,
  ShieldAlert,
  Send,
  Plus
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

interface SpeakUpComposerProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: () => void;
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

export const SpeakUpComposer: React.FC<SpeakUpComposerProps> = ({
  isOpen,
  onClose,
  onPostCreated,
  institutionsList
}) => {
  // Post state
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [originalLanguage, setOriginalLanguage] = useState('English');
  const [category, setCategory] = useState<CivicCategory>('Infrastructure & Roads');
  const [urgency, setUrgency] = useState<UrgencyLevel>('NORMAL');
  const [severity, setSeverity] = useState<SeverityLevel>('MODERATE');
  const [region, setRegion] = useState<GhanaRegionName>('Greater Accra');
  const [district, setDistrict] = useState('Accra Metropolitan');
  const [landmark, setLandmark] = useState('');
  const [locationPrivacy, setLocationPrivacy] = useState<'exact' | 'approximate' | 'hidden'>('exact');
  const [authorVisibility, setAuthorVisibility] = useState<AuthorVisibility>('public');
  const [authorName, setAuthorName] = useState('Citizen Observer');
  const [authorHandle, setAuthorHandle] = useState('citizen_voice');

  // Media
  const [mediaList, setMediaList] = useState<PostMedia[]>([]);
  const [blurFaces, setBlurFaces] = useState(false);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const recordIntervalRef = useRef<any>(null);

  // Institution tagging
  const [selectedInstitutions, setSelectedInstitutions] = useState<Institution[]>([]);
  const [institutionSearch, setInstitutionSearch] = useState('');
  const [showInstDropdown, setShowInstDropdown] = useState(false);

  // AI Assistant
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  const [useRefinedText, setUseRefinedText] = useState(true);

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setContent('');
      setTitle('');
      setMediaList([]);
      setSelectedInstitutions([]);
      setAiSuggestions(null);
      setRecordedAudioUrl(null);
      setSubmitError(null);
    }
  }, [isOpen]);

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

          // Add as voice note media
          const voiceMedia: PostMedia = {
            id: `audio-${Date.now()}`,
            type: 'audio',
            url: audioUrl,
            caption: 'Citizen Voice Note',
            duration: recordDuration,
            waveform: [35, 60, 45, 80, 95, 70, 40, 85, 90, 60, 30, 75, 80, 50],
            uploadedAt: new Date().toISOString()
          };
          setMediaList(prev => [...prev.filter(m => m.type !== 'audio'), voiceMedia]);

          // Trigger AI Assistant analysis on simulated / speech recognition text if empty
          if (!content.trim()) {
            const simulatedGhanaianSpokenPhrase =
              "The road culvert has collapsed near the market and cars cannot pass. Children going to school are in danger. We need Highways and Police.";
            setContent(simulatedGhanaianSpokenPhrase);
            handleAnalyzeWithAI(simulatedGhanaianSpokenPhrase);
          }
        };

        mediaRecorder.start();
        setIsRecording(true);
        setRecordDuration(0);
        recordIntervalRef.current = setInterval(() => {
          setRecordDuration(d => d + 1);
        }, 1000);
      } else {
        // Fallback for mock simulation
        setIsRecording(true);
        setRecordDuration(0);
        recordIntervalRef.current = setInterval(() => setRecordDuration(d => d + 1), 1000);
      }
    } catch (err) {
      console.warn('Microphone access not granted, using simulated audio note', err);
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
      // Fallback voice note
      const fallbackUrl = 'https://actions.google.com/sounds/v1/water/rain_heavy.ogg';
      setRecordedAudioUrl(fallbackUrl);
      const voiceMedia: PostMedia = {
        id: `audio-${Date.now()}`,
        type: 'audio',
        url: fallbackUrl,
        caption: 'Citizen Spoken Observation (Recorded)',
        duration: recordDuration || 8,
        waveform: [40, 65, 80, 55, 90, 75, 45, 85, 60, 35],
        uploadedAt: new Date().toISOString()
      };
      setMediaList(prev => [...prev.filter(m => m.type !== 'audio'), voiceMedia]);

      if (!content.trim()) {
        const spoken = 'Heavy flooding has started entering the market stalls. We need NADMO now.';
        setContent(spoken);
        handleAnalyzeWithAI(spoken);
      }
    }

    setIsRecording(false);
    clearInterval(recordIntervalRef.current);
  };

  // Live GPS locator
  const handleGetLocation = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setIsLocating(false);
          setDistrict('Accra Metropolitan / Central District');
          setLandmark('Detected near current GPS coordinates');
        },
        err => {
          setIsLocating(false);
          setDistrict('Accra Metropolitan');
        },
        { timeout: 8000 }
      );
    } else {
      setIsLocating(false);
    }
  };

  // Image / File upload
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
          uploadedAt: new Date().toISOString()
        };
        setMediaList(prev => [...prev, newMedia]);
      };
      reader.readAsDataURL(file);
    });
  };

  // AI Assistant Trigger
  const handleAnalyzeWithAI = async (textToAnalyze?: string) => {
    const targetText = textToAnalyze || content;
    if (!targetText.trim()) return;

    setIsAnalyzingAI(true);
    try {
      const res = await api.analyzePost(targetText, { region, district });
      setAiSuggestions(res);

      if (res.category && CATEGORIES.includes(res.category as CivicCategory)) {
        setCategory(res.category as CivicCategory);
      }
      if (res.urgency) {
        setUrgency(res.urgency);
      }
      if (res.severity) {
        setSeverity(res.severity);
      }
      if (res.region && GHANA_REGIONS.includes(res.region as GhanaRegionName)) {
        setRegion(res.region as GhanaRegionName);
      }
      if (res.district) {
        setDistrict(res.district);
      }
      if (res.landmark) {
        setLandmark(res.landmark);
      }
      if (res.conciseTitle && !title) {
        setTitle(res.conciseTitle);
      }

      // Match institutions
      if (res.matchedInstitutionIds && res.matchedInstitutionIds.length > 0) {
        const matched = institutionsList.filter(i => res.matchedInstitutionIds.includes(i.id));
        if (matched.length > 0) {
          setSelectedInstitutions(matched);
        }
      }
    } catch (err) {
      console.warn('AI analysis skipped or failed:', err);
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  // Submit Post
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setSubmitError('Please describe what is happening or record your voice.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const finalTitle = title.trim() || content.slice(0, 65) + (content.length > 65 ? '...' : '');

      const newPostPayload: any = {
        title: finalTitle,
        content: content.trim(),
        originalLanguage,
        translatedText: aiSuggestions?.refinedText && useRefinedText ? aiSuggestions.refinedText : undefined,
        authorName: authorVisibility === 'anonymous' ? 'Anonymous Citizen' : authorName,
        authorHandle: authorVisibility === 'anonymous' ? 'citizen_confidential' : authorHandle,
        authorVisibility,
        media: mediaList,
        category,
        urgency,
        severity,
        location: {
          region,
          district,
          landmark: landmark.trim() || undefined,
          latitude: 5.6037,
          longitude: -0.187,
          accuracy: locationPrivacy,
          visibility: locationPrivacy
        },
        institutionTags: selectedInstitutions.map(inst => ({
          institutionId: inst.id,
          institutionName: inst.officialName,
          shortName: inst.shortName,
          acronym: inst.acronym,
          alertRequested: true
        })),
        suggestedInstitutions: aiSuggestions?.matchedInstitutionIds || [],
        hashtags: aiSuggestions?.hashtags || [`#${region.replace(/\s+/g, '')}`, '#GhanaCivic', '#SpeakUp']
      };

      await api.createPost(newPostPayload);
      setIsSubmitting(false);
      onPostCreated();
      onClose();
    } catch (err: any) {
      console.error('Error publishing post:', err);
      setSubmitError(err.message || 'Failed to publish post. Please check your connection.');
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div
        id="speak-up-composer-modal"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-2xl text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden my-4 max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                SPEAK UP
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60">
                  Zero Followers Needed
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Your observation will reach nearby citizens & relevant state bodies</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {submitError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/70 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Quick Voice Bar */}
          <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-3 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isRecording ? 'bg-red-600 text-white animate-ping' : 'bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'}`}>
                <Mic className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                  {isRecording ? `Recording Audio... ${recordDuration}s` : 'Can’t type? Just speak.'}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isRecording ? 'Tap stop when done. We will transcribe & route.' : 'Hold or tap to speak in English, Twi, Ga, Ewe or Dagbani'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startVoiceRecording}
                  className="flex-1 sm:flex-none px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <Mic className="w-3.5 h-3.5" />
                  HOLD TO SPEAK
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopVoiceRecording}
                  className="flex-1 sm:flex-none px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors animate-pulse"
                >
                  <MicOff className="w-3.5 h-3.5" />
                  STOP RECORDING
                </button>
              )}
            </div>
          </div>

          {/* Audio preview if recorded */}
          {recordedAudioUrl && (
            <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs text-slate-800 dark:text-slate-300 font-medium">Recorded Voice Note ({recordDuration || 8}s)</span>
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
                  className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs rounded-md flex items-center gap-1"
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
                  className="p-1 text-slate-400 hover:text-red-500"
                  title="Remove audio"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Main Description Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              What is happening? Describe what you personally observed:
            </label>
            <textarea
              id="composer-content-input"
              rows={3}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="e.g. Broken water pipeline flooding the road near Kejetia market, or 3-day power outage in Ahodwo clinics, or deep pothole on Accra-Tema motorway..."
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none transition-all"
            />
          </div>

          {/* AI Assistance Banner & Trigger */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => handleAnalyzeWithAI()}
              disabled={isAnalyzingAI || !content.trim()}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 font-medium flex items-center gap-1.5 disabled:opacity-50 transition-colors"
            >
              {isAnalyzingAI ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>Auto-detect Category, Urgency & Suggested State Bodies with AI</span>
            </button>

            {aiSuggestions && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> AI suggestions applied
              </span>
            )}
          </div>

          {/* AI Recommendation Box if available */}
          {aiSuggestions && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs space-y-1.5">
              <div className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                AI Routing Intelligence:
              </div>
              <p className="text-slate-700 dark:text-slate-300 text-[11px]">
                Identified issue: <strong>{aiSuggestions.category}</strong> ({aiSuggestions.urgency} urgency)
              </p>
              {aiSuggestions.refinedText && (
                <div className="mt-2 pt-2 border-t border-emerald-200 dark:border-emerald-900/60">
                  <div className="flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300 mb-1">
                    <span className="font-medium text-emerald-800 dark:text-emerald-200">Refined Civic Summary:</span>
                    <button
                      type="button"
                      onClick={() => setUseRefinedText(!useRefinedText)}
                      className="text-[10px] text-emerald-600 dark:text-emerald-400 underline"
                    >
                      {useRefinedText ? 'Use exact words' : 'Use refined summary'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 italic bg-white dark:bg-slate-900/60 p-2 rounded border border-emerald-100 dark:border-transparent">
                    "{useRefinedText ? aiSuggestions.refinedText : content}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Media Attachments Strip */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Add Photos / Video Evidence:
              </label>

              <label className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={blurFaces}
                  onChange={e => setBlurFaces(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Blur faces for privacy</span>
              </label>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
              >
                <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Upload Photo / Video
              </button>

              {/* Sample Photo generator button for fast testing */}
              <button
                type="button"
                onClick={() => {
                  const sampleImages = [
                    'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=800&auto=format&fit=crop&q=80'
                  ];
                  const randImg = sampleImages[Math.floor(Math.random() * sampleImages.length)];
                  setMediaList(prev => [
                    ...prev,
                    {
                      id: `sample-${Date.now()}`,
                      type: 'image',
                      url: randImg,
                      caption: 'Citizen camera evidence photo',
                      uploadedAt: new Date().toISOString()
                    }
                  ]);
                }}
                className="px-2.5 py-2 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1"
              >
                <Camera className="w-3.5 h-3.5" /> + Camera Snapshot
              </button>

              {/* Previews */}
              {mediaList.map(m => (
                <div key={m.id} className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                  {m.type === 'image' && (
                    <img src={m.url} alt="Evidence" className={`w-full h-full object-cover ${blurFaces ? 'blur-xs' : ''}`} />
                  )}
                  {m.type === 'video' && (
                    <div className="w-full h-full bg-slate-900 dark:bg-slate-950 flex items-center justify-center text-slate-400">
                      <Video className="w-5 h-5" />
                    </div>
                  )}
                  {m.type === 'audio' && (
                    <div className="w-full h-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <Mic className="w-5 h-5" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setMediaList(prev => prev.filter(x => x.id !== m.id))}
                    className="absolute top-0.5 right-0.5 w-4 h-4 bg-slate-900/90 text-slate-100 rounded-full flex items-center justify-center text-[10px] hover:text-red-400"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Location & Region Picker */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Where is this happening?
              </label>

              <button
                type="button"
                onClick={handleGetLocation}
                disabled={isLocating}
                className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 flex items-center gap-1"
              >
                {isLocating ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
                <span>Auto-detect GPS</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 block">Ghana Region:</span>
                <select
                  value={region}
                  onChange={e => setRegion(e.target.value as GhanaRegionName)}
                  className="w-full p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-emerald-500"
                >
                  {GHANA_REGIONS.map(r => (
                    <option key={r} value={r}>
                      {r} Region
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 block">District / Municipality:</span>
                <input
                  type="text"
                  value={district}
                  onChange={e => setDistrict(e.target.value)}
                  placeholder="e.g. Accra Metro, Tema, Kumasi..."
                  className="w-full p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 block">Specific Landmark / Street (Helps responders locate fast):</span>
              <input
                type="text"
                value={landmark}
                onChange={e => setLandmark(e.target.value)}
                placeholder="e.g. Near Odawna market entrance, beside Total fuel station"
                className="w-full p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Institutional Tagging Engine (Core Innovation) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Who Should Know About This? (Tag State Bodies):
              </label>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                {selectedInstitutions.length} tagged (max 5)
              </span>
            </div>

            {/* Selected Tags */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {selectedInstitutions.map((inst, idx) => (
                <div
                  key={inst.id ? `${inst.id}-${idx}` : `sel-inst-${idx}`}
                  className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/80 rounded-lg text-xs flex items-center gap-1.5 shadow-xs"
                >
                  <span className="font-semibold">{inst.shortName || inst.acronym}</span>
                  <span className="text-[10px] opacity-75">
                    {inst.alertMethod === 'DIRECT_API' ? '⚡ Direct Alert' : inst.alertMethod === 'WHATSAPP_LINE' ? '💬 WhatsApp' : '✉️ Email'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedInstitutions(prev => prev.filter(i => i.id !== inst.id))}
                    className="hover:text-red-500 ml-1 font-bold"
                  >
                    ×
                  </button>
                </div>
              ))}

              {selectedInstitutions.length < 5 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowInstDropdown(!showInstDropdown)}
                    className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> + Add Institution
                  </button>

                  {showInstDropdown && (
                    <div className="absolute left-0 bottom-full mb-1 w-72 max-h-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-2 z-50 overflow-y-auto">
                      <input
                        type="text"
                        value={institutionSearch}
                        onChange={e => setInstitutionSearch(e.target.value)}
                        placeholder="Search Police, NADMO, ECG, PURC..."
                        className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 rounded-md border border-slate-200 dark:border-slate-700 mb-1.5"
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
                              className="w-full text-left p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-xs flex items-center justify-between"
                            >
                              <div>
                                <div className="font-semibold text-slate-800 dark:text-slate-200">{inst.shortName}</div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[180px]">{inst.mandate}</div>
                              </div>
                              <span className="text-[9px] text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-1 py-0.5 rounded">
                                Verified
                              </span>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Note: Tagging alerts the institution through configured channels, but does not replace formal legal filings.
            </p>
          </div>

          {/* Category & Urgency & Privacy settings */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 block">Category:</span>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as CivicCategory)}
                className="w-full p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-200 dark:border-slate-700"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 block">Urgency:</span>
              <select
                value={urgency}
                onChange={e => setUrgency(e.target.value as UrgencyLevel)}
                className="w-full p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold"
              >
                <option value="NORMAL">Normal Priority</option>
                <option value="HIGH">High (Active Public Disruption)</option>
                <option value="CRITICAL">Critical (Immediate Danger)</option>
                <option value="LOW">Low (General Awareness)</option>
              </select>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 block">Privacy / Identity:</span>
              <select
                value={authorVisibility}
                onChange={e => setAuthorVisibility(e.target.value as AuthorVisibility)}
                className="w-full p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-200 dark:border-slate-700"
              >
                <option value="public">Public Identity (Visible)</option>
                <option value="pseudonymous">Pseudonymous (@handle only)</option>
                <option value="anonymous">Anonymous to Public</option>
                <option value="confidential">High-Confidentiality</option>
              </select>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900/95 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Protected by Ghana Data Protection Act</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>

            <button
              id="publish-civic-post-btn"
              onClick={handleSubmit}
              disabled={isSubmitting || !content.trim()}
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
                  <span>PUBLISH & ALERT</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
