import { createClient } from '@supabase/supabase-js'

// Debug: Check what environment variables are available
console.log('Available env vars:', {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_PUBLIC_SUPABASE_URL: import.meta.env.VITE_PUBLIC_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  VITE_PUBLIC_SUPABASE_ANON_KEY: import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY,
})

// Get Supabase credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 
                   import.meta.env.VITE_PUBLIC_SUPABASE_URL ||
                   import.meta.env.SUPABASE_URL ||
                   import.meta.env.PUBLIC_SUPABASE_URL

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 
                       import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY ||
                       import.meta.env.SUPABASE_ANON_KEY ||
                       import.meta.env.PUBLIC_SUPABASE_ANON_KEY

console.log('Supabase config:', { supabaseUrl, supabaseAnonKey: supabaseAnonKey ? '***' : 'missing' })

if (!supabaseUrl) {
  throw new Error('Missing Supabase URL. Please ensure your Supabase integration is properly connected in Lovable.')
}

if (!supabaseAnonKey) {
  throw new Error('Missing Supabase Anon Key. Please ensure your Supabase integration is properly connected in Lovable.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database tables
export interface User {
  id: string
  email: string
  role: 'admin' | 'editor' | 'submitter'
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export interface InventoryItem {
  sku: string
  name: string
  category: string | null
  qty_on_hand: number
  uom: string
  location: string | null
  unit_cost: number | null
  sell_price: number | null
  external_id: string | null
  notes: string | null
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
  updated_by?: string
  updated_by_email?: string
  approved_by?: string
  timestamp: string
  updated_at?: string
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