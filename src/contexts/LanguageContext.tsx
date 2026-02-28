import React, { createContext, useContext, useState, useCallback } from 'react';

type Language = 'en' | 'te';

interface Translations {
  [key: string]: {
    en: string;
    te: string;
  };
}

const translations: Translations = {
  // Navigation
  'nav.home': { en: 'Home', te: 'హోమ్' },
  'nav.dashboard': { en: 'Dashboard', te: 'డాష్‌బోర్డ్' },
  'nav.complaints': { en: 'Complaints', te: 'ఫిర్యాదులు' },
  'nav.newComplaint': { en: 'New Complaint', te: 'కొత్త ఫిర్యాదు' },
  'nav.login': { en: 'Login', te: 'లాగిన్' },
  'nav.register': { en: 'Register', te: 'నమోదు' },
  'nav.logout': { en: 'Logout', te: 'లాగ్ అవుట్' },
  'nav.voiceCall': { en: 'Voice Call', te: 'వాయిస్ కాల్' },

  // Landing Page
  'landing.title': { en: 'Smart Civic Issue Reporting', te: 'స్మార్ట్ సివిక్ సమస్య నివేదన' },
  'landing.subtitle': { en: 'Report local issues easily. Get them resolved faster.', te: 'స్థానిక సమస్యలను సులభంగా నివేదించండి. వాటిని వేగంగా పరిష్కరించండి.' },
  'landing.cta': { en: 'Report an Issue', te: 'సమస్యను నివేదించండి' },
  'landing.features': { en: 'Features', te: 'ఫీచర్లు' },
  'landing.howItWorks': { en: 'How It Works', te: 'ఇది ఎలా పనిచేస్తుంది' },

  // Auth
  'auth.email': { en: 'Email Address', te: 'ఇమెయిల్ చిరునామా' },
  'auth.password': { en: 'Password', te: 'పాస్‌వర్డ్' },
  'auth.name': { en: 'Full Name', te: 'పూర్తి పేరు' },
  'auth.phone': { en: 'Phone Number', te: 'ఫోన్ నంబర్' },
  'auth.loginBtn': { en: 'Sign In', te: 'సైన్ ఇన్' },
  'auth.registerBtn': { en: 'Create Account', te: 'ఖాతా సృష్టించు' },
  'auth.noAccount': { en: "Don't have an account?", te: 'ఖాతా లేదా?' },
  'auth.hasAccount': { en: 'Already have an account?', te: 'ఇప్పటికే ఖాతా ఉందా?' },

  // Complaints
  'complaint.title': { en: 'Issue Title', te: 'సమస్య శీర్షిక' },
  'complaint.description': { en: 'Description', te: 'వివరణ' },
  'complaint.category': { en: 'Category', te: 'వర్గం' },
  'complaint.location': { en: 'Location', te: 'స్థానం' },
  'complaint.images': { en: 'Images', te: 'చిత్రాలు' },
  'complaint.uploadImage': { en: 'Upload Image', te: 'చిత్రం అప్‌లోడ్ చేయండి' },
  'complaint.submit': { en: 'Submit Complaint', te: 'ఫిర్యాదు సమర్పించండి' },
  'complaint.track': { en: 'Track Status', te: 'స్థితిని ట్రాక్ చేయండి' },

  // Dashboard
  'dashboard.welcome': { en: 'Welcome', te: 'స్వాగతం' },
  'dashboard.totalComplaints': { en: 'Total Complaints', te: 'మొత్తం ఫిర్యాదులు' },
  'dashboard.pending': { en: 'Pending', te: 'పెండింగ్' },
  'dashboard.inProgress': { en: 'In Progress', te: 'పురోగతిలో' },
  'dashboard.resolved': { en: 'Resolved', te: 'పరిష్కరించబడింది' },
  'dashboard.recentComplaints': { en: 'Recent Complaints', te: 'ఇటీవలి ఫిర్యాదులు' },

  // Common
  'common.loading': { en: 'Loading...', te: 'లోడ్ అవుతోంది...' },
  'common.error': { en: 'An error occurred', te: 'లోపం సంభవించింది' },
  'common.success': { en: 'Success!', te: 'విజయం!' },
  'common.cancel': { en: 'Cancel', te: 'రద్దు' },
  'common.save': { en: 'Save', te: 'సేవ్' },
  'common.delete': { en: 'Delete', te: 'తొలగించు' },
  'common.edit': { en: 'Edit', te: 'సవరించు' },
  'common.view': { en: 'View', te: 'చూడండి' },
  'common.search': { en: 'Search', te: 'వెతకండి' },
  'common.filter': { en: 'Filter', te: 'ఫిల్టర్' },

  // Features
  'feature.form.title': { en: 'Easy Form', te: 'సులభ ఫారం' },
  'feature.form.desc': { en: 'Fill a simple form to report issues', te: 'సమస్యలను నివేదించడానికి సులభమైన ఫారం నింపండి' },
  'feature.chatbot.title': { en: 'AI Chatbot', te: 'AI చాట్‌బాట్' },
  'feature.chatbot.desc': { en: 'Chat with our AI to report issues', te: 'సమస్యలను నివేదించడానికి మా AIతో చాట్ చేయండి' },
  'feature.image.title': { en: 'Image Upload', te: 'చిత్రం అప్‌లోడ్' },
  'feature.image.desc': { en: 'Upload a photo and AI detects the issue', te: 'ఫోటో అప్‌లోడ్ చేయండి మరియు AI సమస్యను గుర్తిస్తుంది' },
  'feature.voice.title': { en: 'Voice Assistant', te: 'వాయిస్ అసిస్టెంట్' },
  'feature.voice.desc': { en: 'Report issues by speaking', te: 'మాట్లాడటం ద్వారా సమస్యలను నివేదించండి' },
  'feature.track.title': { en: 'Track Progress', te: 'పురోగతిని ట్రాక్ చేయండి' },
  'feature.track.desc': { en: 'Monitor your complaint status in real-time', te: 'మీ ఫిర్యాదు స్థితిని రియల్-టైమ్‌లో పర్యవేక్షించండి' },
  'feature.qr.title': { en: 'QR Verification', te: 'QR ధృవీకరణ' },
  'feature.qr.desc': { en: 'Verify resolution with QR code', te: 'QR కోడ్‌తో పరిష్కారాన్ని ధృవీకరించండి' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = useCallback((key: string): string => {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Missing translation for key: ${key}`);
      return key;
    }
    return translation[language];
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
