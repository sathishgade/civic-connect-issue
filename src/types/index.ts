export type UserRole = 'citizen' | 'admin' | 'employee';

export type ComplaintStatus = 'pending' | 'in_progress' | 'resolved' | 'closed';

export type ComplaintCategory =
  | 'road'
  | 'garbage'
  | 'drainage'
  | 'water'
  | 'streetlight'
  | 'others';

export type ComplaintPriority = 'low' | 'medium' | 'high' | 'critical';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  language: 'en' | 'te';
  createdAt: Date;
}

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
  area?: string;
  city?: string;
  pincode?: string;
}

export interface Complaint {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  location: Location;
  images: string[];
  assignedTo?: string;
  qrCode?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  source?: 'form' | 'voice';
  verificationToken?: string;
  adminNote?: string;
  resolutionImage?: string | null;
}

export interface StatusLog {
  id: string;
  complaintId: string;
  status: ComplaintStatus;
  note?: string;
  updatedBy: string;
  createdAt: Date;
}

export interface CallRecord {
  id: string;
  userId: string;
  complaintId?: string;
  audioUrl: string;
  transcription: string;
  translatedText?: string;
  language: 'en' | 'te';
  duration: number;
  createdAt: Date;
}

export interface DashboardStats {
  totalComplaints: number;
  pendingComplaints: number;
  inProgressComplaints: number;
  resolvedComplaints: number;
  avgResolutionTime: number;
}

export const CATEGORY_LABELS: Record<ComplaintCategory, { en: string; te: string; icon: string }> = {
  road: { en: 'Road Issues', te: 'రోడ్డు సమస్యలు', icon: '🛣️' },
  garbage: { en: 'Garbage Collection', te: 'చెత్త సేకరణ', icon: '🗑️' },
  drainage: { en: 'Drainage Problems', te: 'డ్రైనేజీ సమస్యలు', icon: '🚰' },
  water: { en: 'Water Supply', te: 'నీటి సరఫరా', icon: '💧' },
  streetlight: { en: 'Street Lights', te: 'వీధి దీపాలు', icon: '💡' },
  others: { en: 'Other Issues', te: 'ఇతర సమస్యలు', icon: '📋' },
};

export const STATUS_LABELS: Record<ComplaintStatus, { en: string; te: string }> = {
  pending: { en: 'Pending', te: 'పెండింగ్' },
  in_progress: { en: 'In Progress', te: 'పురోగతిలో' },
  resolved: { en: 'Resolved', te: 'పరిష్కరించబడింది' },
  closed: { en: 'Closed', te: 'మూసివేయబడింది' },
};

export const PRIORITY_LABELS: Record<ComplaintPriority, { en: string; te: string }> = {
  low: { en: 'Low', te: 'తక్కువ' },
  medium: { en: 'Medium', te: 'మధ్యస్థం' },
  high: { en: 'High', te: 'ఎక్కువ' },
  critical: { en: 'Critical', te: 'క్రిటికల్' },
};
