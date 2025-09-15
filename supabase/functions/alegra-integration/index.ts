import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Get Alegra credentials from Supabase secrets
const alegraApiToken = Deno.env.get('ALEGRA_API_TOKEN');
const alegraEmail = Deno.env.get('ALEGRA_EMAIL');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user has appropriate role (admin/operator)
    const { data: userRole, error: roleError } = await supabase
      .rpc('get_my_role');

    if (roleError || !['admin', 'operator'].includes(userRole)) {
      throw new Error('Insufficient permissions');
    }

    if (!alegraApiToken || !alegraEmail) {
      throw new Error('Alegra credentials not configured');
    }

    const { action, data } = await req.json();

    console.log(`Processing Alegra ${action} request for user ${user.id}`);

    let response;
    const alegraAuth = btoa(`${alegraEmail}:${alegraApiToken}`);

    switch (action) {
      case 'sync_sales': {
        // Sync sales data from Alegra
        response = await fetch('https://app.alegra.com/api/v1/invoices', {
          headers: {
            'Authorization': `Basic ${alegraAuth}`,
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Alegra API error: ${response.statusText}`);
        }

        const salesData = await response.json();
        
        // Process and store sales data securely
        for (const invoice of salesData) {
          // Transform Alegra invoice data to our schema
          const salesRecord = {
            external_id: invoice.id.toString(),
            source: 'alegra',
            order_number: invoice.numberTemplate,
            invoice_number: invoice.number,
            customer_name: invoice.client?.name,
            sale_date: invoice.date,
            total: parseFloat(invoice.total || '0'),
            tax: parseFloat(invoice.totalTax || '0'),
            // Add other relevant fields
          };

          // Insert using admin privileges (service role)
          await supabase
            .from('sales_data')
            .upsert(salesRecord, { onConflict: 'external_id,source' });
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: `Synced ${salesData.length} sales records`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create_purchase_order': {
        // Create purchase order in Alegra
        const poData = {
          client: data.supplier_id,
          items: data.items.map((item: { item_id: string; quantity: number; unit_price: number; notes?: string }) => ({
            id: item.item_id,
            quantity: item.quantity,
            price: item.unit_price,
            description: item.notes || ''
          })),
          observations: data.notes || '',
          date: data.order_date || new Date().toISOString().split('T')[0]
        };

        response = await fetch('https://app.alegra.com/api/v1/purchase-orders', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${alegraAuth}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(poData)
        });

        if (!response.ok) {
          throw new Error(`Failed to create purchase order: ${response.statusText}`);
        }

        const createdPO = await response.json();

        return new Response(
          JSON.stringify({
            success: true,
            alegra_id: createdPO.id,
            message: 'Purchase order created successfully'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Error in alegra-integration function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});