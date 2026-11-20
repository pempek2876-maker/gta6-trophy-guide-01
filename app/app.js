/* Leonida Legend — offline trophy guide + tracker for GTA VI (PS5).
   Data lives in data/*.json and is fetched relatively; nothing else loads
   over the network. Progress lives in localStorage, except in demo mode,
   which ticks a fixed set in memory only. */
(function () {
  'use strict';

  window.__shot = { ready: false, errors: [] };
  window.addEventListener('error', function (e) {
    window.__shot.errors.push(String((e && e.message) || 'window error'));
  });
  window.addEventListener('unhandledrejection', function (e) {
    window.__shot.errors.push('unhandled rejection: ' + String((e && e.reason) || ''));
  });

  var STORAGE_KEY = 'leonida-legend-progress-v1';
  var DEMO_EARNED = [2, 3, 4, 8, 9, 16, 21, 28, 32, 35, 42, 46];
  var params = new URLSearchParams(window.location.search);
  var demo = params.get('demo') === '1';

  var trophies = [];
  var roadmap = null;
  var sources = [];
  var sourceById = {};
  var earned = new Set();
  var selectedId = null;

  var $ = function (id) { return document.getElementById(id); };

  function loadProgress() {
    if (demo) { DEMO_EARNED.forEach(function (id) { earned.add(id); }); return; }
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var names = JSON.parse(raw);
      if (!Array.isArray(names)) return;
      names.forEach(function (name) {
        var t = trophies.find(function (x) { return x.name === name; });
        if (t) earned.add(t.id);
      });
    } catch (e) { /* corrupt progress is ignored; the checklist still works */ }
  }

  function saveProgress() {
    if (demo) return; // demo mode never writes localStorage
    try {
      var names = trophies.filter(function (t) { return earned.has(t.id); }).map(function (t) { return t.name; });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
    } catch (e) { /* storage unavailable; progress is session-only */ }
  }

  function gradeLabel(g) { return g.charAt(0).toUpperCase() + g.slice(1); }
  function kindLabel(k) { return k.charAt(0).toUpperCase() + k.slice(1); }

  function phaseOf(id) {
    if (!roadmap) return null;
    for (var i = 0; i < roadmap.phases.length; i++) {
      if (roadmap.phases[i].trophies.indexOf(id) !== -1) return roadmap.phases[i];
    }
    return null;
  }

  function verifiedNote(t) {
    if (t.verified === 'official') return 'Verified: this guide follows straight from the official description.';
    if (t.verified === 'reported') return 'Verified: a count or fact in this guide comes from a trophy-list source — see Sources.';
    return 'Unconfirmed: no unlock method has been reported yet. This guide gives only the best reading of the description.';
  }

  function isMasked(t) {
    return $('spoiler-toggle').checked && t.spoiler && !earned.has(t.id);
  }

  function badgeHtml(t) {
    var h = '<span class="badge ' + t.grade + '">' + gradeLabel(t.grade) + '</span>';
    h += '<span class="badge">' + kindLabel(t.kind) + '</span>';
    if (t.missable) h += '<span class="badge missable">Missable</span>';
    if (t.verified === 'unconfirmed') h += '<span class="badge unconfirmed">Unconfirmed</span>';
    return h;
  }

  function filteredTrophies() {
    var q = ($('q').value || '').trim().toLowerCase();
    var grade = $('grade-filter').value;
    var kind = $('kind-filter').value;
    var earnedFilter = $('earned-filter').value;
    var missableOnly = $('missable-only').checked;
    return trophies.filter(function (t) {
      if (q && (t.name + ' ' + t.description + ' ' + t.guide).toLowerCase().indexOf(q) === -1) return false;
      if (grade && t.grade !== grade) return false;
      if (kind && t.kind !== kind) return false;
      if (earnedFilter === 'earned' && !earned.has(t.id)) return false;
      if (earnedFilter === 'unearned' && earned.has(t.id)) return false;
      if (missableOnly && !t.missable) return false;
      return true;
    });
  }

  function renderProgress() {
    var total = trophies.length;
    var n = earned.size;
    $('earned-count').textContent = String(n);
    $('earned-pct').textContent = total ? Math.round((n / total) * 100) + '%' : '0%';
    $('progress-bar').style.width = total ? ((n / total) * 100) + '%' : '0%';
    $('progress-bar-wrap').setAttribute('aria-valuenow', String(n));
    var grades = ['platinum', 'gold', 'silver', 'bronze'];
    $('grade-counts').textContent = grades.map(function (g) {
      var have = trophies.filter(function (t) { return t.grade === g && earned.has(t.id); }).length;
      var all = trophies.filter(function (t) { return t.grade === g; }).length;
      return gradeLabel(g) + ' ' + have + '/' + all;
    }).join(' · ');
  }

  function renderList() {
    var list = filteredTrophies();
    var root = $('trophy-list');
    $('count-line').textContent = list.length + ' of ' + trophies.length + ' trophies shown';
    if (!list.length) {
      root.innerHTML = '<p class="empty">No trophies match these filters.</p>';
      return;
    }
    root.innerHTML = '';
    list.forEach(function (t) {
      var masked = isMasked(t);
      var card = document.createElement('article');
      card.className = 'card' + (earned.has(t.id) ? ' earned' : '');
      card.tabIndex = 0;
      var title = masked ? 'Hidden story trophy' : t.name;
      var desc = masked ? 'Complete this story trophy to reveal it.' : t.description;
      var guide = masked ? 'Earn this trophy to reveal its guide.' : t.guide;
      card.innerHTML =
        '<input type="checkbox" aria-label="Mark ' + escapeAttr(title) + ' as earned"' + (earned.has(t.id) ? ' checked' : '') + '>' +
        '<div><h3>' + escapeHtml(title) + '</h3>' +
        '<p class="desc">' + escapeHtml(desc) + '</p>' +
        '<div class="badges">' + badgeHtml(t) + '</div>' +
        '<p class="excerpt">' + escapeHtml(guide) + '</p>' +
        '<div class="more">Guide, steps &amp; sources &rarr;</div></div>';
      card.addEventListener('click', function () { selectTrophy(t.id); });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectTrophy(t.id); }
      });
      var box = card.querySelector('input[type="checkbox"]');
      box.addEventListener('click', function (e) { e.stopPropagation(); });
      box.addEventListener('change', function () {
        if (box.checked) earned.add(t.id); else earned.delete(t.id);
        saveProgress();
        renderProgress();
        renderList();
        if (selectedId === t.id) renderDetail();
      });
      root.appendChild(card);
    });
  }

  function renderDetail() {
    var panel = $('detail-panel');
    var t = trophies.find(function (x) { return x.id === selectedId; });
    if (!t) {
      panel.innerHTML = '<p class="placeholder">Pick a trophy to see its full guide, steps, and sources.</p>';
      return;
    }
    var masked = isMasked(t);
    var phase = phaseOf(t.id);
    var srcLinks = (t.sources || []).map(function (id) {
      var s = sourceById[id];
      return s ? '<li><a href="' + escapeAttr(s.url) + '" target="_blank" rel="noopener">' + escapeHtml(s.name) + '</a></li>' : '';
    }).join('');
    panel.innerHTML =
      '<h2>' + escapeHtml(masked ? 'Hidden story trophy' : t.name) + '</h2>' +
      '<p class="desc">' + escapeHtml(masked ? 'Complete this story trophy to reveal it.' : t.description) + '</p>' +
      '<div class="badges">' + badgeHtml(t) + '</div>' +
      '<h3>Guide</h3><p>' + escapeHtml(masked ? 'Earn this trophy to reveal its guide.' : t.guide) + '</p>' +
      '<h3>Steps</h3><ol>' + t.steps.map(function (s) { return '<li>' + escapeHtml(s) + '</li>'; }).join('') + '</ol>' +
      '<h3>Roadmap</h3><p class="meta">' + (phase ? 'Phase ' + phase.phase + ' — ' + escapeHtml(phase.title) : 'No roadmap phase.') + '</p>' +
      '<h3>Status</h3><p class="meta">' + escapeHtml(verifiedNote(t)) + '</p>' +
      '<h3>Sources</h3><ul class="sources-list">' + srcLinks + '</ul>';
  }

  function renderRoadmap() {
    var root = $('roadmap-root');
    if (!roadmap) { root.innerHTML = ''; return; }
    var h = '<p class="meta">Estimated ' + roadmap.estimate_hours + ' hours · difficulty ' + roadmap.difficulty + ' (reported). ' +
      escapeHtml((roadmap.notes || []).join(' ')) + '</p>';
    roadmap.phases.forEach(function (p) {
      h += '<section class="phase"><h3>Phase ' + p.phase + ' — ' + escapeHtml(p.title) + '</h3>' +
        '<p class="advice">' + escapeHtml(p.advice) + '</p><div class="trophies">' +
        p.trophies.map(function (id) {
          var t = trophies.find(function (x) { return x.id === id; });
          return t ? '<button type="button" data-trophy="' + id + '">' + escapeHtml(t.name) + '</button>' : '';
        }).join('') + '</div></section>';
    });
    root.innerHTML = h;
    root.querySelectorAll('[data-trophy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        switchView('checklist');
        selectTrophy(Number(btn.getAttribute('data-trophy')));
      });
    });
  }

  function renderMissable() {
    var root = $('missable-root');
    var miss = trophies.filter(function (t) { return t.missable; });
    root.innerHTML = miss.map(function (t) {
      return '<article class="card" style="cursor:default"><input type="checkbox" disabled' + (earned.has(t.id) ? ' checked' : '') + '>' +
        '<div><h3>' + escapeHtml(t.name) + '</h3><p class="desc">' + escapeHtml(t.description) + '</p>' +
        '<div class="badges">' + badgeHtml(t) + '</div><p class="excerpt">' + escapeHtml(t.guide) + '</p></div></article>';
    }).join('');
  }

  function renderSources() {
    var root = $('sources-root');
    root.innerHTML = sources.map(function (s) {
      return '<article class="source-card"><h3>' + escapeHtml(s.name) + '</h3>' +
        '<p>' + escapeHtml(s.used_for) + '</p>' +
        '<a href="' + escapeAttr(s.url) + '" target="_blank" rel="noopener">' + escapeHtml(s.url) + '</a></article>';
    }).join('');
  }

  function selectTrophy(id) {
    selectedId = id;
    renderDetail();
    var panel = $('detail-panel');
    if (panel.scrollIntoView) panel.scrollIntoView({ block: 'nearest' });
  }

  function switchView(view) {
    document.querySelectorAll('.tabs button').forEach(function (b) {
      var active = b.getAttribute('data-view') === view;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('.view').forEach(function (v) {
      v.hidden = v.id !== 'view-' + view;
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function escapeAttr(s) { return escapeHtml(s).replace(/'/g, '&#39;'); }

  function applyUrlPresets() {
    if (params.get('grade')) $('grade-filter').value = params.get('grade');
    if (params.get('kind')) $('kind-filter').value = params.get('kind');
    if (params.get('q')) $('q').value = params.get('q');
    if (params.get('missable') === '1') $('missable-only').checked = true;
    if (params.get('spoiler') === 'off') $('spoiler-toggle').checked = false;
    if (params.get('detail')) selectedId = Number(params.get('detail'));
    if (params.get('view')) switchView(params.get('view'));
  }

  function bindControls() {
    ['q', 'grade-filter', 'kind-filter', 'earned-filter'].forEach(function (id) {
      $(id).addEventListener('input', renderList);
      $(id).addEventListener('change', renderList);
    });
    $('missable-only').addEventListener('change', renderList);
    $('spoiler-toggle').addEventListener('change', function () { renderList(); renderDetail(); });
    document.querySelectorAll('.tabs button').forEach(function (b) {
      b.addEventListener('click', function () { switchView(b.getAttribute('data-view')); });
    });

    $('export-btn').addEventListener('click', function () {
      var names = trophies.filter(function (t) { return earned.has(t.id); }).map(function (t) { return t.name; });
      var blob = new Blob([JSON.stringify({ game: 'Grand Theft Auto VI', earned: names }, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'leonida-legend-progress.json';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });

    $('import-file').addEventListener('change', function () {
      var file = $('import-file').files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var data = JSON.parse(String(reader.result));
          var names = Array.isArray(data) ? data : data.earned;
          if (!Array.isArray(names)) throw new Error('expected a JSON array of trophy names');
          var bad = names.filter(function (n) { return !trophies.some(function (t) { return t.name === n; }); });
          if (bad.length) { alert('Import rejected — unknown trophy names: ' + bad.join(', ')); return; }
          earned = new Set(names.map(function (n) { return trophies.find(function (t) { return t.name === n; }).id; }));
          saveProgress();
          renderProgress();
          renderList();
          renderDetail();
        } catch (e) { alert('Import failed: ' + e.message); }
        $('import-file').value = '';
      };
      reader.readAsText(file);
    });

    $('reset-btn').addEventListener('click', function () {
      if (!confirm('Reset all earned trophies? This cannot be undone.')) return;
      earned = new Set();
      saveProgress();
      renderProgress();
      renderList();
      renderDetail();
    });
  }

  function fillKindOptions() {
    var kinds = [];
    trophies.forEach(function (t) { if (kinds.indexOf(t.kind) === -1) kinds.push(t.kind); });
    kinds.sort().forEach(function (k) {
      var opt = document.createElement('option');
      opt.value = k;
      opt.textContent = kindLabel(k);
      $('kind-filter').appendChild(opt);
    });
  }

  function fetchJson(path) {
    return fetch(path).then(function (r) {
      if (!r.ok) throw new Error('failed to load ' + path + ' (' + r.status + ')');
      return r.json();
    });
  }

  Promise.all([
    fetchJson('data/trophies.json'),
    fetchJson('data/roadmap.json'),
    fetchJson('data/sources.json')
  ]).then(function (results) {
    trophies = results[0].trophies;
    roadmap = results[1];
    sources = results[2].sources;
    sources.forEach(function (s) { sourceById[s.id] = s; });
    loadProgress();
    fillKindOptions();
    bindControls();
    applyUrlPresets();
    renderProgress();
    renderList();
    renderDetail();
    renderRoadmap();
    renderMissable();
    renderSources();
    window.__shot.ready = true;
  }).catch(function (e) {
    window.__shot.errors.push(String(e && e.message ? e.message : e));
    document.getElementById('trophy-list').innerHTML =
      '<p class="empty">Could not load the trophy data. ' + escapeHtml(String(e && e.message ? e.message : e)) + '</p>';
    window.__shot.ready = true;
  });
})();
