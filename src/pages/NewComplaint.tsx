import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CATEGORY_LABELS, ComplaintCategory, ComplaintPriority } from '@/types';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import {
  MapPin,
  Camera,
  Upload,
  X,
  Loader2,
  CheckCircle2,
  Navigation,
  FileText,
  Mic,
  ArrowLeft,
  Sparkles,
  Volume2
} from 'lucide-react';

export default function NewComplaint() {
  const { user, isAuthenticated } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '' as ComplaintCategory | '',
    priority: 'medium' as ComplaintPriority,
  });

  const [location, setLocation] = useState({
    latitude: 0,
    longitude: 0,
    address: '',
  });

  const [images, setImages] = useState<string[]>([]);

  const [mode, setMode] = useState<'selection' | 'form' | 'call'>('selection');
  const [formStage, setFormStage] = useState<'upload' | 'details'>('upload');
  const [isRecording, setIsRecording] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'te' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceSuccess, setVoiceSuccess] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);

  // ── Voice Assistant State Machine ──
  // Steps: 0=locating, 1=category, 2=title, 3=description, 4=priority, 'submitting'='submitting', 'done'='done'
  type VoiceStep = 0 | 1 | 2 | 3 | 4 | 'submitting' | 'done';
  const [voiceStep, setVoiceStep] = useState<VoiceStep>(0);
  const [voiceData, setVoiceData] = useState<{
    category: ComplaintCategory | '';
    title: string;
    description: string;
    priority: ComplaintPriority;
  }>({ category: '', title: '', description: '', priority: 'medium' });

  const [ttsState, setTtsState] = useState<'idle' | 'speaking' | 'listening' | 'processing'>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  // Refs to hold mutable values for event handlers
  const ttsStateRef = useRef(ttsState);
  const latestTranscriptRef = useRef('');
  // Always points to the latest handleVoiceAnswer — prevents stale closure in recognition handlers
  const handleVoiceAnswerRef = useRef<(answer: string) => Promise<void>>(async () => { });
  // Keep voiceStep and voiceData in refs so handleVoiceAnswer always reads current values
  const voiceStepRef = useRef<VoiceStep>(0);
  const voiceDataRef = useRef(voiceData);

  useEffect(() => {
    ttsStateRef.current = ttsState;
  }, [ttsState]);

  useEffect(() => {
    voiceStepRef.current = voiceStep;
  }, [voiceStep]);

  useEffect(() => {
    voiceDataRef.current = voiceData;
  }, [voiceData]);

  // Initialize Speech Recognition (Re-create only when language changes)
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) return;

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = selectedLanguage === 'te' ? 'te-IN' : 'en-US';

    recognition.onstart = () => {
      setTtsState('listening');
      setInterimTranscript('');
      latestTranscriptRef.current = '';
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      if (interim) {
        setInterimTranscript(interim);
        latestTranscriptRef.current = interim;
      }
      if (finalTranscript) {
        setInterimTranscript('');
        latestTranscriptRef.current = finalTranscript;
        handleVoiceAnswerRef.current(finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech Error:', event.error);
      if (ttsStateRef.current === 'listening') setTtsState('idle');
    };

    recognition.onend = () => {
      if (ttsStateRef.current === 'listening') setTtsState('idle');
    };

    recognitionRef.current = recognition;
    return () => { recognition.abort(); };
  }, [selectedLanguage]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const getCurrentLocation = () => {
    setIsGettingLocation(true);

    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        // Try to get address from coordinates (using a mock for demo)
        const address = `Lat: ${latitude.toFixed(4)}, Long: ${longitude.toFixed(4)}`;

        setLocation({
          latitude,
          longitude,
          address,
        });

        toast.success('Location captured successfully!');
        setIsGettingLocation(false);
      },
      (error) => {
        toast.error('Unable to get your location. Please enter manually.');
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.category) {
      toast.error('Please select a category');
      return;
    }

    if (!location.latitude && !location.address) {
      toast.error('Please provide location');
      return;
    }

    setIsLoading(true);

    try {
      const complaintData = {
        userId: user!.id,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        status: 'pending',
        priority: 'medium',
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address,
        },
        images: images,
        verificationToken: Math.random().toString(36).substring(2, 8).toUpperCase(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await addDoc(collection(db, 'complaints'), complaintData);

      toast.success('Complaint submitted successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error("Error adding document: ", error);
      toast.error('Failed to submit complaint. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to convert data URL to Blob
  const dataURLtoBlob = (dataurl: string) => {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const analyzeImageAndAutofill = async () => {
    if (images.length === 0) return;

    setIsAnalyzing(true);
    try {
      const blob = dataURLtoBlob(images[0]);
      const file = new File([blob], "image.jpg", { type: "image/jpeg" });

      const formDataUpload = new FormData();
      formDataUpload.append('image', file);

      // Try to hit the local backend first
      try {
        const response = await fetch('http://localhost:8000/api/v1/analyze-image', {
          method: 'POST',
          body: formDataUpload
        });

        if (response.ok) {
          const data = await response.json();
          setFormData(prev => ({
            ...prev,
            title: data.title,
            description: data.description,
            category: data.category as ComplaintCategory,
            priority: data.priority as ComplaintPriority
          }));
          toast.success("Form autofilled from image!");
          setFormStage('details');
        } else {
          throw new Error("Backend failed");
        }
      } catch (err) {
        console.warn("Backend unavailable, using mock AI", err);
        // Fallback simulation
        await new Promise(resolve => setTimeout(resolve, 2000));
        setFormData(prev => ({
          ...prev,
          title: "Garbage Pile on Street Corner",
          description: "Large pile of uncollected garbage blocking the pedestrian path. It appears to be decomposing.",
          category: 'garbage',
          priority: 'medium'
        }));
        toast.success("Autofilled (Simulation Mode)");
        setFormStage('details');
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to analyze image");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startListening = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.start(); } catch (e) { console.warn('Recognition already started'); }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setTimeout(() => {
        if (ttsStateRef.current === 'listening' && latestTranscriptRef.current) {
          handleVoiceAnswerRef.current(latestTranscriptRef.current);
        }
      }, 500);
    }
  };

  // Load voices
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  const speak = (text: string, onEnd?: () => void) => {
    setTtsState('speaking');
    if (!text) { if (onEnd) onEnd(); return; }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selectedLanguage === 'te' ? 'te-IN' : 'en-US';
    if (voices.length > 0) {
      const voice = voices.find(v => v.lang.includes(selectedLanguage === 'te' ? 'te' : 'en'));
      if (voice) utterance.voice = voice;
      else if (selectedLanguage === 'te') toast.info('Telugu voice not found on this device. Using default.');
    }
    utterance.onend = () => { if (onEnd) onEnd(); else setTtsState('idle'); };
    utterance.onerror = (e) => { console.error('TTS Error:', e); if (onEnd) onEnd(); };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  // ── Step prompts ──
  const STEP_PROMPTS: Record<number, { en: string; te: string }> = {
    1: {
      en: 'What type of issue is it? Say Road, Garbage, Drainage, Water, Streetlight, or Other.',
      te: 'సమస్య రకం ఏమిటి? రోడ్డు, చెత్త, డ్రైనేజి, నీళ్ళు, వీధి దీపాలు, లేదా ఇతర అని చెప్పండి.',
    },
    2: {
      en: 'Please give a short title for the complaint.',
      te: 'ఫిర్యాదుకు ఒక చిన్న శీర్షిక చెప్పండి.',
    },
    3: {
      en: 'Now describe the issue in more detail.',
      te: 'ఇప్పుడు సమస్యను వివరంగా వివరించండి.',
    },
    4: {
      en: 'How urgent is it? Say Low, Medium, High, or Critical.',
      te: 'ఇది ఎంత అర్జెంట్? తక్కువ, మధ్యస్థం, ఎక్కువ, లేదా క్రిటికల్ అని చెప్పండి.',
    },
  };

  const parseCategory = (text: string): ComplaintCategory | null => {
    const t = text.toLowerCase();
    if (t.includes('road') || t.includes('రోడ్డు')) return 'road';
    if (t.includes('garbage') || t.includes('waste') || t.includes('trash') || t.includes('చెత్త')) return 'garbage';
    if (t.includes('drain') || t.includes('sewage') || t.includes('డ్రైనేజి')) return 'drainage';
    if (t.includes('water') || t.includes('నీళ్ళు') || t.includes('నీరు')) return 'water';
    if (t.includes('light') || t.includes('lamp') || t.includes('దీపాలు') || t.includes('లైట్')) return 'streetlight';
    if (t.includes('other') || t.includes('ఇతర')) return 'others';
    return null;
  };

  const parsePriority = (text: string): ComplaintPriority => {
    const t = text.toLowerCase();
    if (t.includes('critical') || t.includes('క్రిటికల్')) return 'critical';
    if (t.includes('high') || t.includes('urgent') || t.includes('ఎక్కువ')) return 'high';
    if (t.includes('low') || t.includes('తక్కువ')) return 'low';
    return 'medium';
  };

  // ── Step prompt helper ──
  const askStep = (step: VoiceStep, lang: 'en' | 'te') => {
    const prompt = STEP_PROMPTS[step as number];
    if (!prompt) return;
    speak(prompt[lang], () => { setTtsState('listening'); startListening(); });
  };

  // ── Init assistant ──
  const initAssistant = (lang: 'en' | 'te') => {
    setVoiceStep(0);
    setVoiceData({ category: '', title: '', description: '', priority: 'medium' });
    setTranscript('');
    setTtsState('processing');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const addressStr = `Lat: ${latitude.toFixed(4)}, Long: ${longitude.toFixed(4)}`;
        setLocation({ latitude, longitude, address: addressStr });
        setVoiceStep(1);

        const greeting = lang === 'en'
          ? "Hello! I'm your assistant. Your location has been captured. Let's file a complaint together."
          : "నమస్కారం! నేను మీ సహాయకుడిని. మీ స్థానం నమోదు చేయబడింది. కలిసి ఫిర్యాదు చేద్దాం.";

        speak(greeting, () => askStep(1, lang));
      },
      () => {
        toast.error('Location access is required for Voice Assistant.');
        setMode('selection');
      }
    );
  };

  // ── Handle each spoken answer ──
  const handleVoiceAnswer = async (answer: string) => {
    setTtsState('processing');
    setTranscript(answer);
    const lang = selectedLanguage || 'en';
    // Read current step and data from refs (avoids stale closure)
    const currentStep = voiceStepRef.current;
    const currentData = voiceDataRef.current;

    if (currentStep === 1) {
      // Category
      const cat = parseCategory(answer);
      if (!cat) {
        const retry = lang === 'en'
          ? "Sorry, I didn't catch that. Please say Road, Garbage, Drainage, Water, Streetlight, or Other."
          : 'క్షమించండి, నాకు అర్థం కాలేదు. రోడ్డు, చెత్త, డ్రైనేజి, నీళ్ళు, వీధి దీపాలు, లేదా ఇతర అని చెప్పండి.';
        speak(retry, () => { setTtsState('listening'); startListening(); });
        return;
      }
      setVoiceData(prev => ({ ...prev, category: cat }));
      setVoiceStep(2);
      askStep(2, lang);

    } else if (currentStep === 2) {
      // Title
      const title = answer.trim();
      setVoiceData(prev => ({ ...prev, title }));
      setVoiceStep(3);
      askStep(3, lang);

    } else if (currentStep === 3) {
      // Description
      const description = answer.trim();
      setVoiceData(prev => ({ ...prev, description }));
      setVoiceStep(4);
      askStep(4, lang);

    } else if (currentStep === 4) {
      // Priority → then submit
      const priority = parsePriority(answer);
      // Build finalData from the ref to avoid stale voiceData
      const finalData = { ...currentData, priority };
      setVoiceData(finalData);
      setVoiceStep('submitting');

      const confirmMsg = lang === 'en'
        ? 'Got it! Filing your complaint now.'
        : 'సరే! ఇప్పుడు మీ ఫిర్యాదు నమోదు చేస్తున్నాను.';

      speak(confirmMsg, async () => {
        try {
          await addDoc(collection(db, 'complaints'), {
            userId: user!.id,
            title: finalData.title || 'Voice Report',
            description: finalData.description || 'Reported via Voice Assistant',
            category: finalData.category || 'others',
            status: 'pending',
            priority: finalData.priority,
            location: {
              latitude: location.latitude,
              longitude: location.longitude,
              address: location.address,
            },
            images: [],
            verificationToken: Math.random().toString(36).substring(2, 8).toUpperCase(),
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });
          setVoiceStep('done');
          toast.success('Complaint submitted successfully!');
          setTimeout(() => navigate('/dashboard'), 3000);
        } catch (err) {
          console.error(err);
          toast.error('Failed to submit complaint. Please try again.');
          setVoiceStep(4);
          setTtsState('idle');
        }
      });
    }
  };
  // Keep the ref current so recognition handlers always call the latest version
  handleVoiceAnswerRef.current = handleVoiceAnswer;

  if (!user) return null;

  return (
    <Layout>
      <div className="container-civic py-8 max-w-2xl">
        {mode === 'selection' && (
          <div className="space-y-8 animate-slide-up">
            <div className="text-center">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {t('nav.newComplaint')}
              </h1>
              <p className="text-muted-foreground mt-2">
                Choose how you want to report the issue
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => setMode('form')}
                className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group"
              >
                <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Fill Form</h3>
                <p className="text-sm text-muted-foreground text-center mt-2">
                  Enter details, upload photos, and set location manually
                </p>
              </button>

              <button
                onClick={() => {
                  setMode('call');
                  setSelectedLanguage(null); // Reset language selection
                }}
                className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group"
              >
                <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Mic className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Voice Call</h3>
                <p className="text-sm text-muted-foreground text-center mt-2">
                  Speak to our AI Assistant to report instantly
                </p>
              </button>
            </div>
          </div>
        )}

        {mode === 'call' && (
          <div className="flex flex-col items-center justify-center min-h-[500px] animate-fade-in max-w-md mx-auto text-center">

            {!selectedLanguage ? (
              <div className="w-full space-y-8 animate-slide-up">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Select Language</h2>
                  <p className="text-muted-foreground mt-2">భాషను ఎంచుకోండి</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <button
                    onClick={() => { setSelectedLanguage('en'); initAssistant('en'); }}
                    className="p-6 rounded-2xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-between group"
                  >
                    <span className="text-xl font-semibold">English</span>
                    <div className="h-8 w-8 rounded-full border-2 border-primary/30 group-hover:bg-primary group-hover:border-primary transition-colors" />
                  </button>

                  <button
                    onClick={() => { setSelectedLanguage('te'); initAssistant('te'); }}
                    className="p-6 rounded-2xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-between group"
                  >
                    <span className="text-xl font-semibold">తెలుగు</span>
                    <div className="h-8 w-8 rounded-full border-2 border-primary/30 group-hover:bg-primary group-hover:border-primary transition-colors" />
                  </button>
                </div>

                <Button variant="ghost" onClick={() => setMode('selection')}>
                  Cancel
                </Button>
              </div>
            ) : (
              <>
                {/* Step progress pills */}
                {voiceStep !== 'done' && voiceStep !== 'submitting' && (
                  <div className="flex gap-2 mb-6">
                    {['Category', 'Title', 'Description', 'Priority'].map((label, i) => {
                      const step = i + 1;
                      const done = typeof voiceStep === 'number' && voiceStep > step;
                      const active = voiceStep === step;
                      return (
                        <div key={label} className={`flex-1 text-xs py-1 rounded-full font-medium transition-colors ${done ? 'bg-green-500 text-white' : active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                          }`}>
                          {done ? '✓' : label}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Locating */}
                {voiceStep === 0 && (
                  <div className="space-y-6 animate-pulse">
                    <MapPin className="h-16 w-16 text-primary mx-auto" />
                    <div>
                      <h2 className="text-2xl font-bold">
                        {selectedLanguage === 'te' ? 'మీ స్థానాన్ని గుర్తిస్తున్నాము...' : 'Locating You...'}
                      </h2>
                      <p className="text-muted-foreground">
                        {selectedLanguage === 'te' ? 'దయచేసి లొకేషన్ యాక్సెస్ ఇవ్వండి' : 'Please allow location access'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Speaking */}
                {ttsState === 'speaking' && voiceStep !== 'done' && (
                  <div className="space-y-8 animate-fade-in">
                    <div className="h-32 w-32 bg-primary/10 rounded-full flex items-center justify-center mx-auto animate-pulse">
                      <Volume2 className="h-16 w-16 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold">
                      {selectedLanguage === 'te' ? 'సహాయకుడు మాట్లాడుతున్నారు...' : 'Assistant Speaking...'}
                    </h2>
                  </div>
                )}

                {/* Listening / idle */}
                {(ttsState === 'listening' || ttsState === 'idle') && voiceStep !== 0 && voiceStep !== 'done' && voiceStep !== 'submitting' && (
                  <div className="space-y-8 animate-fade-in">
                    <div className="relative h-40 w-40 mx-auto cursor-pointer" onClick={startListening}>
                      <div className={`absolute inset-0 rounded-full ${ttsState === 'listening' ? 'bg-red-500/20 animate-ping' : ''}`} />
                      <div className="relative h-40 w-40 bg-red-500 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 transition-transform">
                        <Mic className="h-20 w-20" />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">
                        {ttsState === 'listening'
                          ? (selectedLanguage === 'te' ? 'నేను వింటున్నాను...' : "I'm Listening...")
                          : (selectedLanguage === 'te' ? 'మాట్లాడటానికి నొక్కండి' : 'Tap to speak')}
                      </h2>
                      {transcript && (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                          "{transcript}"
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Processing */}
                {ttsState === 'processing' && voiceStep !== 'done' && (
                  <div className="space-y-6 animate-fade-in">
                    <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto" />
                    <h2 className="text-2xl font-bold">
                      {selectedLanguage === 'te' ? 'పరిశీలిస్తున్నాను...' : 'Processing...'}
                    </h2>
                  </div>
                )}

                {/* Submitting */}
                {voiceStep === 'submitting' && (
                  <div className="space-y-6 animate-fade-in">
                    <Loader2 className="h-16 w-16 text-green-500 animate-spin mx-auto" />
                    <h2 className="text-2xl font-bold">
                      {selectedLanguage === 'te' ? 'ఫిర్యాదు నమోదు చేస్తున్నాను...' : 'Filing your complaint...'}
                    </h2>
                  </div>
                )}

                {/* Done / Success */}
                {voiceStep === 'done' && (
                  <div className="space-y-6 animate-scale-in">
                    <CheckCircle2 className="h-24 w-24 text-green-500 mx-auto" />
                    <h2 className="text-3xl font-bold text-foreground">
                      {selectedLanguage === 'te' ? 'ఫిర్యాదు స్వీకరించబడింది!' : 'Complaint Filed!'}
                    </h2>
                    <p className="text-lg text-muted-foreground">
                      {selectedLanguage === 'te' ? 'డాష్‌బోర్డ్‌కు మళ్లిస్తున్నాము...' : 'Redirecting to dashboard...'}
                    </p>
                  </div>
                )}

                {/* Collected fields summary */}
                {typeof voiceStep === 'number' && voiceStep > 1 && voiceStep !== 0 && (
                  <div className="mt-8 w-full max-w-lg bg-card border rounded-xl p-4 text-left space-y-2 shadow-inner">
                    <p className="text-xs font-bold uppercase text-muted-foreground mb-2">
                      {selectedLanguage === 'te' ? 'సేకరించిన వివరాలు' : 'Collected so far'}
                    </p>
                    {voiceData.category && (
                      <div className="flex gap-2 text-sm"><span className="font-medium">Category:</span><span className="text-primary capitalize">{voiceData.category}</span></div>
                    )}
                    {voiceData.title && (
                      <div className="flex gap-2 text-sm"><span className="font-medium">Title:</span><span>{voiceData.title}</span></div>
                    )}
                    {voiceData.description && (
                      <div className="flex gap-2 text-sm"><span className="font-medium">Description:</span><span className="truncate">{voiceData.description}</span></div>
                    )}
                  </div>
                )}

                {/* Live interim */}
                {interimTranscript && (
                  <div className="mt-4 w-full max-w-lg text-right animate-pulse">
                    <div className="inline-block px-4 py-2 rounded-lg bg-secondary/70 border border-primary/20 text-sm italic">
                      {interimTranscript}
                    </div>
                  </div>
                )}

                {/* Stop & Send button */}
                {ttsState === 'listening' && (
                  <div className="mt-4 animate-fade-in">
                    <Button
                      variant="destructive"
                      size="lg"
                      className="rounded-full px-8 shadow-lg hover:scale-105 transition-transform"
                      onClick={stopListening}
                    >
                      {selectedLanguage === 'te' ? 'ఆపు / పంపించు' : 'Stop & Send'}
                      <div className="ml-2 w-3 h-3 bg-white rounded-full animate-pulse" />
                    </Button>
                  </div>
                )}

                <div className="mt-8">
                  <Button variant="ghost" onClick={() => { window.speechSynthesis.cancel(); setMode('selection'); }}>
                    Cancel Call
                  </Button>
                </div>
              </>
            )}
          </div>
        )}


        {mode === 'form' && (
          <div>
            {formStage === 'upload' && (
              <div className="animate-fade-in space-y-6">
                <Button
                  variant="ghost"
                  className="pl-0 gap-2 hover:bg-transparent"
                  onClick={() => setMode('selection')}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Selection
                </Button>

                <div className="text-center mb-8">
                  <h1 className="text-2xl font-bold text-foreground">Upload Photo First</h1>
                  <p className="text-muted-foreground mt-2">
                    Upload a photo to automatically fill the complaint details
                  </p>
                </div>

                <div className="card-civic p-8 text-center space-y-6">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                  />

                  <div className="flex flex-col md:flex-row gap-4 justify-center">
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-32 w-full md:w-32 flex-col gap-3 rounded-2xl"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-8 w-8 text-primary" />
                      <span>Upload</span>
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-32 w-full md:w-32 flex-col gap-3 rounded-2xl"
                      onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.setAttribute('capture', 'environment');
                          fileInputRef.current.click();
                          fileInputRef.current.removeAttribute('capture');
                        }
                      }}
                    >
                      <Camera className="h-8 w-8 text-primary" />
                      <span>Camera</span>
                    </Button>
                  </div>

                  {images.length > 0 && (
                    <div className="animate-in fade-in zoom-in duration-300">
                      <div className="flex justify-center gap-4 mb-6">
                        {images.map((image, index) => (
                          <div key={index} className="relative h-20 w-20">
                            <img src={image} className="h-full w-full object-cover rounded-lg border" />
                            <button
                              onClick={() => removeImage(index)}
                              className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <Button
                        type="button"
                        variant="civic-accent"
                        size="lg"
                        className="w-full max-w-sm gap-2"
                        onClick={analyzeImageAndAutofill}
                        disabled={isAnalyzing}
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Analyzing Image...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            Auto-fill details from image
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-background px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <div className="text-center">
                  <Button
                    variant="outline"
                    onClick={() => setFormStage('details')}
                  >
                    Skip & Fill Manually
                  </Button>
                </div>
              </div>
            )}

            {formStage === 'details' && (
              <div className="animate-slide-up">
                <Button
                  variant="ghost"
                  className="mb-4 pl-0 gap-2 hover:bg-transparent"
                  onClick={() => setFormStage('upload')}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Upload
                </Button>

                <div className="mb-8">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                    {t('nav.newComplaint')}
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Review and complete the details below
                  </p>
                </div>

                <div className="card-civic">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="category">{t('complaint.category')} *</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value: ComplaintCategory) =>
                          setFormData(prev => ({ ...prev, category: value }))
                        }
                      >
                        <SelectTrigger className="input-civic">
                          <SelectValue placeholder="Select issue category" />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(CATEGORY_LABELS) as ComplaintCategory[]).map((key) => (
                            <SelectItem key={key} value={key}>
                              <span className="flex items-center gap-2">
                                <span>{CATEGORY_LABELS[key].icon}</span>
                                <span>{CATEGORY_LABELS[key][language]}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="title">{t('complaint.title')} *</Label>
                      <Input
                        id="title"
                        placeholder="Brief title of the issue"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="input-civic"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">{t('complaint.description')} *</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe the issue in detail..."
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="input-civic min-h-[120px]"
                        required
                      />
                    </div>

                    <div className="space-y-3">
                      <Label>{t('complaint.location')} *</Label>

                      <Button
                        type="button"
                        variant="civic-outline"
                        className="w-full justify-center gap-2"
                        onClick={getCurrentLocation}
                        disabled={isGettingLocation}
                      >
                        {isGettingLocation ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Getting location...
                          </>
                        ) : location.latitude ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-accent" />
                            Location captured
                          </>
                        ) : (
                          <>
                            <Navigation className="h-4 w-4" />
                            Get Current Location
                          </>
                        )}
                      </Button>

                      {location.latitude !== 0 && (
                        <div className="p-3 rounded-lg bg-secondary/50 text-sm">
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-primary mt-0.5" />
                            <div>
                              <p className="font-medium text-foreground">Location captured</p>
                              <p className="text-muted-foreground">{location.address}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="bg-card px-3 text-muted-foreground">or enter manually</span>
                        </div>
                      </div>

                      <Input
                        placeholder="Enter address manually"
                        value={location.address}
                        onChange={(e) => setLocation(prev => ({ ...prev, address: e.target.value }))}
                        className="input-civic"
                      />
                    </div>

                    <Button
                      type="submit"
                      variant="civic"
                      size="lg"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        t('complaint.submit')
                      )}
                    </Button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
