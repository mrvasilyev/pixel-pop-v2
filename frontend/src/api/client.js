const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Mock Telegram initData for dev if missing
const getTelegramInitData = () => {
  if (window.Telegram?.WebApp?.initData) {
    return window.Telegram.WebApp.initData;
  }
  // Mock for Dev (matches dummy validation if token is missing/mocked)
  return "query_id=mock&user=%7B%22id%22%3A51576055%2C%22first_name%22%3A%22Dev%22%7D&auth_date=1&hash=mock";
};

let accessToken = null;

export async function login() {
  if (accessToken) return accessToken;
  
  const initData = getTelegramInitData();
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData })
  });

  if (!res.ok) throw new Error('Login failed');
  const data = await res.json();
  accessToken = data.access_token;
  return accessToken;
}

export const generateImage = async (prompt, styleId, slug, extraConfig = {}) => {
  try {
    const token = await login();
    
    // 1. Enqueue Job
    const res = await fetch('/api/generation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        prompt: prompt,
        slug: slug, // Pass slug for DB tracking
        model_config: {
          model: 'gpt-image-1.5',
          quality: 'standard', // Was 'high' ($0.17). 'standard' is ~$0.04. Use 'low' for ~$0.009.
          size: '1024x1024',
          style_id: styleId,
          ...extraConfig
        }
      })
    });

    if (!res.ok) {
      if (res.status === 401) {
          accessToken = null; // Retry login next time
          throw new Error("Unauthorized - Session Expired");
      }
      throw new Error(`Generation failed: ${await res.text()}`);
    }

    const { job_id } = await res.json();
    console.log(`Job Enqueued: ${job_id}`);

    // 2. Poll for Status
    let attempts = 0;
    while (attempts < 60) { // Timeout after 60s
      attempts++;
      await delay(1000); // Wait 1s
      
      const statusRes = await fetch(`/api/generation/${job_id}`, {
         headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!statusRes.ok) continue;
      
      const job = await statusRes.json();
      console.log(`Job Status: ${job.status}`);
      
      if (job.status === 'COMPLETED') {
        // Return full structure as expected by Gallery
        return { 
            image_url: job.result.image_url, 
            metadata: { model: 'gpt-image-1.5' }
        };
      }
      if (job.status === 'FAILED') {
        throw new Error(job.error || 'Job failed processing');
      }
    }
    throw new Error("Generation timed out");

  } catch (error) {
    console.error('Error in generateImage:', error);
    throw error;
  }
};

// 3. Upload Image
export const uploadImage = async (file) => {
    try {
        const token = await login();
        const formData = new FormData();
        formData.append('file', file);
        
        const res = await fetch('/api/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
                // Content-Type is auto-set by browser for FormData
            },
            body: formData
        });

        if (!res.ok) throw new Error(`Upload failed: ${await res.text()}`);
        const data = await res.json();
        return data.url;
    } catch (error) {
        console.error("Error in uploadImage:", error);
        throw error;
    }
};

// 4. Fetch History
export const fetchGenerations = async () => {
    try {
        const token = await login();
        const res = await fetch('/api/generations', {
             headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error('Failed to fetch history');
        return await res.json();
    } catch (error) {
        console.error("Fetch history failed:", error);
        return [];
    }
};
