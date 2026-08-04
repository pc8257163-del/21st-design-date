const fs = require('fs');
const path = require('path');
const axios = require('axios');

const DATA_DIR = './data';
const ITEMS_PER_PAGE = 500;

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function run() {
  let allItems = [];
  let page = 1;
  let hasMore = true;

  console.log('Fetching data from source...');

  // Standard browser headers to prevent Cloudflare/Server block
  const client = axios.create({
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Referer': 'https://21st.dev/',
    },
    timeout: 10000,
  });

  while (hasMore) {
    try {
      // Trying API endpoint
      const res = await client.get(`https://21st.dev/api/components?page=${page}&limit=50`);
      
      let items = [];
      if (Array.isArray(res.data)) {
        items = res.data;
      } else if (res.data && Array.isArray(res.data.components)) {
        items = res.data.components;
      } else if (res.data && Array.isArray(res.data.data)) {
        items = res.data.data;
      }

      if (!items || items.length === 0) {
        console.log(`No more items found at page ${page}`);
        hasMore = false;
        break;
      }

      const cleaned = items.map((item, index) => ({
        id: item.id || item.slug || `design-${page}-${index}`,
        title: item.title || item.name || item.component_name || 'Untitled Design',
        prompt: item.prompt || item.description || item.code || '',
        preview_image: item.preview_url || item.preview_image || item.image_url || item.image || '',
        video_preview: item.video_url || item.video || item.video_preview || null,
        category: item.category || 'General',
      }));

      allItems.push(...cleaned);
      console.log(`Page ${page}: Extracted ${cleaned.length} items`);
      page++;

      if (page > 250) hasMore = false; // Upper safety limit
    } catch (err) {
      console.log(`Error on page ${page}:`, err.message);
      hasMore = false;
    }
  }

  // Create paginated JSON files
  let pageIndex = 1;
  for (let i = 0; i < allItems.length; i += ITEMS_PER_PAGE) {
    const chunk = allItems.slice(i, i + ITEMS_PER_PAGE);
    fs.writeFileSync(
      path.join(DATA_DIR, `page-${pageIndex}.json`), 
      JSON.stringify(chunk, null, 2)
    );
    pageIndex++;
  }

  // Save summary index
  fs.writeFileSync(
    path.join(DATA_DIR, 'index.json'), 
    JSON.stringify({ total_items: allItems.length, total_pages: Math.max(pageIndex - 1, 0) }, null, 2)
  );

  console.log(`Done! Extracted ${allItems.length} designs in ${Math.max(pageIndex - 1, 0)} JSON files.`);
}

run();
