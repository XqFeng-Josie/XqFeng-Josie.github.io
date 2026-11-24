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
      var aff = (C.affiliations || []).map(function (x, i) { return '<span class="aff-i"><sup>' + (i + 1) + '</sup>' + esc(x) + '</span>'; }).join(' &nbsp; ');
      el.innerHTML = '<div class="people">' + people + '</div>' + (aff ? '<div class="aff">' + aff + '</div>' : '') + (C.notes ? '<div class="note">' + esc(C.notes) + '</div>' : '');
    }
    var L = C.links || {};
    var icon = function (c) { return '<i class="' + c + '" aria-hidden="true"></i>'; };
    var ext = [['arXiv', L.arxiv, 'ai ai-arxiv'], ['Code', L.code, 'fab fa-github'], ['Dataset', L.dataset, 'fas fa-database']].map(function (b) {
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
  var GUESS = { A: 'A first', B: 'B first', UNCLEAR: 'Can’t tell' };
  var GROUP = {}; D.leaderboard.forEach(function (r) { GROUP[r.name] = r.group; });
  var INST = D.models.map(function (m, k) { return GROUP[m] === 'instruction' ? k : -1; }).filter(function (k) { return k >= 0; });
  var BEST = D.models.indexOf('GPT-6.1 Sol');
  var state = { list: D.examples, i: 0, set: 'L', seen: {}, log: [], quiz: true };
  var short = function (s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; };
  var key = function (f, s) { return f.id + '/' + s; };
  var shown = function (f, s) { return !state.quiz || state.seen[key(f, s)] !== undefined; };
  var goldText = function (t) { return t.type ? 'UNCLEAR · ' + t.type : ORDER[t.gold]; };
  function fillFamilies() {
    var t = $('ex-filter').value;
    state.list = D.examples.filter(function (f) { return !t || f.sets.L.type === t; });
    $('ex-family').innerHTML = state.list.map(function (f, i) { return '<option value="' + i + '">' + esc(short(f.A, 46) + '  /  ' + short(f.B, 46)) + '</option>'; }).join('');
    state.i = 0;
  }
  function renderScore() {
    var n = state.log.length;
    if (!state.quiz || !n) { $('ex-score').innerHTML = state.quiz ? 'Answer a few inputs to see how you compare with the models.' : ''; return; }
    var you = 0, best = 0, inst = 0;
    state.log.forEach(function (x) {
      you += x.g === x.c.gold; best += x.c.ans[BEST][0] === x.c.gold;
      INST.forEach(function (k) { inst += x.c.ans[k][0] === x.c.gold; });
    });
    $('ex-score').innerHTML = '<b>You: ' + you + ' / ' + n + '</b><span>GPT-6.1 Sol: ' + best + ' / ' + n + '</span>' +
      '<span>Open instruction models, average: ' + (inst / INST.length).toFixed(1) + ' / ' + n + '</span>';
  }
  function renderExample() {
    var f = state.list[state.i]; if (!f) return;
    var c = f.sets[state.set], inL = {}, open = shown(f, state.set), g = state.seen[key(f, state.set)];
    f.sets.L.frames.forEach(function (x) { inL[x] = 1; });
    $('ex-family').value = state.i;
    $('ex-a').textContent = f.A; $('ex-b').textContent = f.B;
    $('ex-tabs').innerHTML = SETS.map(function (s) {
      var t = f.sets[s], o = shown(f, s);
      return '<button class="tab" role="tab" data-set="' + s + '" aria-selected="' + (s === state.set) + '"><b>' + s + '</b>' +
             (o ? '<span class="dot ' + (t.type || '') + '"></span>' + goldText(t) : '<span class="dot q"></span>' + t.frames.length + ' frames') + '</button>';
    }).join('');
    $('ex-setnote').textContent = NOTE[state.set];
    $('ex-frames').className = 'frames' + (c.frames.length === 4 ? ' four' : '');
    $('ex-frames').innerHTML = c.frames.map(function (x) {
      var added = (state.set === 'K' || state.set === 'P') && !inL[x];
      return '<figure class="' + (added ? 'added' : '') + '"><img loading="lazy" src="assets/frames/' + f.id + '/' + x + '.webp" alt="Frame at ' + esc(f.times[x]) + '">' +
             '<figcaption><span>' + esc(f.times[x]) + '</span><span>' + (added ? 'added' : '') + '</span></figcaption></figure>';
    }).join('');
    // quiz
    $('ex-guess').hidden = !state.quiz;
    $('ex-card').classList.toggle('is-hidden', !open);
    $('ex-reveal').setAttribute('aria-hidden', String(!open));
    Array.prototype.forEach.call($('ex-guess').querySelectorAll('button'), function (b) {
      b.disabled = open; b.setAttribute('aria-pressed', String(open && b.dataset.g === g && g !== ''));
      b.classList.toggle('right', open && g && b.dataset.g === g && g === c.gold);
      b.classList.toggle('wrong', open && g && b.dataset.g === g && g !== c.gold);
    });
    if (state.quiz && open && g) {
      var same = c.ans.filter(function (a) { return a[0] === g; }).length;
      $('ex-result').innerHTML = (g === c.gold ? '<b class="r">Right.</b> ' : '<b class="w">Not quite.</b> The reference answer is ' + goldText(c) + '. ') +
        same + ' of ' + D.models.length + ' configurations answered &ldquo;' + GUESS[g] + '&rdquo; too.';
    } else $('ex-result').textContent = state.quiz && !open ? 'Judge only from the frames shown. The reference answer and model answers appear after you choose.' : '';
    $('ex-gold').textContent = goldText(c); $('ex-gold').className = 'gold ' + (c.type || '');
    $('ex-occ').innerHTML = ['A', 'B'].map(function (t, k) {
      return '<span class="occ ' + (c.occ[k] ? 'yes' : 'no') + '">Action ' + t + ': <i>' + (c.occ[k] ? 'established' : 'not established') + '</i></span>';
    }).join('');
    $('ex-answers').innerHTML = D.models.map(function (m, k) {
      var a = c.ans[k][0];
      return '<span class="chip ' + (a === c.gold ? 'ok' : 'bad') + '">' + esc(m) + '<b>' + esc(a) + '</b></span>';
    }).join('');
    $('ex-count').textContent = 'Example ' + (state.i + 1) + ' of ' + state.list.length + ' · ' + f.source + ' · family ' + f.id +
      '. A sample of ' + D.examples.length + ' of the ' + D.total + ' families is shown here.';
    renderScore();
  }
  fillFamilies(); renderExample();
  $('ex-filter').addEventListener('change', function () { fillFamilies(); renderExample(); });
  $('ex-family').addEventListener('change', function () { state.i = +this.value; renderExample(); });
  $('ex-prev').addEventListener('click', function () { state.i = (state.i - 1 + state.list.length) % state.list.length; renderExample(); });
  $('ex-next').addEventListener('click', function () { state.i = (state.i + 1) % state.list.length; renderExample(); });
  $('ex-tabs').addEventListener('click', function (e) { var b = e.target.closest('.tab'); if (b) { state.set = b.dataset.set; renderExample(); } });
  $('ex-quiz').addEventListener('change', function () { state.quiz = this.checked; renderExample(); });
  $('ex-guess').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-g]'); if (!b || b.disabled) return;
    var f = state.list[state.i], k = key(f, state.set);
    if (state.seen[k] !== undefined) return;
    state.seen[k] = b.dataset.g;
    if (b.dataset.g) state.log.push({ c: f.sets[state.set], g: b.dataset.g });
    renderExample();
  });
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

  // ---- teaser video: no autoplay for reduced motion; pause while off screen
  var tv = $('teaser-video');
  if (tv) {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { tv.removeAttribute('autoplay'); tv.pause(); }
    else if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { var p = tv.play(); if (p && p.catch) p.catch(function () {}); } else tv.pause(); });
      }, { threshold: .25 }).observe(tv);
    }
  }
})();
