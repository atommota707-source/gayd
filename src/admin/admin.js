(() => {
  'use strict';
  
  const $ = s => document.querySelector(s);
  let currentView = 'stats';
  let editingGuideId = null;
  let sections = [];

  async function init() {
    if (API.token) {
      try {
        await API.me();
        showDashboard();
      } catch {
        API.clearToken();
        showLogin();
      }
    } else {
      showLogin();
    }
    
    $('#login-form').addEventListener('submit', handleLogin);
    $('#logout-btn').addEventListener('click', handleLogout);
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => switchView(btn.dataset.view));
    });
    
    $('#create-guide-btn').addEventListener('click', openNewGuide);
    $('#close-editor-btn').addEventListener('click', closeEditor);
    $('#guide-form').addEventListener('submit', handleSaveGuide);
    $('#delete-guide-btn').addEventListener('click', handleDeleteGuide);
    $('#regenerate-cipher-btn').addEventListener('click', handleRegenerateCipher);
    $('#translate-guide-btn').addEventListener('click', handleTranslateGuide);
    $('#publish-guide-btn').addEventListener('click', handlePublishGuide);
    $('#add-section-btn').addEventListener('click', addSection);
    
    setupDragDrop('#image-upload-zone', '#image-input', handleImageUpload);
    setupDragDrop('#cloud-upload-zone', '#cloud-input', handleCloudUpload);
  }

  function showLogin() {
    $('#login-view').hidden = false;
    $('#dashboard-view').hidden = true;
  }

  function showDashboard() {
    $('#login-view').hidden = true;
    $('#dashboard-view').hidden = false;
    switchView('stats');
  }

  async function handleLogin(e) {
    e.preventDefault();
    const username = $('#login-username').value;
    const password = $('#login-password').value;
    
    try {
      const { token } = await API.login(username, password);
      API.setToken(token);
      showDashboard();
    } catch (err) {
      $('#login-error').textContent = err.message;
      $('#login-error').hidden = false;
    }
  }

  function handleLogout() {
    API.clearToken();
    showLogin();
  }

  async function switchView(view) {
    currentView = view;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.nav-btn[data-view="${view}"]`).classList.add('active');
    
    document.querySelectorAll('.admin-content').forEach(s => s.hidden = true);
    $(`#${view}-view`).hidden = false;
    
    const titles = { stats: 'Dashboard', guides: 'Guides', cloud: 'Cloud Storage', labels: 'UI Labels', translations: 'Translations' };
    $('#view-title').textContent = titles[view];
    
    if (view === 'stats') await loadDashboard();
    if (view === 'guides') await loadGuides();
    if (view === 'cloud') await loadCloudFiles();
    if (view === 'labels') await loadLabels();
  }

  async function loadDashboard() {
    try {
      const data = await API.getDashboard();
      $('#stat-today-views').textContent = data.today.page_views;
      $('#stat-total-views').textContent = data.total.total_views;
      $('#stat-total-guides').textContent = data.topGuides.length;
      $('#stat-cipher-success').textContent = data.total.total_successes;
      
      const list = $('#top-guides-list');
      list.innerHTML = data.topGuides.map(g => `
        <div class="guide-row">
          <span>${g.title_ru}</span>
          <span class="guide-views">${g.view_count} views</span>
        </div>
      `).join('');
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    }
  }

  async function loadGuides() {
    try {
      const guides = await API.getGuides();
      const list = $('#guides-list');
      list.innerHTML = guides.map(g => `
        <div class="item-row" data-id="${g.id}">
          <div>
            <div class="item-title">${g.title_ru}</div>
            <div class="item-meta">${g.category} | ${g.view_count} views | <span class="badge ${g.is_published ? 'badge-success' : 'badge-warning'}">${g.is_published ? 'Published' : 'Draft'}</span></div>
          </div>
          <div class="item-actions">
            <button class="btn btn-sm btn-secondary edit-btn" data-id="${g.id}">Edit</button>
          </div>
        </div>
      `).join('');
      
      list.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          openEditGuide(btn.dataset.id);
        });
      });
    } catch (err) {
      console.error('Failed to load guides:', err);
    }
  }

  async function openNewGuide() {
    editingGuideId = null;
    sections = [];
    $('#editor-title').textContent = 'New Guide';
    $('#guide-form').reset();
    $('#guide-cipher').value = '';
    $('#guide-images').innerHTML = '';
    $('#sections-editor').innerHTML = '';
    $('#guide-editor').hidden = false;
    $('#delete-guide-btn').hidden = true;
    $('#publish-guide-btn').hidden = true;
    $('#translate-guide-btn').hidden = true;
  }

  async function openEditGuide(id) {
    try {
      const guide = await API.getGuide(id);
      editingGuideId = id;
      sections = JSON.parse(guide.sections_json || '[]');
      
      $('#editor-title').textContent = 'Edit Guide';
      $('#guide-slug').value = guide.guide_id;
      $('#guide-category').value = guide.category;
      $('#guide-title-ru').value = guide.title_ru;
      $('#guide-title-en').value = guide.title_en || '';
      $('#guide-desc-ru').value = guide.description_ru || '';
      $('#guide-cipher').value = guide.cipher_code;
      
      renderSections();
      renderGuideImages(guide.images || []);
      
      $('#guide-editor').hidden = false;
      $('#delete-guide-btn').hidden = false;
      $('#publish-guide-btn').hidden = false;
      $('#translate-guide-btn').hidden = false;
      $('#publish-guide-btn').textContent = guide.is_published ? 'Unpublish' : 'Publish';
    } catch (err) {
      console.error('Failed to load guide:', err);
    }
  }

  function closeEditor() {
    $('#guide-editor').hidden = true;
    editingGuideId = null;
  }

  function renderSections() {
    const container = $('#sections-editor');
    container.innerHTML = sections.map((s, i) => `
      <div class="section-item" data-index="${i}">
        <div class="section-header">
          <strong>Section ${i + 1}</strong>
          <button type="button" class="btn btn-sm btn-danger remove-section" data-index="${i}">Remove</button>
        </div>
        <input type="text" class="section-heading" value="${escapeHtml(s.heading || '')}" placeholder="Heading">
        <textarea class="section-body" placeholder="Body content">${escapeHtml(s.body || '')}</textarea>
      </div>
    `).join('');
    
    container.querySelectorAll('.section-heading').forEach((input, i) => {
      input.addEventListener('change', (e) => { sections[i].heading = e.target.value; });
    });
    container.querySelectorAll('.section-body').forEach((textarea, i) => {
      textarea.addEventListener('change', (e) => { sections[i].body = e.target.value; });
    });
    container.querySelectorAll('.remove-section').forEach(btn => {
      btn.addEventListener('click', (e) => {
        sections.splice(parseInt(e.target.dataset.index), 1);
        renderSections();
      });
    });
  }

  function addSection() {
    sections.push({ heading: '', body: '' });
    renderSections();
  }

  function renderGuideImages(images) {
    const container = $('#guide-images');
    container.innerHTML = images.map(img => `
      <div style="position:relative">
        <img src="/uploads/${img.storage_path}" alt="${img.original_name}">
        <button class="btn btn-sm btn-danger delete-image" data-id="${img.id}" style="position:absolute;top:2px;right:2px">X</button>
      </div>
    `).join('');
    
    container.querySelectorAll('.delete-image').forEach(btn => {
      btn.addEventListener('click', async () => {
        await API.deleteImage(btn.dataset.id);
        if (editingGuideId) {
          const guide = await API.getGuide(editingGuideId);
          renderGuideImages(guide.images || []);
        }
      });
    });
  }

  async function handleSaveGuide(e) {
    e.preventDefault();
    
    const data = {
      guide_id: $('#guide-slug').value,
      category: $('#guide-category').value,
      title_ru: $('#guide-title-ru').value,
      title_en: $('#guide-title-en').value,
      description_ru: $('#guide-desc-ru').value,
      sections_json: JSON.stringify(sections)
    };
    
    try {
      if (editingGuideId) {
        await API.updateGuide(editingGuideId, data);
      } else {
        await API.createGuide(data);
      }
      closeEditor();
      await loadGuides();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function handleDeleteGuide() {
    if (!editingGuideId) return;
    if (!confirm('Are you sure you want to delete this guide?')) return;
    
    try {
      await API.deleteGuide(editingGuideId);
      closeEditor();
      await loadGuides();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function handleRegenerateCipher() {
    if (!editingGuideId) return;
    try {
      const { cipher_code } = await API.regenerateCipher(editingGuideId);
      $('#guide-cipher').value = cipher_code;
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function handleTranslateGuide() {
    if (!editingGuideId) return;
    try {
      const result = await API.translateGuide(editingGuideId);
      $('#guide-title-en').value = result.title_en || '';
      alert(`Translated ${result.translations.length} fields. ${result.translations.filter(t => t.cached).length} from cache.`);
    } catch (err) {
      alert('Translation error: ' + err.message);
    }
  }

  async function handlePublishGuide() {
    if (!editingGuideId) return;
    try {
      const { is_published } = await API.publishGuide(editingGuideId);
      $('#publish-guide-btn').textContent = is_published ? 'Unpublish' : 'Publish';
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function handleImageUpload(file) {
    if (!editingGuideId) {
      alert('Save the guide first, then upload images.');
      return;
    }
    const formData = new FormData();
    formData.append('image', file);
    formData.append('guide_id', editingGuideId);
    
    try {
      await API.uploadImage(formData);
      const guide = await API.getGuide(editingGuideId);
      renderGuideImages(guide.images || []);
    } catch (err) {
      alert('Upload error: ' + err.message);
    }
  }

  async function loadCloudFiles() {
    try {
      const files = await API.getCloudFiles();
      const list = $('#cloud-files');
      list.innerHTML = files.map(f => `
        <div class="item-row">
          <div>
            <div class="item-title">${escapeHtml(f.original_name)}</div>
            <div class="item-meta">${formatSize(f.size_bytes)} | ${f.mime_type} | ${f.download_count} downloads | <span class="badge ${f.is_public ? 'badge-success' : 'badge-warning'}">${f.is_public ? 'Public' : 'Private'}</span></div>
          </div>
          <div class="item-actions">
            <button class="btn btn-sm btn-secondary toggle-public" data-id="${f.id}" data-public="${f.is_public}">${f.is_public ? 'Make Private' : 'Make Public'}</button>
            <button class="btn btn-sm btn-danger delete-cloud" data-id="${f.id}">Delete</button>
          </div>
        </div>
      `).join('');
      
      list.querySelectorAll('.toggle-public').forEach(btn => {
        btn.addEventListener('click', async () => {
          await API.updateCloud(btn.dataset.id, { is_public: btn.dataset.public !== 'true' });
          await loadCloudFiles();
        });
      });
      list.querySelectorAll('.delete-cloud').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (confirm('Delete this file?')) {
            await API.deleteCloud(btn.dataset.id);
            await loadCloudFiles();
          }
        });
      });
    } catch (err) {
      console.error('Failed to load cloud files:', err);
    }
  }

  async function handleCloudUpload(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('description', '');
    formData.append('is_public', 'true');
    
    try {
      await API.uploadCloud(formData);
      await loadCloudFiles();
    } catch (err) {
      alert('Upload error: ' + err.message);
    }
  }

  async function loadLabels() {
    try {
      const labels = await API.getLabels();
      const list = $('#labels-list');
      list.innerHTML = labels.map(l => `
        <div class="item-row">
          <div style="flex:1">
            <div class="item-title">${escapeHtml(l.key)}</div>
            <div style="display:flex;gap:8px;margin-top:6px">
              <input type="text" class="label-ru" value="${escapeHtml(l.value_ru)}" style="flex:1;padding:6px;border:1px solid var(--line);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px">
              <input type="text" class="label-en" value="${escapeHtml(l.value_en || '')}" style="flex:1;padding:6px;border:1px solid var(--line);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px" placeholder="EN">
            </div>
          </div>
          <button class="btn btn-sm btn-primary save-label" data-key="${l.key}">Save</button>
        </div>
      `).join('');
      
      list.querySelectorAll('.save-label').forEach(btn => {
        btn.addEventListener('click', async () => {
          const row = btn.closest('.item-row');
          const value_ru = row.querySelector('.label-ru').value;
          const value_en = row.querySelector('.label-en').value;
          await API.updateLabel(btn.dataset.key, { value_ru, value_en });
          btn.textContent = 'Saved!';
          setTimeout(() => btn.textContent = 'Save', 1500);
        });
      });
    } catch (err) {
      console.error('Failed to load labels:', err);
    }
  }

  function setupDragDrop(zoneSelector, inputSelector, handler) {
    const zone = $(zoneSelector);
    const input = $(inputSelector);
    
    if (!zone || !input) return;
    
    zone.addEventListener('click', () => input.click());
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      if (e.dataTransfer.files.length) handler(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', () => {
      if (input.files.length) handler(input.files[0]);
      input.value = '';
    });
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  init();
})();
