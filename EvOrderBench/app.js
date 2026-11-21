(function () {
  'use strict';
  var D = window.SITE_DATA, C = window.SITE_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  // ---- authors and buttons
  (function () {
    var a = C.authors || [], el = $('authors');
    if (!a.length) { el.innerHTML = '<span class="placeholder">Anonymous authors</span>'; }
    else {
      var people = a.map(function (x) {
        var marks = (x.affiliations || []).join(',') + (x.note || '');
        var name = x.url ? '<a href="' + esc(x.url) + '">' + esc(x.name) + '</a>' : esc(x.name);
        return '<span>' + name + (marks ? '<sup>' + esc(marks) + '</sup>' : '') + '</span>';
      }).join('');
      var aff = (C.affiliations || []).map(function (x, i) { return '<sup>' + (i + 1) + '</sup>' + esc(x); }).join(' &nbsp; ');
      el.innerHTML = '<div class="people">' + people + '</div>' + (aff ? '<div class="aff">' + aff + '</div>' : '') + (C.notes ? '<div class="note">' + esc(C.notes) + '</div>' : '');
    }
    var L = C.links || {};
    var icon = function (c) { return '<i class="' + c + '" aria-hidden="true"></i>'; };
    var ext = [['Paper', L.paper, 'fas fa-file-pdf'], ['arXiv', L.arxiv, 'ai ai-arxiv'], ['Code', L.code, 'fab fa-github'], ['Dataset', L.dataset, 'fas fa-database']].map(function (b) {
      return b[1] ? '<a class="btn btn--solid" href="' + esc(b[1]) + '" target="_blank" rel="noopener">' + icon(b[2]) + b[0] + '</a>'
                  : '<span class="btn btn--soon">' + icon(b[2]) + b[0] + ' <small>coming soon</small></span>';
    });
    $('buttons').innerHTML = ext.join('') +
      '<a class="btn btn--ghost" href="#results">' + icon('fas fa-trophy') + 'Leaderboard</a>' +
      '<a class="btn btn--ghost" href="#citation">' + icon('fas fa-quote-right') + 'Citation</a>';
  })();

  // ---- statistics
  $('tiles').innerHTML = D.stats.map(function (s) { return '<div class="tile"><b>' + esc(s[0]) + '</b><span>' + esc(s[1]) + '</span></div>'; }).join('');

  // ---- example explorer
  var SETS = ['H', 'L', 'K', 'P'];
  var NOTE = { H: 'Four frames, including the intermediate frames that resolve the order.', L: 'Four frames with the same first and last frame as H, without the frames in between.',
               K: 'L plus two critical frames (outlined): the frames that distinguish H from L.', P: 'L plus two peripheral frames (outlined), which are not meant to resolve the order.' };
  var ORDER = { A: 'A before B', B: 'B before A', UNCLEAR: 'UNCLEAR' };
  var state = { list: D.examples, i: 0, set: 'L' };
  var short = function (s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; };
  function fillFamilies() {
    var t = $('ex-filter').value;
    state.list = D.examples.filter(function (f) { return !t || f.sets.L.type === t; });
    $('ex-family').innerHTML = state.list.map(function (f, i) { return '<option value="' + i + '">' + esc(short(f.A, 46) + '  /  ' + short(f.B, 46)) + '</option>'; }).join('');
    state.i = 0;
  }
  function renderExample() {
    var f = state.list[state.i]; if (!f) return;
    var c = f.sets[state.set], inL = {};
    f.sets.L.frames.forEach(function (x) { inL[x] = 1; });
    $('ex-family').value = state.i;
    $('ex-a').textContent = f.A; $('ex-b').textContent = f.B;
    $('ex-tabs').innerHTML = SETS.map(function (s) {
      var t = f.sets[s];
      return '<button class="tab" role="tab" data-set="' + s + '" aria-selected="' + (s === state.set) + '"><b>' + s + '</b><span class="dot ' + (t.type || '') + '"></span>' +
             (t.type ? 'UNCLEAR · ' + t.type : ORDER[t.gold]) + '</button>';
    }).join('');
    $('ex-setnote').textContent = NOTE[state.set];
    $('ex-frames').className = 'frames' + (c.frames.length === 4 ? ' four' : '');
    $('ex-frames').innerHTML = c.frames.map(function (x) {
      var added = (state.set === 'K' || state.set === 'P') && !inL[x];
      return '<figure class="' + (added ? 'added' : '') + '"><img loading="lazy" src="assets/frames/' + f.id + '/' + x + '.webp" alt="Frame at ' + esc(f.times[x]) + '">' +
             '<figcaption><span>' + esc(f.times[x]) + '</span><span>' + (added ? 'added' : '') + '</span></figcaption></figure>';
    }).join('');
    $('ex-gold').textContent = ORDER[c.gold] + (c.type ? ' · ' + c.type : ''); $('ex-gold').className = 'gold ' + (c.type || '');
    $('ex-occ').innerHTML = ['A', 'B'].map(function (t, k) {
      return '<span class="occ ' + (c.occ[k] ? 'yes' : 'no') + '">Action ' + t + ': <i>' + (c.occ[k] ? 'established' : 'not established') + '</i></span>';
    }).join('');
    $('ex-answers').innerHTML = D.models.map(function (m, k) {
      var a = c.ans[k][0];
      return '<span class="chip ' + (a === c.gold ? 'ok' : 'bad') + '">' + esc(m) + '<b>' + esc(a) + '</b></span>';
    }).join('');
    $('ex-count').textContent = 'Example ' + (state.i + 1) + ' of ' + state.list.length + ' · ' + f.source + ' · family ' + f.id +
      '. A sample of ' + D.examples.length + ' of the ' + D.total + ' families is shown here.';
  }
  fillFamilies(); renderExample();
  $('ex-filter').addEventListener('change', function () { fillFamilies(); renderExample(); });
  $('ex-family').addEventListener('change', function () { state.i = +this.value; renderExample(); });
  $('ex-prev').addEventListener('click', function () { state.i = (state.i - 1 + state.list.length) % state.list.length; renderExample(); });
  $('ex-next').addEventListener('click', function () { state.i = (state.i + 1) % state.list.length; renderExample(); });
  $('ex-tabs').addEventListener('click', function (e) { var b = e.target.closest('.tab'); if (b) { state.set = b.dataset.set; renderExample(); } });
  document.addEventListener('click', function (e) {
    var fz = e.target.closest('.figure-zoom');
    if (fz) { $('zoom').firstElementChild.src = fz.querySelector('img').src; $('zoom').hidden = false; }
    else if (e.target.tagName === 'IMG' && e.target.closest('.frames')) { $('zoom').firstElementChild.src = e.target.src; $('zoom').hidden = false; }
    else if (e.target.closest('#zoom')) { $('zoom').hidden = true; }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') $('zoom').hidden = true; });

  // ---- leaderboard
  var COLS = D.columns, GROUPS = [['all', 'All'], ['instruction', 'Open, instruction'], ['thinking', 'Open, Thinking'], ['closed', 'Closed references']];
  var lb = { sort: 0, dir: -1, group: 'all' };
  $('lb-filter').innerHTML = GROUPS.map(function (g) { return '<button class="seg" data-g="' + g[0] + '" aria-pressed="' + (g[0] === 'all') + '">' + g[1] + '</button>'; }).join('');
  function heat(v) { return 'background:rgba(var(--heat),' + (v / 100 * 0.24).toFixed(3) + ')'; }
  function renderBoard() {
    var rows = D.leaderboard.filter(function (r) { return lb.group === 'all' || r.group === lb.group; });
    rows.sort(function (a, b) { return lb.dir * (a.values[lb.sort] - b.values[lb.sort]); });
    var best = COLS.map(function (_, k) { return Math.max.apply(null, rows.map(function (r) { return r.values[k]; })); });
    $('lb').tHead.innerHTML = '<tr class="groups"><th></th><th colspan="3">Per query</th><th colspan="3">Correct UNCLEAR by type</th><th colspan="3">Joint</th></tr><tr><th>Model</th>' +
      COLS.map(function (c, k) { return '<th data-k="' + k + '"' + (k === lb.sort ? ' aria-sort="' + (lb.dir < 0 ? 'descending' : 'ascending') + '"' : '') + '><span>' + esc(c) + '</span></th>'; }).join('') + '</tr>';
    var body = rows.map(function (r) {
      return '<tr class="' + r.group + '"><td>' + esc(r.name) + '</td>' + r.values.map(function (v, k) {
        return '<td class="' + (v === best[k] ? 'best' : '') + '"' + (k >= 3 && k <= 5 ? ' style="' + heat(v) + '"' : '') + '>' + v.toFixed(1) + '</td>';
      }).join('') + '</tr>';
    }).join('');
    body += D.baselines.map(function (r) { return '<tr class="baseline"><td>' + esc(r.name) + '</td>' + r.values.map(function (v) { return '<td>' + v.toFixed(1) + '</td>'; }).join('') + '</tr>'; }).join('');
    $('lb').tBodies[0].innerHTML = body;
  }
  renderBoard();
  $('lb').tHead.addEventListener('click', function (e) {
    var th = e.target.closest('th[data-k]'); if (!th) return;
    var k = +th.dataset.k; if (k === lb.sort) lb.dir = -lb.dir; else { lb.sort = k; lb.dir = -1; }
    renderBoard();
  });
  $('lb-filter').addEventListener('click', function (e) {
    var b = e.target.closest('.seg'); if (!b) return;
    lb.group = b.dataset.g;
    Array.prototype.forEach.call(this.children, function (x) { x.setAttribute('aria-pressed', x === b); });
    renderBoard();
  });

  // ---- citation
  $('copy').addEventListener('click', function () {
    var btn = this, text = $('bibtex').textContent;
    var label = btn.querySelector('span') || btn;
    var done = function () { label.textContent = 'Copied'; setTimeout(function () { label.textContent = 'Copy'; }, 1500); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () {});
    else { var r = document.createRange(); r.selectNodeContents($('bibtex')); var s = getSelection(); s.removeAllRanges(); s.addRange(r); document.execCommand('copy'); done(); }
  });
})();
