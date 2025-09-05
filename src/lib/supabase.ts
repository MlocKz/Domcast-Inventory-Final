import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database tables
export interface User {
  id: string
  email: string
  role: 'admin' | 'editor' | 'submitter'
  created_at: string
}

export interface InventoryItem {
  id: string
  item_no: string
  description: string
  quantity: number
  created_at: string
  updated_at: string
}

export interface ShipmentItem {
  itemNo: string
  description: string
  quantity: number
}

export interface Shipment {
  id: string
  shipment_id: string
  type: 'incoming' | 'outgoing'
  items: ShipmentItem[]
  user_id: string
  user_email: string
  approved_by?: string
  timestamp: string
}

export interface ShipmentRequest {
  id: string
  shipment_id: string
  type: 'incoming' | 'outgoing'
  items: ShipmentItem[]
  status: 'pending' | 'approved' | 'rejected'
  requestor_id: string
  requestor_email: string
  requested_at: string
}