import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zligropbztzslnbyvtdu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsaWdyb3BienR6c2xuYnl2dGR1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzI1MDE3MiwiZXhwIjoyMTAyODI2MTcyfQ.igsa7OyvRMHeFKTArlogBPbHrmqBUIni460DAhoiw4A';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: orders, error } = await supabase.from('orders').select('*');
  if (error) {
    console.error('Error fetching orders:', error);
    return;
  }
  console.log('Total orders:', orders.length);
  orders.forEach(o => {
    console.log(`Order ID: ${o.id}, User ID: ${o.user_id}, Status: ${o.status}`);
  });
  
  const { data: profiles } = await supabase.from('profiles').select('*');
  console.log('Total profiles:', profiles?.length);
  profiles?.forEach(p => {
    console.log(`Profile ID: ${p.id}, Email: ${p.email}, Role: ${p.role}`);
  });
}

check();
