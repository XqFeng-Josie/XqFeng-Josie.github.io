/* Evidence-led replay: one frame per recorded iteration, no synthetic metrics. */
window.caseReplays = function () {
  return {
    cases: [], selected: 0, cursor: 0, playing: false, speed: 3, loading: true, error: '', timer: null,
    observer: null, visibilityHandler: null, inView: false, autoPending: true,
    async init() {
      this.visibilityHandler = () => { if (document.hidden) this.suspend(); else this.autoplay(); };
      document.addEventListener('visibilitychange', this.visibilityHandler);
      this.observer = new IntersectionObserver(entries => {
        this.inView = entries[0].isIntersecting;
        if (this.inView) this.autoplay(); else this.suspend();
      }, { threshold: 0.1 });
      this.observer.observe(this.$el);
      await this.load();
    },
    async load() {
      this.loading = true; this.error = '';
      try {
        const response = await fetch('./api/case-replays.json?v=cifar-5', { cache: 'no-store' });
        if (!response.ok) throw new Error('Replay unavailable');
        this.cases = (await response.json()).cases;
      } catch (_) { this.error = 'The replay could not load. Please try again.'; }
      finally { this.loading = false; this.autoplay(); }
    },
    destroy() { this.pause(); this.observer?.disconnect(); document.removeEventListener('visibilitychange', this.visibilityHandler); },
    get study() { return this.cases[this.selected]; },
    get frame() { return this.study?.frames[this.cursor]; },
    get evidence() { return this.study?.evidence.find(e => e.iteration === this.frame?.iteration); },
    get ended() { return !!this.study && this.cursor === this.study.frames.length - 1; },
    get visible() { return this.study?.frames.slice(0, this.cursor + 1) || []; },
    get accepted() { return this.visible.filter(f => Number.isFinite(f.value)); },
    get best() { const values = this.accepted.map(f => f.value); return values.length ? (this.study.higher_is_better ? Math.max(...values) : Math.min(...values)) : null; },
    get status() { return Number.isFinite(this.frame?.value) ? 'Evaluation accepted' : this.frame?.submitted ? 'No valid score returned' : 'Working · no evaluation submitted'; },
    get domain() {
      const values = this.study?.frames.map(f => f.value).filter(Number.isFinite) || [];
      values.push(this.study?.theoretical_best, this.study?.theoretical_worst);
      const finite = values.filter(Number.isFinite);
      if (!finite.length) return [0, 1];
      const min = Math.min(...finite), max = Math.max(...finite);
      const padding = Math.max(max - min, 0.02) * 0.16;
      return [min - padding, max + padding];
    },
    x(iteration) { return 48 + (iteration - 1) / Math.max(1, (this.study?.total_iterations || 1) - 1) * 480; },
    y(value) { const [min, max] = this.domain; return 205 - (value - min) / (max - min) * 170; },
    get references() {
      if (!this.study) return [];
      return [
        { kind: 'best', value: this.study.theoretical_best, label: '🌟 Theoretical best' },
        { kind: 'worst', value: this.study.theoretical_worst, label: 'Theoretical worst' },
      ].filter(ref => Number.isFinite(ref.value));
    },
    get xTicks() {
      const total = this.study?.total_iterations || 1;
      return [...new Set([1, ...Array.from({ length: 5 }, (_, i) => Math.round(1 + (total - 1) * (i + 1) / 5))])];
    },
    get bestPoint() { return this.accepted.find(f => f.value === this.best); },
    get scorePath() { return this.accepted.map((f, i) => `${i ? 'L' : 'M'}${this.x(f.iteration)},${this.y(f.value)}`).join(' '); },
    get chartMarkup() {
      // SVG <template> is not an HTMLTemplateElement; render SVG primitives directly.
      // All interpolated values below are numeric or controlled local labels.
      let svg = '';
      for (const fraction of [0, .2, .4, .6, .8, 1]) {
        const y = 205 - fraction * 170;
        svg += `<line x1="48" x2="528" y1="${y}" y2="${y}" class="cr-grid"/><text x="39" y="${y + 4}" text-anchor="end">${this.format(this.domain[0] + fraction * (this.domain[1] - this.domain[0]))}</text>`;
      }
      for (const tick of this.xTicks) svg += `<line x1="${this.x(tick)}" x2="${this.x(tick)}" y1="35" y2="205" class="cr-grid"/><text x="${this.x(tick)}" y="237" text-anchor="middle">${tick}</text>`;
      svg += `<path d="${this.scorePath}" class="cr-score-line"/><line x1="${this.x(this.frame.iteration)}" x2="${this.x(this.frame.iteration)}" y1="25" y2="210" class="cr-playhead"/><path d="${this.bestPath}" class="cr-best-line"/>`;
      for (const point of this.visible) {
        if (Number.isFinite(point.value)) svg += `<circle cx="${this.x(point.iteration)}" cy="${this.y(point.value)}" r="${point.iteration === this.frame.iteration ? 5 : 3.5}" class="cr-score-dot"/>`;
        else if (point.submitted) svg += `<text x="${this.x(point.iteration)}" y="218" text-anchor="middle" class="cr-missing">×</text>`;
      }
      svg += '<text x="288" y="255" text-anchor="middle">Iteration</text>';
      for (const ref of this.references) svg += `<g class="cr-reference cr-reference-${ref.kind}"><line x1="48" x2="528" y1="${this.y(ref.value)}" y2="${this.y(ref.value)}"/><text x="524" y="${this.y(ref.value) - 8}" text-anchor="end">${ref.label} · ${this.format(ref.value)}</text></g>`;
      if (this.bestPoint) svg += `<circle cx="${this.x(this.bestPoint.iteration)}" cy="${this.y(this.best)}" r="6" class="cr-agent-best"/>`;
      return svg;
    },
    get bestPath() {
      let best = null, path = '';
      for (const f of this.visible) {
        if (Number.isFinite(f.value)) {
          const next = best === null ? f.value : this.study.higher_is_better ? Math.max(best, f.value) : Math.min(best, f.value);
          path += best === null ? `M${this.x(f.iteration)},${this.y(next)}` : ` H${this.x(f.iteration)} V${this.y(next)}`;
          best = next;
        } else if (best !== null) path += ` H${this.x(f.iteration)}`;
      }
      return path;
    },
    format(value) { return Number.isFinite(value) ? (Math.abs(value) >= 100 ? value.toFixed(1) : value.toFixed(3)) : '—'; },
    animateFrame() {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      this.$refs.decision?.animate([
        { opacity: 0.3, transform: 'translateY(5px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 420, easing: 'ease-out' });
    },
    choose(index) { this.pause(); this.selected = index; this.cursor = 0; this.autoPending = true; this.autoplay(); },
    seek(index) { this.pause(); this.cursor = Math.max(0, Math.min(this.study.frames.length - 1, Number(index))); },
    jump(iteration) { this.seek(this.study.frames.findIndex(f => f.iteration === iteration)); },
    autoplay() {
      if (!this.autoPending || !this.study || !this.inView || document.hidden) return;
      this.autoPending = false; this.playing = true; this.schedule();
    },
    suspend() { const resume = this.playing || this.autoPending; this.pause(); this.autoPending = resume; },
    pause() { this.autoPending = false; this.playing = false; clearTimeout(this.timer); },
    toggle() { if (this.playing) return this.pause(); if (this.ended) this.cursor = 0; this.playing = true; this.schedule(); },
    schedule() {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        if (!this.playing) return;
        if (this.ended) {
          this.selected = (this.selected + 1) % this.cases.length;
          this.cursor = 0;
        } else this.cursor++;
        this.schedule();
      }, this.ended ? 2400 : (this.evidence ? 5200 : 2600) / this.speed);
    },
    changeSpeed() { this.speed = ({ 1: 2, 2: 3, 3: 5, 5: 1 })[this.speed] || 3; if (this.playing) this.schedule(); },
    get trajectoryLink() { return this.study ? '#/experiment/' + encodeURIComponent(this.study.task) + '/' + encodeURIComponent(this.study.experiment_id) + '/iter/' + this.frame.iteration : '#/'; },
  };
};
