const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://owlbzwsdcognrgolvnzg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93bGJ6d3NkY29nbnJnb2x2bnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5OTQ1NTMsImV4cCI6MjA5NTU3MDU1M30.R6-FUqubIr3uABzv1CS7jiS5cwygrNiIqk4oNbq7O44';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Checking user_roles...");
  const { data: roles, error: err1 } = await supabase.from('user_roles').select('*');
  console.log("Roles:", roles, err1);

  console.log("Checking profiles...");
  const { data: profiles, error: err2 } = await supabase.from('profiles').select('*');
  console.log("Profiles:", profiles, err2);

  console.log("Checking delivery_drivers...");
  const { data: drivers, error: err3 } = await supabase.from('delivery_drivers').select('*');
  console.log("Delivery Drivers:", drivers, err3);
}

check();
