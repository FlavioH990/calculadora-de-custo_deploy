import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vyyzbxghpbexeubbghre.supabase.co' // substitua pela sua URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5eXpieGdocGJleGV1YmJnaHJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMTg4NjEsImV4cCI6MjA3MDU5NDg2MX0.QW7tqi7xf6YANyaSTTrqPZoiloWZXI_nwTdCn9sF_R0' // substitua pela sua anon key

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
