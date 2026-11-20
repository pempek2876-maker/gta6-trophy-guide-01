// Leonida Legend — GTA VI trophy guide & tracker. Offline: loads only data/*.json relatively.
// Progress lives in localStorage; ?demo=1 uses a fixed 12-trophy set in memory only.
(function () {
  'use strict';
  window.__shot = { ready: false, errors: [] };
  window.addEventListener('error', function (e) {
    window.__shot.errors.push(String((e && e.message) || e));
  });

  var KEY = 'leonida-legend-progress-v1';
  var DEMO_EARNED = [4, 15, 16, 21, 28, 30, 31, 35, 42, 46, 52, 55];
  var params = new URLSearchParams(location.search);
  var demo = params.get('demo') === '1';

  var trophies = [];
  var roadmap = null;
  var sourcesData = null;
  var earned = new Set();
  var selectedId = null;
  var filters = {
    q: params.get('q') || '',
    grade: params.get('grade') || '',
    kind: params.get('kind') || '',
    earned: 'all',
    missableOnly: params.get('missable') === '1',
    spoiler: params.get('spoiler') !== 'off',
  };

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function gradeLabel(g) { return g.charAt(0).toUpperCase() + g.slice(1); }
  function kindLabel(k) { return k.charAt(0).toUpperCase() + k.slice(1); }
  function byId(id) { return trophies.find(function (t) { return t.id === id; }); }
  function isSpoilerHidden(t) { return filters.spoiler && t.spoiler && !earned.has(t.id); }

  function loadProgress() {
    if (demo) { DEMO_EARNED.forEach(function (id) { earned.add(id); }); return; }
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return;
      var list = JSON.parse(raw);
      if (Array.isArray(list)) list.forEach(function (id) { earned.add(Number(id)); });
    } catch (e) { window.__shot.errors.push('progress load: ' + e.message); }
  }
  function saveProgress() {
    if (demo) return; // demo never writes localStorage
    try { localStorage.setItem(KEY, JSON.stringify(Array.from(earned).sort(function (a, b) { return a - b; }))); }
    catch (e) { window.__shot.errors.push('progress save: ' + e.message); }
  }

  function renderProgress() {
    var n = earned.size, total = trophies.length || 55;
    $('earned-count').textContent = n + '/' + total;
    $('earned-pct').textContent = Math.round((n / total) * 100) + '%';
    $('progress-fill').style.width = (n / total) * 100 + '%';
    var counts = {};
    trophies.forEach(function (t) { if (earned.has(t.id)) counts[t.grade] = (counts[t.grade] || 0) + 1; });
    var totals = {};
    trophies.forEach(function (t) { totals[t.grade] = (totals[t.grade] || 0) + 1; });
    $('grade-counts').textContent = ['platinum', 'gold', 'silver', 'bronze']
      .map(function (g) { return gradeLabel(g) + ' ' + (counts[g] || 0) + '/' + (totals[g] || 0); })
      .join('  ·  ');
  }

  function filtered() {
    var q = filters.q.trim().toLowerCase();
    return trophies.filter(function (t) {
      if (filters.grade && t.grade !== filters.grade) return false;
      if (filters.kind && t.kind !== filters.kind) return false;
      if (filters.earned === 'earned' && !earned.has(t.id)) return false;
      if (filters.earned === 'unearned' && earned.has(t.id)) return false;
      if (filters.missableOnly && !t.missable) return false;
      if (q) {
        var hay = (t.name + ' ' + t.description + ' ' + t.guide + ' ' + t.kind).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function cardHtml(t) {
    var hidden = isSpoilerHidden(t);
    var name = hidden ? 'Hidden story trophy' : esc(t.name);
    var desc = hidden ? 'A story trophy. Turn spoilers off (or earn it) to reveal it.' : esc(t.description);
    var guide = hidden ? 'Hidden until revealed.' : esc(t.guide);
    var badges = '<span class="badge ' + t.grade + '">' + gradeLabel(t.grade) + '</span>' +
      '<span class="badge kind">' + esc(kindLabel(t.kind)) + '</span>' +
      (t.missable ? '<span class="badge missable">Missable</span>' : '') +
      (t.verified === 'unconfirmed' ? '<span class="badge unconfirmed">Unconfirmed</span>' : '');
    return '<article class="card' + (earned.has(t.id) ? ' earned' : '') + (selectedId === t.id ? ' selected' : '') +
      '" data-id="' + t.id + '" tabindex="0">' +
      '<div class="card-top"><input type="checkbox" data-check="' + t.id + '"' + (earned.has(t.id) ? ' checked' : '') +
      ' aria-label="Mark ' + esc(t.name) + ' as earned">' +
      '<div><div class="card-name">' + name + '</div>' +
      '<p class="card-desc">' + desc + '</p>' +
      '<div class="badges">' + badges + '</div>' +
      '<p class="card-guide' + (hidden ? ' spoiler-mask' : '') + '">' + guide + '</p>' +
      '<p class="card-meta">Difficulty ' + t.difficulty + '/5 &middot; ' + esc(t.time) + ' &middot; ' + t.steps.length + ' steps</p>' +
      '<p class="card-more">Guide, steps &amp; sources &rarr;</p>' +
      '</div></div></article>';
  }

  function renderCards() {
    var list = filtered();
    $('result-count').textContent = list.length + ' of ' + trophies.length + ' trophies shown';
    $('cards').innerHTML = list.map(cardHtml).join('') ||
      '<p class="result-count">No trophies match these filters.</p>';
  }

  function sourceLinks(names) {
    if (!sourcesData) return esc(names.join(', '));
    return names.map(function (n) {
      var s = sourcesData.sources.find(function (x) { return x.name === n; });
      return s && s.url ? '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(n) + '</a>' : esc(n);
    }).join(', ');
  }

  function renderDetail() {
    var box = $('detail');
    var t = selectedId ? byId(selectedId) : null;
    if (!t) {
      box.innerHTML = '<p class="detail-empty">Select a trophy to read its full guide, steps, difficulty, and sources.</p>';
      return;
    }
    var hidden = isSpoilerHidden(t);
    var phase = roadmap ? roadmap.phases.find(function (p) { return p.trophies.indexOf(t.id) !== -1; }) : null;
    var verifiedNote = t.verified === 'unconfirmed'
      ? 'Unconfirmed — no unlock method has been reported yet. This guide gives the best reading of the description only.'
      : t.verified === 'reported'
        ? 'Reported — a count or fact in this guide comes from a trophy-list source, not from the official description alone.'
        : 'Official — this guide follows straight from the official description.';
    box.innerHTML =
      '<button type="button" class="close" id="detail-close">Close</button>' +
      '<h2>' + (hidden ? 'Hidden story trophy' : esc(t.name)) + '</h2>' +
      '<p class="official">' + (hidden ? 'Story trophy — hidden while spoilers are on.' : esc(t.description)) + '</p>' +
      '<div class="badges"><span class="badge ' + t.grade + '">' + gradeLabel(t.grade) + '</span>' +
      '<span class="badge kind">' + esc(kindLabel(t.kind)) + '</span>' +
      (t.missable ? '<span class="badge missable">Missable</span>' : '') +
      (t.verified === 'unconfirmed' ? '<span class="badge unconfirmed">Unconfirmed</span>' : '') + '</div>' +
      '<div class="facts"><span>Difficulty <b>' + t.difficulty + '/5</b></span><span>Time <b>' + esc(t.time) + '</b></span>' +
      '<span>Roadmap <b>Phase ' + (t.roadmap || (phase ? phase.phase : '?')) + '</b></span></div>' +
      (hidden ? '<p class="spoiler-mask">Guide hidden until revealed.</p>'
        : '<p>' + esc(t.guide) + '</p>' +
          '<h3>Steps</h3><ol class="steps">' + t.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>') +
      (phase ? '<p><strong>Roadmap:</strong> Phase ' + phase.phase + ' — ' + esc(phase.title) + ' (' + esc(phase.hours) + ').</p>' : '') +
      '<p><strong>Status:</strong> ' + verifiedNote + '</p>' +
      '<p class="srcs"><strong>Sources:</strong> ' + sourceLinks(t.sources) + '</p>';
    $('detail-close').addEventListener('click', function () { selectedId = null; renderDetail(); renderCards(); });
  }

  function renderRoadmap() {
    if (!roadmap) return;
    $('roadmap-meta').textContent = roadmap.totalHours + ' total · Difficulty ' + roadmap.difficulty + ' · ' + roadmap.online;
    $('roadmap-phases').innerHTML = roadmap.phases.map(function (p) {
      var names = p.trophies.map(function (id) { var t = byId(id); return t ? esc(t.name) : id; }).join(', ');
      return '<div class="phase"><h3>Phase ' + p.phase + ' — ' + esc(p.title) +
        '<span class="phase-hours">' + esc(p.hours) + '</span></h3><p>' + esc(p.text) + '</p>' +
        '<p class="phase-trophies">' + names + '</p></div>';
    }).join('');
  }

  function renderMissable() {
    var t = trophies.find(function (x) { return x.missable; });
    if (!t) return;
    $('missable-card').innerHTML = cardHtml(t);
  }

  function renderSources() {
    if (!sourcesData) return;
    $('sources-list').innerHTML = sourcesData.sources.map(function (s) {
      var head = s.url ? '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.name) + '</a>' : esc(s.name);
      return '<div class="source"><h3>' + head + '</h3><p>' + esc(s.usedFor) + '</p></div>';
    }).join('');
    $('sources-note').textContent = sourcesData.note || '';
  }

  function renderAll() {
    renderProgress();
    renderCards();
    renderDetail();
    renderRoadmap();
    renderMissable();
    renderSources();
    window.__shot.ready = true;
  }

  function showView(view) {
    var views = { checklist: $('view-checklist'), roadmap: $('view-roadmap'), missable: $('view-missable'), sources: $('view-sources') };
    Object.keys(views).forEach(function (k) { views[k].hidden = k !== view; });
    $('detail').style.display = view === 'checklist' ? '' : 'none';
    document.querySelectorAll('.tab').forEach(function (b) {
      var active = b.dataset.view === view;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', String(active));
    });
    var url = new URL(location.href);
    url.searchParams.set('view', view);
    history.replaceState(null, '', url);
  }

  function bind() {
    var kinds = Array.from(new Set(trophies.map(function (t) { return t.kind; }))).sort();
    $('kind').innerHTML = '<option value="">All kinds</option>' +
      kinds.map(function (k) { return '<option value="' + esc(k) + '"' + (filters.kind === k ? ' selected' : '') + '>' + esc(kindLabel(k)) + '</option>'; }).join('');
    $('q').value = filters.q;
    $('grade').value = filters.grade;
    $('earned').value = filters.earned;
    $('missable-only').checked = filters.missableOnly;
    $('spoiler').checked = filters.spoiler;

    $('q').addEventListener('input', function (e) { filters.q = e.target.value; renderCards(); });
    $('grade').addEventListener('change', function (e) { filters.grade = e.target.value; renderCards(); });
    $('kind').addEventListener('change', function (e) { filters.kind = e.target.value; renderCards(); });
    $('earned').addEventListener('change', function (e) { filters.earned = e.target.value; renderCards(); });
    $('missable-only').addEventListener('change', function (e) { filters.missableOnly = e.target.checked; renderCards(); });
    $('spoiler').addEventListener('change', function (e) { filters.spoiler = e.target.checked; renderCards(); renderDetail(); renderMissable(); });

    $('cards').addEventListener('click', function (e) {
      var check = e.target.closest('[data-check]');
      if (check) {
        var id = Number(check.dataset.check);
        if (check.checked) earned.add(id); else earned.delete(id);
        saveProgress(); renderProgress(); renderCards(); renderDetail();
        return;
      }
      var card = e.target.closest('.card');
      if (card) { selectedId = Number(card.dataset.id); renderDetail(); renderCards(); $('detail').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    });
    $('cards').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        var card = e.target.closest('.card');
        if (card) { e.preventDefault(); selectedId = Number(card.dataset.id); renderDetail(); renderCards(); }
      }
    });
    $('missable-card').addEventListener('click', function (e) {
      var card = e.target.closest('.card');
      if (card) { selectedId = Number(card.dataset.id); showView('checklist'); renderDetail(); renderCards(); $('detail').scrollIntoView({ behavior: 'smooth' }); }
    });

    document.querySelectorAll('.tab').forEach(function (b) {
      b.addEventListener('click', function () { showView(b.dataset.view); });
    });

    $('btn-export').addEventListener('click', function () {
      var blob = new Blob([JSON.stringify({ game: 'Grand Theft Auto VI', earned: Array.from(earned).sort(function (a, b) { return a - b; }) }, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'leonida-legend-progress.json';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });
    $('btn-import').addEventListener('click', function () { $('import-file').click(); });
    $('import-file').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var data = JSON.parse(reader.result);
          var list = Array.isArray(data) ? data : data.earned;
          if (!Array.isArray(list)) throw new Error('no earned list');
          var next = new Set();
          list.forEach(function (id) { if (byId(Number(id))) next.add(Number(id)); });
          earned = next; saveProgress(); renderAll();
        } catch (err) { alert('Import failed: ' + err.message); }
      };
      reader.readAsText(file);
      e.target.value = '';
    });
    $('btn-reset').addEventListener('click', function () {
      if (confirm('Reset all progress? This clears your earned trophies.')) {
        earned.clear(); saveProgress(); renderAll();
      }
    });
  }

  Promise.all([
    fetch('data/trophies.json').then(function (r) { return r.json(); }),
    fetch('data/roadmap.json').then(function (r) { return r.json(); }),
    fetch('data/sources.json').then(function (r) { return r.json(); }),
  ]).then(function (results) {
    trophies = results[0].trophies;
    roadmap = results[1];
    sourcesData = results[2];
    loadProgress();
    bind();
    var view = params.get('view') || 'checklist';
    if (params.get('detail')) selectedId = Number(params.get('detail'));
    showView(['checklist', 'roadmap', 'missable', 'sources'].indexOf(view) !== -1 ? view : 'checklist');
    renderAll();
  }).catch(function (err) {
    window.__shot.errors.push('data load: ' + err.message);
    document.getElementById('cards').innerHTML = '<p>Could not load trophy data. This app works offline — open it from its own folder so data/*.json loads.</p>';
    window.__shot.ready = true;
  });
})();
