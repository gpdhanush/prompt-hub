export type Asset = {
  id: number;
  asset_code?: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  status?: string;
  category_id?: number;
  category_name?: string;
  assigned_to?: number;
  assigned_to_name?: string;
  purchase_date?: string;
  warranty_expiry?: string;
  created_at?: string;
  updated_at?: string;
};

export const formatDate = (dateString?: string): string => {
  if (!dateString) return "Not set";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
};

export const formatFullDate = (dateString?: string): string => {
  if (!dateString) return "Not set";
  return new Date(dateString).toLocaleDateString("en-US", { 
    year: "numeric",
    month: "long", 
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

import { CheckCircle, User, Clock, AlertCircle, XCircle, Package, LucideIcon } from "lucide-react";

export const getStatusIcon = (status: string): LucideIcon => {
  switch (status) {
    case 'available':
      return CheckCircle;
    case 'assigned':
      return User;
    case 'repair':
      return Clock;
    case 'damaged':
      return AlertCircle;
    case 'retired':
      return XCircle;
    default:
      return Package;
  }
};

export const getStatusVariant = (status: string): 'success' | 'info' | 'warning' | 'error' | 'neutral' => {
  switch (status) {
    case 'available':
      return 'success';
    case 'assigned':
      return 'info';
    case 'repair':
      return 'warning';
    case 'damaged':
    case 'retired':
      return 'error';
    default:
      return 'neutral';
  }
};

