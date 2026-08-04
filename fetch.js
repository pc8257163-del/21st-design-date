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

  console.log('Fetching data from 21st.dev API...');

  while (hasMore) {
    try {
      const res = await axios.get(`https://21st.dev/api/components?page=${page}&limit=100`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      
      const items = res.data.components || res.data || [];
      if (!items || items.length === 0) {
        hasMore = false;
        break;
      }

      const cleaned = items.map(item => ({
        id: item.id || item.slug,
        title: item.title || item.name || 'Untitled Design',
        prompt: item.prompt || item.description || '',
        preview_image: item.preview_url || item.preview_image || '',
        video_preview: item.video_url || item.video || null,
        category: item.category || 'General'
      }));

      allItems.push(...cleaned);
      console.log(`Page ${page} fetched (${cleaned.length} items)`);
      page++;

      if (page > 150) hasMore = false;
    } catch (err) {
      console.log(`Page ${page} fetch error:`, err.message);
      hasMore = false;
    }
  }

  let pageIndex = 1;
  for (let i = 0; i < allItems.length; i += ITEMS_PER_PAGE) {
    const chunk = allItems.slice(i, i + ITEMS_PER_PAGE);
    fs.writeFileSync(
      path.join(DATA_DIR, `page-${pageIndex}.json`), 
      JSON.stringify(chunk, null, 2)
    );
    pageIndex++;
  }

  fs.writeFileSync(
    path.join(DATA_DIR, 'index.json'), 
    JSON.stringify({ total_items: allItems.length, total_pages: pageIndex - 1 }, null, 2)
  );

  console.log(`Done! Extracted ${allItems.length} designs in ${pageIndex - 1} JSON chunks.`);
}

run();
