const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return 'http://localhost:4200';
};

const baseUrl = getBaseUrl();

export const environment = {
  production: baseUrl.includes('vercel.app'),

  supabaseUrl: 'https://guulgzvlcdssyaqfvyyv.supabase.co',

  supabaseAnonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1dWxnenZsY2Rzc3lhcWZ2eXl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MTYyMzMsImV4cCI6MjA4ODE5MjIzM30.xx1_9LfwufTSedHXRBBsuzY3oA-IW6nkcxgr_5_7MZ4',

  apiUrl: baseUrl,

  frontendUrl: baseUrl,
};
