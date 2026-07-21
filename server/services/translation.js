const MYMEMORY_API = 'https://api.mymemory.translated.net/get';
const CHUNK_SIZE = 5000;

async function translateChunk(text, from, to) {
  const url = `${MYMEMORY_API}?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
  const res = await fetch(url);
  const data = await res.json();
  
  if (data.responseStatus === 200 && data.responseData) {
    return data.responseData.translatedText;
  }
  throw new Error(data.responseData?.translatedText || 'Translation failed');
}

function splitIntoChunks(text, size) {
  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= size) {
      chunks.push(remaining);
      break;
    }
    let breakPoint = remaining.lastIndexOf('. ', size - 1);
    if (breakPoint === -1 || breakPoint < size * 0.5) {
      breakPoint = remaining.lastIndexOf(' ', size - 1);
    }
    if (breakPoint === -1) breakPoint = size;
    else breakPoint += 1;
    chunks.push(remaining.substring(0, breakPoint));
    remaining = remaining.substring(breakPoint);
  }
  return chunks;
}

export async function translateText(text, from = 'ru', to = 'en') {
  if (!text || text.trim().length === 0) return '';
  
  const chunks = splitIntoChunks(text, CHUNK_SIZE);
  const results = [];
  
  for (const chunk of chunks) {
    try {
      const translated = await translateChunk(chunk, from, to);
      results.push(translated);
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      results.push(chunk);
    }
  }
  
  return results.join('');
}

export async function translateGuideFields(db, guideId, fields) {
  const translations = [];
  
  for (const field of fields) {
    const existing = db.prepare(
      'SELECT id, translated_text FROM translations WHERE guide_id = ? AND lang = ? AND source_field = ?'
    ).get(guideId, 'en', field.name);
    
    if (existing) {
      translations.push({ field: field.name, translated: existing.translated_text, cached: true });
      continue;
    }
    
    if (!field.value || field.value.trim().length === 0) continue;
    
    const translated = await translateText(field.value);
    
    db.prepare(
      'INSERT OR REPLACE INTO translations (guide_id, lang, source_field, source_text, translated_text) VALUES (?, ?, ?, ?, ?)'
    ).run(guideId, 'en', field.name, field.value, translated);
    
    translations.push({ field: field.name, translated, cached: false });
  }
  
  return translations;
}
