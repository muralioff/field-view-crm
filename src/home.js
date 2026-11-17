/* ============================================================
   Home — Beat Planner Manager Home and Rep Home
   The cases from home-v2.html (Zoho CRM Canvas home), drawn with this
   project's colours. Data is illustrative, set on the prototype's
   "today" — Mon 4 May 2026, 10:00 AM, the morning BP-003 starts — with
   the reps and beats the other screens use. Jenny Wilson is the manager;
   the Rep Home is Cameron Williamson's.
   ============================================================ */
Strings.ready.then(() => {
  const { t } = Strings;
  const $ = id => document.getElementById(id);
  const escape = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  const MANAGER = 'Jenny Wilson';
  const REP = 'Cameron Williamson';
  const C = {
    blue: css('--hm-blue'), soft: css('--hm-blue-soft'), mid: css('--hm-blue-mid'), grid: css('--hm-grid'),
    green: css('--hm-green'), orange: css('--hm-orange'), violet: css('--hm-violet'),
    red: css('--hm-red'), amber: css('--hm-amber'), grey: css('--hm-grey'),
    text: '#616e88', base: '#313949', heading: '#202123',
  };
  const money = n => `$${n.toLocaleString('en-US')}`;

  /* SVG text in the card's type */
  function T(x, y, s, o = {}) {
    return `<text x="${x}" y="${y}" font-size="${o.fs || 11}" fill="${o.c || C.text}" text-anchor="${o.a || 'middle'}"${o.w ? ` font-weight="${o.w}"` : ''}>${escape(s)}</text>`;
  }

  /* ── Data (Mon 4 May 2026, 10:00 AM) ───────────────── */
  /* [rep, completed this week, weekly target, missed, rejected, cancelled,
      avg minutes, planned km, actual km] — the week is Monday so far */
  const REPS = [
    ['Savannah Nguyen',    2, 30, 0, 0, 0, 22, 18.0, 15.2],
    ['Kathryn Murphy',     1, 28, 0, 0, 1, 19, 12.0,  6.4],
    ['Cody Fisher',        1, 26, 0, 0, 0, 25, 14.0,  9.8],
    ['Devon Lane',         1, 30, 0, 0, 0, 18, 16.0,  7.1],
    ['Cameron Williamson', 0, 30, 0, 1, 0,  0, 26.1,  0.0],
    ['Annette Black',      0, 28, 0, 2, 0,  0, 20.0,  0.0],
  ];
  const first = name => name.split(' ')[0];
  const ranked = REPS.map(r => [r[0], Math.round(r[1] / r[2] * 100)]).sort((a, b) => b[1] - a[1]);

  /* ── Charts ────────────────────────────────────────── */
  function donut(el, data, sub) {
    const total = data.reduce((n, d) => n + d[1], 0);
    const R = 52, r = 34, cx = 64, cy = 64;
    let a = -Math.PI / 2, paths = '';
    const at = (rad, an) => `${(cx + rad * Math.cos(an)).toFixed(2)} ${(cy + rad * Math.sin(an)).toFixed(2)}`;
    data.forEach(([label, v, col]) => {
      if (!v) return;
      /* a single slice is a full ring, which an arc cannot draw */
      if (v === total) {
        paths += `<circle cx="${cx}" cy="${cy}" r="${(R + r) / 2}" fill="none" stroke="${col}" stroke-width="${R - r}"><title>${escape(label)}: ${v}</title></circle>`;
        return;
      }
      const a2 = a + v / total * Math.PI * 2, big = a2 - a > Math.PI ? 1 : 0;
      paths += `<path d="M${at(R, a)} A${R} ${R} 0 ${big} 1 ${at(R, a2)} L${at(r, a2)} A${r} ${r} 0 ${big} 0 ${at(r, a)} Z" fill="${col}" stroke="#fff" stroke-width="1.5"><title>${escape(label)}: ${v}</title></path>`;
      a = a2;
    });
    paths += T(cx, cy + 2, total, { fs: 20, c: C.heading, w: 600 }) + T(cx, cy + 16, sub, { fs: 10 });
    el.innerHTML = `<div class="hm-donut"><svg viewBox="0 0 128 128" width="128" height="128" aria-hidden="true">${paths}</svg>
      <ul>${data.map(([label, v, col]) => `<li><i style="background:${col}"></i><span>${escape(label)}</span><b>${v}</b></li>`).join('')}</ul></div>`;
  }

  /* Columns: data rows [label, value, value…]; o: { W, H, max, step, colors, unit, bar, labels } */
  function columns(el, data, o) {
    const { W, H } = o, pl = 30, pr = 8, pt = 14, pb = 26, n = data.length, series = data[0].length - 1;
    const y = v => H - pb - v / o.max * (H - pb - pt);
    let g = '';
    for (let k = 0; k <= o.max; k += o.step) {
      g += `<line x1="${pl}" x2="${W - pr}" y1="${y(k)}" y2="${y(k)}" stroke="${C.grid}"/>${T(pl - 5, y(k) + 4, k, { a: 'end' })}`;
    }
    const bw = (W - pl - pr) / n, inner = Math.min(o.bar || 34, bw * 0.6), each = inner / series;
    data.forEach((d, i) => {
      const x0 = pl + i * bw + (bw - inner) / 2;
      for (let s = 0; s < series; s++) {
        const v = d[s + 1], x = x0 + s * each;
        g += `<rect x="${x.toFixed(1)}" y="${y(v).toFixed(1)}" width="${(each - (series > 1 ? 2 : 0)).toFixed(1)}" height="${(H - pb - y(v)).toFixed(1)}" rx="2" fill="${o.colors[s]}"><title>${escape(d[0])}: ${v}${o.unit || ''}</title></rect>`;
        if (o.labels !== false) g += T(x + each / 2, y(v) - 4, v, { fs: 10, c: C.base });
      }
      g += T(pl + i * bw + bw / 2, H - 8, d[0], { fs: 10.5 });
    });
    el.innerHTML = g;
  }

  function rows(el, list, max, unit) {
    el.innerHTML = list.map(([label, v, col]) => `
      <div class="hm-row"><span class="lab">${escape(label)}</span>
        <div class="hm-track"><span class="done" style="width:${v / max * 100}%;background:${col}"></span></div>
        <span class="hm-num">${v}${unit}</span></div>`).join('');
  }

  const kpi = (big, small, sub, cls = '') => `
    <p class="hm-kpi ${cls}">${escape(big)}${small ? ` <small>${escape(small)}</small>` : ''}</p>
    ${sub ? `<p class="hm-kpi-sub">${sub}</p>` : ''}`;

  /* ── Manager home ──────────────────────────────────── */
  function drawManager() {
    $('hm-mgr-today').textContent = t('home.date.today');
    $('hm-mgr-week').textContent = t('home.date.weekSoFar');

    $('m-score').innerHTML = [
      [t('beatDetail.status.inProgress'), 4, C.orange],
      [t('beatDetail.status.completed'), 0, C.green],
      [t('beatDetail.status.upcoming'), 2, C.violet],
      [t('beatDetail.status.cancelled'), 0, C.red],
    ].map(([lab, v, col]) => `<div style="border-color:${col}"><div class="lab">${escape(lab)}</div><div class="v">${v}</div></div>`).join('');

    $('m-visits-today').innerHTML = kpi('5', t('home.kpi.ofPlanned', { n: 30 }), escape(t('home.kpi.completedSoFar', { pct: 17 })));
    $('m-missed-today').innerHTML = kpi('1', '', escape(t('home.kpi.missedOverdue', { missed: 0, overdue: 1 })) + ` ${escape(t('home.kpi.team'))}`, 'hm-red-text');

    $('m-target').innerHTML = REPS.map(r => {
      const done = r[1] / 30 * 100, tgt = r[2] / 30 * 100;
      return `<div class="hm-row"><span class="nm">${escape(r[0])}</span>
        <div class="hm-track"><span class="done" style="width:${done}%;background:${C.blue}"></span><span class="tgt" style="left:calc(${tgt}% - 1px)"></span></div>
        <span class="hm-num">${r[1]} / ${r[2]}</span></div>`;
    }).join('');

    $('m-rank').innerHTML = ranked.map(([name, pct], i) => `
      <li><span class="pos">${i + 1}</span><span class="nm">${escape(name)}</span><span class="rb"><span style="width:${pct}%"></span></span><span class="pc">${pct}%</span></li>`).join('');

    const STACK = [[t('home.legend.completed'), C.green], [t('beatDetail.status.missed'), C.red],
                   [t('bottomUp.status.rejected'), C.amber], [t('beatDetail.status.cancelled'), C.grey]];
    $('m-stack').innerHTML = REPS.map(r => {
      const vals = [r[1], r[3], r[4], r[5]], total = vals.reduce((n, v) => n + v, 0);
      return `<div class="hm-row"><span class="nm">${escape(r[0])}</span>
        <div class="hm-stack">${vals.map((v, i) => `<span style="width:${v / 6 * 100}%;background:${STACK[i][1]}" title="${escape(STACK[i][0])} ${v}"></span>`).join('')}</div>
        <span class="hm-num">${total}</span></div>`;
    }).join('');
    $('m-stack-legend').innerHTML = STACK.map(([lab, col]) => `<span><i style="background:${col}"></i>${escape(lab)}</span>`).join('');

    const thisWeek = REPS.reduce((n, r) => n + r[1], 0), lastWeek = 7;
    const change = Math.round((thisWeek - lastWeek) / lastWeek * 100);
    $('m-compare').innerHTML = `
      <div class="hm-cmp">
        <div><p class="hm-kpi-sub" style="margin:0">${escape(t('home.cmp.thisWeek'))}</p><p class="hm-kpi">${thisWeek}</p></div>
        <div><p class="hm-kpi-sub" style="margin:0">${escape(t('home.cmp.lastWeek'))}</p><p class="hm-kpi" style="color:${C.text}">${lastWeek}</p></div>
      </div>
      <p class="hm-kpi-sub" style="margin-top:12px"><span class="hm-down">▼ ${Math.abs(change)}%</span> ${escape(t('home.cmp.change', { n: thisWeek - lastWeek }))}</p>
      <div class="hm-bar"><span style="width:${thisWeek / lastWeek * 100}%;background:${C.blue}"></span></div>
      <div class="hm-bar"><span style="width:100%;background:${C.mid}"></span></div>`;

    columns($('m-duration'), REPS.map(r => [first(r[0]), r[6]]), { W: 560, H: 200, max: 35, step: 5, colors: [C.blue], unit: ' min' });
    columns($('m-mileage'), REPS.map(r => [first(r[0]), r[7], r[8]]), { W: 560, H: 200, max: 30, step: 5, colors: [C.soft, C.blue], unit: ' km', bar: 44, labels: false });

    drawAnomaly();
    $('m-expenses-sub').textContent = t('home.kpi.claimed', { amount: money(486) });

    donut($('m-donut'), [
      [t('beatDetail.status.inProgress'), 4, C.orange],
      [t('beatDetail.status.upcoming'), 5, C.violet],
      [t('beatDetail.status.completed'), 1, C.green],
      [t('beatDetail.status.cancelled'), 1, C.red],
    ], t('home.donut.beats'));
  }

  /* 30 days to today (4 May 2026): weekdays about 26–33, weekends low,
     one unusual dip on Thu 23 Apr, and today still in progress */
  function drawAnomaly() {
    const today = new Date(2026, 4, 4), days = [];
    for (let i = 29; i >= 0; i--) { const d = new Date(today); d.setDate(today.getDate() - i); days.push(d); }
    const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let seed = 7;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const vals = days.map(d => { const w = d.getDay(); return w === 0 ? 0 : w === 6 ? Math.round(3 + rnd() * 3) : Math.round(26 + rnd() * 7); });
    const idx = (m, dd) => days.findIndex(d => d.getMonth() === m && d.getDate() === dd);
    vals[idx(3, 23)] = 12;
    vals[days.length - 1] = 5;
    const lo = days.map(d => (d.getDay() % 6 === 0 ? 0 : 22)), hi = days.map(d => (d.getDay() === 0 ? 4 : d.getDay() === 6 ? 8 : 36));
    const W = 1100, H = 190, pl = 34, pr = 14, pt = 10, pb = 26, n = days.length;
    const x = i => pl + i * (W - pl - pr) / (n - 1), y = v => H - pb - v / 40 * (H - pb - pt);
    let g = '';
    for (let k = 0; k <= 40; k += 10) g += `<line x1="${pl}" x2="${W - pr}" y1="${y(k)}" y2="${y(k)}" stroke="${C.grid}"/>${T(pl - 6, y(k) + 4, k, { a: 'end' })}`;
    const top = [], bot = [];
    days.forEach((d, i) => { top.push(`${x(i).toFixed(1)},${y(hi[i]).toFixed(1)}`); bot.unshift(`${x(i).toFixed(1)},${y(lo[i]).toFixed(1)}`); });
    g += `<polygon points="${top.join(' ')} ${bot.join(' ')}" fill="#e8ebfb"/>`;
    g += `<polyline points="${vals.slice(0, n - 1).map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}" fill="none" stroke="${C.blue}" stroke-width="2.2" stroke-linejoin="round"/>`;
    g += `<line x1="${x(n - 2)}" y1="${y(vals[n - 2])}" x2="${x(n - 1)}" y2="${y(vals[n - 1])}" stroke="${C.blue}" stroke-width="2.2" stroke-dasharray="4 3"/>`;
    days.forEach((d, i) => {
      const v = vals[i], label = `${d.getDate()} ${MON[d.getMonth()]}`;
      if (i === n - 1) g += `<circle cx="${x(i)}" cy="${y(v)}" r="5" fill="#fff" stroke="${C.blue}" stroke-width="2"><title>${escape(t('home.anomaly.todayTip', { date: label, n: v }))}</title></circle>`;
      else if (v < lo[i] || v > hi[i]) {
        g += `<circle cx="${x(i)}" cy="${y(v)}" r="6" fill="${C.red}" stroke="#fff" stroke-width="2"><title>${escape(label)}: ${v}</title></circle>`;
        g += T(x(i), y(v) + 20, t('home.anomaly.note', { date: label, n: v, lo: lo[i], hi: hi[i] }), { fs: 10.5, c: '#b8363a', w: 600 });
      } else g += `<circle cx="${x(i)}" cy="${y(v)}" r="2.4" fill="${C.blue}"><title>${escape(label)}: ${v}</title></circle>`;
      if (i % 4 === 1 || i === n - 1) g += T(x(i), H - 8, label, { fs: 10.5, c: i === n - 1 ? C.heading : C.text, w: i === n - 1 ? 600 : null });
    });
    g += `<line x1="${x(n - 1)}" x2="${x(n - 1)}" y1="${pt}" y2="${H - pb}" stroke="${C.grey}" stroke-dasharray="3 3"/>${T(x(n - 1) - 4, pt + 10, t('home.chart.today'), { a: 'end', fs: 10.5, c: C.base, w: 600 })}`;
    $('m-anomaly').innerHTML = g;
  }

  /* ── Rep home (Cameron Williamson) ─────────────────── */
  function drawRep() {
    $('hm-rep-today').textContent = t('home.date.todayAs', { rep: REP });
    $('hm-rep-week').textContent = t('home.date.weekSoFar');
    $('hm-rep-month').textContent = t('home.date.monthSoFar');

    /* BP-003 Day 1: four visits, the day not started yet */
    $('r-visits-today').innerHTML = kpi('0', t('home.kpi.ofPlanned', { n: 4 }), escape(t('home.kpi.dayNotStarted')));
    $('r-missed-today').innerHTML = kpi('0', '', escape(t('home.kpi.missedOverdue', { missed: 0, overdue: 0 })));
    donut($('r-donut'), [
      [t('home.checkin.out'), 0, C.green],
      [t('home.checkin.in'), 0, C.blue],
      [t('home.checkin.not'), 4, C.grey],
      [t('beatDetail.status.missed'), 0, C.red],
    ], t('home.donut.visits'));
    $('r-duration').outerHTML = `<p class="hm-nodata" id="r-duration">${escape(t('home.empty.noCheckout'))}</p>`;

    /* Dial: this week's target, 0 of 30 so far */
    const done = 0, target = 30, pct = done / target;
    const cx = 110, cy = 112, R = 88, ang = Math.PI * (1 - pct);
    const ex = cx + R * Math.cos(ang), ey = cy - R * Math.sin(ang);
    $('r-dial').innerHTML = `<path d="M22 112 A88 88 0 0 1 198 112" fill="none" stroke="${C.grid}" stroke-width="18" stroke-linecap="round"/>`
      + (pct > 0 ? `<path d="M22 112 A88 88 0 0 1 ${ex.toFixed(1)} ${ey.toFixed(1)}" fill="none" stroke="${C.blue}" stroke-width="18" stroke-linecap="round"/>` : '')
      + `<line x1="${cx}" y1="${cy}" x2="${(cx + 66 * Math.cos(ang)).toFixed(1)}" y2="${(cy - 66 * Math.sin(ang)).toFixed(1)}" stroke="${C.heading}" stroke-width="3" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="6" fill="${C.heading}"/>`
      + T(22, 128, '0') + T(198, 128, target);
    $('r-dial-text').innerHTML = kpi(String(done), t('home.kpi.ofVisits', { n: target }), escape(t('home.kpi.ofWeeklyTarget', { pct: Math.round(pct * 100) })));

    $('r-rank-sub').textContent = t('home.rank.sub', { n: REPS.length });
    $('r-rank').innerHTML = ranked.map(([name, p], i) => {
      const me = name === REP;
      return `<li${me ? ' class="me"' : ''}><span class="pos">${i + 1}</span><span class="nm">${me ? `<b>${escape(t('home.rank.you'))}</b>` : escape(first(name))}</span><span class="rb"><span style="width:${p}%"></span></span><span class="pc">${p}%</span></li>`;
    }).join('');

    /* This rep's beats from the other screens: BP-003, BP-005, BP-008 */
    columns($('r-upcoming'), [['4 May', 9], ['28 May', 8], ['8 Jun', 6]], { W: 300, H: 170, max: 10, step: 2, colors: [C.violet], unit: ' Visits', bar: 30 });

    /* This month so far: 1–4 May, today in progress */
    const perDay = [['Fri 1', 6], ['Sat 2', 2], ['Sun 3', 0], ['Mon 4', 0]];
    $('r-perday-sub').textContent = t('home.perDay.sub');
    (() => {
      const W = 560, H = 200, pl = 30, pr = 30, pt = 16, pb = 28, max = 8, n = perDay.length;
      const x = i => pl + i * (W - pl - pr) / (n - 1), y = v => H - pb - v / max * (H - pb - pt);
      let g = '';
      for (let k = 0; k <= max; k += 2) g += `<line x1="${pl}" x2="${W - pr}" y1="${y(k)}" y2="${y(k)}" stroke="${C.grid}"/>${T(pl - 6, y(k) + 4, k, { a: 'end' })}`;
      const pts = perDay.map((d, i) => `${x(i).toFixed(1)},${y(d[1]).toFixed(1)}`).join(' ');
      g += `<polygon points="${x(0)},${y(0)} ${pts} ${x(n - 1)},${y(0)}" fill="${C.blue}" opacity=".08"/>`;
      g += `<polyline points="${pts}" fill="none" stroke="${C.blue}" stroke-width="2.4" stroke-linejoin="round"/>`;
      perDay.forEach((d, i) => {
        const last = i === n - 1;
        g += `<circle cx="${x(i)}" cy="${y(d[1])}" r="${last ? 5 : 3.4}" fill="${last ? '#fff' : C.blue}" stroke="${C.blue}" stroke-width="2"><title>${escape(d[0])} May: ${d[1]}</title></circle>`
          + T(x(i), y(d[1]) - 10, d[1], { fs: 10.5, c: C.base, w: 600 })
          + T(x(i), H - 9, `${d[0]} May`, { fs: 10.5, c: last ? C.heading : C.text, w: last ? 600 : null });
      });
      g += T(x(n - 1), pt - 4, t('home.chart.today'), { fs: 10.5, c: C.base, w: 600 });
      $('r-line').innerHTML = g;
    })();

    $('r-avg').innerHTML = kpi('23', t('home.unit.min'), `<span class="hm-up">▲ 2 min</span> ${escape(t('home.avg.vsLast', { last: '21 min' }))}`)
      + '<div id="r-avg-bars" style="margin-top:14px"></div>';
    rows($('r-avg-bars'), [[t('home.month.thisSoFar'), 23, C.blue], [t('home.month.last'), 21, C.mid]], 30, ' min');

    (() => {
      const list = [['Travel', 124], ['Food', 38], ['Parking', 12], ['Other', 6]];
      const W = 560, pl = 70, pr = 70, rowH = 30, max = 140;
      let g = '';
      list.forEach(([label, v], i) => {
        const yy = 10 + i * rowH, w = (W - pl - pr) * v / max;
        g += T(pl - 10, yy + 15, label, { a: 'end', fs: 12, c: C.base })
          + `<rect x="${pl}" y="${yy}" width="${W - pl - pr}" height="20" rx="3" fill="${C.grid}"/>`
          + `<rect x="${pl}" y="${yy}" width="${w.toFixed(1)}" height="20" rx="3" fill="${C.blue}"><title>${escape(label)}: ${money(v)}</title></rect>`
          + T(pl + w + 8, yy + 15, money(v), { a: 'start', fs: 12, c: C.heading, w: 600 });
      });
      g += T(pl, 10 + list.length * rowH + 14, t('home.expenses.total', { amount: money(180) }), { a: 'start', fs: 11.5 });
      $('r-expenses').innerHTML = g;
    })();

    $('r-distance').innerHTML = kpi('46.2', t('home.unit.km'), `<span class="hm-up">▲ 10%</span> ${escape(t('home.distance.vsLast', { last: '41.9 km' }))}`)
      + '<div id="r-dist-bars" style="margin-top:14px"></div>';
    rows($('r-dist-bars'), [[t('home.month.thisRange'), 46.2, C.blue], [t('home.month.lastRange'), 41.9, C.mid]], 60, ' km');
  }

  /* ── Which home ────────────────────────────────────── */
  const NAMES = {
    classic: () => t('home.switch.classic'),
    personal: () => t('home.switch.personal', { name: MANAGER }),
    manager: () => t('home.switch.manager'),
    rep: () => t('home.switch.rep'),
  };
  const btn = $('hm-switch-btn'), menu = $('hm-switch-menu');
  $('hm-switch-personal').textContent = NAMES.personal();

  function setMenu(open) {
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    if (open) (menu.querySelector('.selected') || menu.querySelector('.bd-vmenu-item')).focus();
  }

  function setHome(home) {
    $('home-manager').hidden = home !== 'manager';
    $('home-rep').hidden = home !== 'rep';
    $('home-placeholder').hidden = home === 'manager' || home === 'rep';
    $('hm-empty-title').textContent = NAMES[home]();
    $('hm-switch-label').textContent = NAMES[home]();
    $('hm-welcome').textContent = t('home.welcome', { name: home === 'rep' ? REP : MANAGER });
    menu.querySelectorAll('[data-home]').forEach(b => b.classList.toggle('selected', b.dataset.home === home));
    try { history.replaceState(null, '', `#${home}`); } catch { /* file:// */ }
    document.querySelector('.hm-scroll').scrollTop = 0;
  }

  btn.addEventListener('click', e => { e.stopPropagation(); setMenu(menu.hidden); });
  menu.addEventListener('click', e => {
    const item = e.target.closest('.bd-vmenu-item');
    if (!item) return;
    setMenu(false);
    btn.focus();
    if (item.dataset.home) setHome(item.dataset.home);
    else toast(t('home.toast.notInPrototype', { action: t('home.switch.customize') }));
  });
  document.addEventListener('click', e => { if (!e.target.closest('.hm-switch')) setMenu(false); });
  document.addEventListener('keydown', e => {
    if (menu.hidden) return;
    const items = [...menu.querySelectorAll('.bd-vmenu-item')];
    const at = items.indexOf(document.activeElement);
    if (e.key === 'Escape') { setMenu(false); btn.focus(); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      items[(at + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus();
    }
  });
  $('hm-refresh').addEventListener('click', () => toast(t('home.toast.notInPrototype', { action: t('home.refresh.ariaLabel') })));
  $('hm-more').addEventListener('click', () => toast(t('home.toast.notInPrototype', { action: t('home.more.ariaLabel') })));

  /* ── Toast (the detail page's) ─────────────────────── */
  const toastEl = $('bd-toast');
  function toast(message) {
    toastEl.innerHTML = `
      <img class="bd-toast-icon" src="src/toast-tick.svg" alt="" aria-hidden="true" />
      <span class="bd-toast-text">${escape(message)}</span>
      <button class="bd-toast-close" type="button" aria-label="${escape(t('beatDetail.toast.dismiss.ariaLabel'))}">
        <img src="src/toast-close.svg" alt="" aria-hidden="true" /></button>`;
    toastEl.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove('show'), 3200);
  }
  toastEl.addEventListener('click', e => {
    if (!e.target.closest('.bd-toast-close')) return;
    clearTimeout(toast._t);
    toastEl.classList.remove('show');
  });

  drawManager();
  drawRep();
  const start = location.hash.slice(1);
  setHome(NAMES[start] ? start : 'manager');
});
