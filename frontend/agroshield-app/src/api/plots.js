const API_BASE = "https://urchin-app-86rjy.ondigitalocean.app/api/advanced-growth";

export async function fetchUserPlots(userId) {
  try {
    console.log(`Fetching plots for user: ${userId}`);
    console.log(`URL: ${API_BASE}/plots/user/${userId}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const res = await fetch(`${API_BASE}/plots/user/${userId}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    console.log(`Response status: ${res.status}`);
    
    if (!res.ok) {
      console.error(`Failed to fetch plots: ${res.status} ${res.statusText}`);
      return { success: false, plots: [] };
    }
    
    const data = await res.json();
    console.log(`Plots data:`, data);
    
    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Request timeout after 5 seconds');
      return { success: false, plots: [], error: 'Request timeout' };
    }
    console.error('Error fetching plots:', error);
    return { success: false, plots: [], error: error.message };
  }
}
