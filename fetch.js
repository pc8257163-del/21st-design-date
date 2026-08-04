const fs = require('fs');
const path = require('path');
const axios = require('axios');

const DATA_DIR = './data';
const ITEMS_PER_PAGE = 500;

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function run() {
  console.log('Starting deep scrape for 21st.dev components...');
  let allItems = [];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Origin': 'https://21st.dev',
    'Referer': 'https://21st.dev/'
  };

  // Method 1: Fetching via search/components API with higher limit
  for (let page = 1; page <= 120; page++) {
    try {
      const response = await axios.get(`https://21st.dev/api/components?page=${page}&limit=100`, { headers, timeout: 8000 });
      const data = response.data;
      const items = Array.isArray(data) ? data : (data.components || data.data || []);

      if (!items || items.length === 0) break;

      const parsed = items.map((item, idx) => ({
        id: item.id || item.slug || `comp-${page}-${idx}`,
        title: item.title || item.name || 'Untitled Component',
        prompt: item.prompt || item.description || item.code || '',
        preview_image: item.preview_url || item.preview_image || item.image || '',
        video_preview: item.video_url || item.video || null,
        category: item.category || 'General'
      }));

      allItems.push(...parsed);
      console.log(`Page ${page}: Fetched ${parsed.length} real components.`);
    } catch (err) {
      console.log(`API Page ${page} bypass needed or completed.`);
      break;
    }
  }

  // Method 2: GitHub Open Registry Fallback if Cloudflare blocks HTTP requests
  if (allItems.length === 0) {
    try {
      const gitRes = await axios.get('https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/www/registry/registry-components.json', { timeout: 10000 });
      if (Array.isArray(gitRes.data)) {
        allItems = gitRes.data.map((item, idx) => ({
          id: item.name || `component-${idx}`,
          title: item.label || item.name,
          prompt: item.description || `Modern ${item.name} React UI component`,
          preview_image: item.preview || '',
          video_preview: null,
          category: item.type || 'UI'
        }));
      }
    } catch (e) {
      console.log('Fallback fetch skipped.');
    }
  }

  console.log(`Total Extracted Items: ${allItems.length}`);

  // Split into page chunks
  let pageIndex = 1;
  for (let i = 0; i < allItems.length; i += ITEMS_PER_PAGE) {
    const chunk = allItems.slice(i, i + ITEMS_PER_PAGE);
    fs.writeFileSync(
      path.join(DATA_DIR, `page-${pageIndex}.json`), 
      JSON.stringify(chunk, null, 2)
    );
    pageIndex++;
  }

  // Save index metadata
  fs.writeFileSync(
    path.join(DATA_DIR, 'index.json'), 
    JSON.stringify({ 
      total_items: allItems.length, 
      total_pages: Math.max(pageIndex - 1, 1),
      last_updated: new Date().toISOString()
    }, null, 2)
  );
}

run();
