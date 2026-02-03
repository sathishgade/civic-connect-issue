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

  // Conversational Assistant State
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [assistantState, setAssistantState] = useState<'idle' | 'locating' | 'speaking' | 'listening' | 'processing' | 'success'>('idle');
  const [interimTranscript, setInterimTranscript] = useState(''); // New state for live text
  const recognitionRef = useRef<any>(null);

  // Refs to hold mutable values for event handlers
  const assistantStateRef = useRef(assistantState);
  const latestTranscriptRef = useRef(''); // Holds the accumulating transcript for the current session

  // Update refs when state changes
  useEffect(() => {
    assistantStateRef.current = assistantState;
  }, [assistantState]);

  // Initialize Speech Recognition (Re-create only when language changes)
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) return;

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = false; // We want single turns
    recognition.interimResults = true;
    recognition.lang = selectedLanguage === 'te' ? 'te-IN' : 'en-US';

    recognition.onstart = () => {
      setAssistantState('listening');
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
        // Verify if we should update latestTranscriptRef here? 
        // Usually final is what counts, but for manual stop we might want interim.
        latestTranscriptRef.current = interim;
      }

      if (finalTranscript) {
        console.log("User said (Final):", finalTranscript);
        setInterimTranscript('');
        latestTranscriptRef.current = finalTranscript; // Update to final
        // Trigger turn complete
        handleUserTurn(finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech Error:", event.error);
      if (event.error === 'no-speech') {
        if (assistantStateRef.current === 'listening') {
          setAssistantState('idle');
        }
      } else {
        setAssistantState('idle');
        // optional: toast.error("Could not hear you.");
      }
    };

    recognition.onend = () => {
      // If we simply stopped but state thinks we are listening, go idle
      if (assistantStateRef.current === 'listening') {
        setAssistantState('idle');
      }
    };

    recognitionRef.current = recognition;

    // Cleanup: Abort if component unmounts or language changes
    return () => {
      recognition.abort();
    };
  }, [selectedLanguage]); // Only re-init if language changes

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
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn("Recognition already started");
      }
    }
  };

  const stopListening = () => {
    // Manual stop by user
    if (recognitionRef.current) {
      recognitionRef.current.stop();

      // Force send whatever we have if it didn't finalize automatically
      // We give a small buffer for the 'onresult' final event to fire naturally.
      // If it doesn't fire in 500ms, we force send the interim.
      setTimeout(() => {
        if (assistantStateRef.current === 'listening' && latestTranscriptRef.current) {
          console.log("Manual Send (Interim):", latestTranscriptRef.current);
          handleUserTurn(latestTranscriptRef.current);
        }
      }, 500);
    }
  };

  // Load voices
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  const speak = (text: string, onEnd?: () => void) => {
    setAssistantState('speaking');

    // Safety check for empty text
    if (!text) {
      if (onEnd) onEnd();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const targetLang = selectedLanguage === 'te' ? 'te-IN' : 'en-US';
    utterance.lang = targetLang;

    // Try to find a specific voice
    if (voices.length > 0) {
      const voice = voices.find(v => v.lang.includes(selectedLanguage === 'te' ? 'te' : 'en'));
      if (voice) {
        utterance.voice = voice;
      } else if (selectedLanguage === 'te') {
        // Fallback warning if Telugu voice missing
        toast.info("Telugu voice not found on this device. Using default.");
      }
    }

    utterance.onend = () => {
      if (onEnd) onEnd();
      else setAssistantState('idle');
    };

    utterance.onerror = (e) => {
      console.error("TTS Error:", e);
      if (onEnd) onEnd();
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const initAssistant = async (lang: 'en' | 'te') => {
    setAssistantState('locating');

    // Get Location First
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const addressStr = `Lat: ${latitude.toFixed(4)}, Long: ${longitude.toFixed(4)}`;
        setLocation({ latitude, longitude, address: addressStr });

        // Initial Greeting
        const greeting = lang === 'en'
          ? "Hello, I am your assistant. I have located you. Please tell me, what is the issue?"
          : "నమస్కారం, నేను మీ సహాయకుడిని. మీ స్థానం తీసుకోబడింది. దయచేసి చెప్పండి, సమస్య ఏమిటి?";

        setConversationHistory([]);

        speak(greeting, () => {
          setAssistantState('listening');
          startListening();
        });
      },
      (error) => {
        toast.error("Location access is required for Voice Assistant.");
        setMode('selection');
      }
    );
  };

  const handleUserTurn = async (userText: string) => {
    setAssistantState('processing');

    const newHistory = [...conversationHistory, { role: "user", content: userText }];
    setConversationHistory(newHistory);

    try {
      // Call Backend
      const response = await fetch('http://localhost:8000/api/v1/chat/complaint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: newHistory,
          location_context: location.address,
          language: selectedLanguage
        })
      });

      if (!response.ok) throw new Error("Assistant API Failed");

      const data = await response.json();
      const assistantText = data.response_text;

      setConversationHistory(prev => [...prev, { role: "assistant", content: assistantText }]);

      if (data.is_complete && data.extracted_data) {
        setAssistantState('success');
        // Auto-fill form and show success or review
        setFormData({
          title: data.extracted_data.title || "Voice Report",
          description: data.extracted_data.description || "Reported via Voice Assistant",
          category: (data.extracted_data.category as ComplaintCategory) || "others",
          priority: (data.extracted_data.priority as ComplaintPriority) || "medium"
        });

        speak(assistantText, () => {
          setVoiceSuccess(true);
          // Navigate to dashboard after short delay
          setTimeout(() => navigate('/dashboard'), 4000);
        });
      } else {
        // Continue Loop
        speak(assistantText, () => {
          setAssistantState('listening');
          startListening();
        });
      }

    } catch (error) {
      console.error(error);
      toast.error("Assistant disconnected.");
      setAssistantState('idle');
    }
  };

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
                    onClick={() => {
                      setSelectedLanguage('en');
                      initAssistant('en');
                    }}
                    className="p-6 rounded-2xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-between group"
                  >
                    <span className="text-xl font-semibold">English</span>
                    <div className="h-8 w-8 rounded-full border-2 border-primary/30 group-hover:bg-primary group-hover:border-primary transition-colors" />
                  </button>

                  <button
                    onClick={() => {
                      setSelectedLanguage('te');
                      initAssistant('te');
                    }}
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
                {assistantState === 'locating' && (
                  <div className="space-y-6 animate-pulse">
                    <MapPin className="h-16 w-16 text-primary mx-auto" />
                    <div>
                      <h2 className="text-2xl font-bold">
                        {selectedLanguage === 'te' ? "మీ స్థానాన్ని గుర్తిస్తున్నాము..." : "Locating You..."}
                      </h2>
                      <p className="text-muted-foreground">
                        {selectedLanguage === 'te' ? "దయచేసి లొకేషన్ యాక్సెస్ ఇవ్వండి" : "Please allow location access"}
                      </p>
                    </div>
                  </div>
                )}

                {assistantState === 'speaking' && (
                  <div className="space-y-8 animate-fade-in">
                    <div className="h-32 w-32 bg-primary/10 rounded-full flex items-center justify-center mx-auto animate-pulse">
                      <Volume2 className="h-16 w-16 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold">
                      {selectedLanguage === 'te' ? "సహాయకుడు మాట్లాడుతున్నారు..." : "Assistant Speaking..."}
                    </h2>
                  </div>
                )}

                {(assistantState === 'listening' || assistantState === 'idle') && (
                  <div className="space-y-8 animate-fade-in">
                    <div className="relative h-40 w-40 mx-auto cursor-pointer" onClick={startListening}>
                      <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" />
                      <div className="relative h-40 w-40 bg-red-500 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 transition-transform">
                        <Mic className="h-20 w-20" />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">
                        {selectedLanguage === 'te' ? "నేను వింటున్నాను..." : "I'm Listening..."}
                      </h2>
                      <p className="text-muted-foreground">
                        {selectedLanguage === 'te' ? "మాట్లాడటానికి మళ్ళీ నొక్కండి" : "Tap to speak again if needed"}
                      </p>
                    </div>
                  </div>
                )}

                {assistantState === 'processing' && (
                  <div className="space-y-6 animate-fade-in">
                    <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto" />
                    <h2 className="text-2xl font-bold">
                      {selectedLanguage === 'te' ? "పరిశీలిస్తున్నాను..." : "Thinking..."}
                    </h2>
                  </div>
                )}

                {assistantState === 'success' && (
                  <div className="space-y-6 animate-scale-in">
                    <CheckCircle2 className="h-24 w-24 text-green-500 mx-auto" />
                    <h2 className="text-3xl font-bold text-foreground">
                      {selectedLanguage === 'te' ? "ఫిర్యాదు స్వీకరించబడింది!" : "Report Filed!"}
                    </h2>
                    <p className="text-lg text-muted-foreground">
                      {selectedLanguage === 'te' ? "డాష్‌బోర్డ్‌కు మళ్లిస్తున్నాము..." : "Redirecting to dashboard..."}
                    </p>
                  </div>
                )}

                {/* Conversation History */}
                <div className="mt-12 w-full max-w-lg bg-card border rounded-xl p-4 max-h-48 overflow-y-auto shadow-inner text-left">
                  {conversationHistory.length === 0 && !interimTranscript ? (
                    <p className="text-center text-muted-foreground italic">Conversation will appear here...</p>
                  ) : (
                    <>
                      {conversationHistory.map((msg, i) => (
                        <div key={i} className={`mb-3 ${msg.role === 'assistant' ? 'text-blue-600' : 'text-foreground text-right'}`}>
                          <span className="text-xs font-bold uppercase block mb-1 opacity-50">{msg.role === 'assistant' ? 'AI Assistant' : 'You'}</span>
                          <div className={`inline-block px-4 py-2 rounded-lg ${msg.role === 'assistant' ? 'bg-blue-50' : 'bg-secondary'}`}>
                            {msg.content}
                          </div>
                        </div>
                      ))}

                      {/* Live Interim Transcript Bubble */}
                      {interimTranscript && (
                        <div className="mb-3 text-foreground text-right animate-pulse">
                          <span className="text-xs font-bold uppercase block mb-1 opacity-50">You (Speaking...)</span>
                          <div className="inline-block px-4 py-2 rounded-lg bg-secondary/70 border border-primary/20">
                            {interimTranscript}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {(assistantState === 'listening') && (
                  <div className="mt-4 animate-fade-in">
                    <Button
                      variant="destructive"
                      size="lg"
                      className="rounded-full px-8 shadow-lg hover:scale-105 transition-transform"
                      onClick={stopListening}
                    >
                      {selectedLanguage === 'te' ? "ఆపు / పంపించు" : "Stop & Send"}
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
