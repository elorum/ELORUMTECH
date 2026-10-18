/* ELORUMTECH Display & Connection Solver — page glue (progressive enhancement).
 * Without JavaScript the page still shows the static tables, checklists and sources; this script only
 * wires the form to ElorumDisplay.quickSolve and renders the result. User input is only ever written with
 * textContent (never innerHTML). */
(function () {
  'use strict';
  var E = window.ElorumDisplay;
  var form = document.getElementById('solver-form');
  var out = document.getElementById('solver-result');
  if (!E || !form || !out) return;
  form.hidden = false;
  var nojs = document.getElementById('solver-nojs');
  if (nojs) nojs.hidden = true;

  function $(id) { return document.getElementById(id); }
  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    return n;
  }
  var VERDICT_TEXT = {
    PASS: 'PASS — verified for your exact parts',
    CONDITIONAL: 'CONDITIONAL — fits on paper; the listed checks must hold',
    UNKNOWN: 'UNKNOWN — not ruled out, but not confirmed',
    FAIL: 'FAIL — a documented limit rules this out'
  };
  function srcLinks(ids) {
    var span = el('span', { class: 'srcs' });
    (ids || []).forEach(function (id, i) {
      var s = E.source(id); if (!s) return;
      if (i) span.appendChild(document.createTextNode(' · '));
      var a = el('a', { href: s.url, rel: 'noopener', title: s.title + ' — checked ' + s.checked_at }, s.publisher + ' [' + id + ']');
      span.appendChild(a);
    });
    return span;
  }
  function list(items, ordered) {
    var l = el(ordered ? 'ol' : 'ul');
    items.forEach(function (it) {
      var li = el('li', null, it.text + ' ');
      if (it.sources && it.sources.length) li.appendChild(srcLinks(it.sources));
      l.appendChild(li);
    });
    return l;
  }
  function readNumber(id) { var v = parseFloat($(id).value); return isFinite(v) ? v : NaN; }

  function syncCustom() {
    var custom = $('res').value === 'custom';
    $('custom-res').hidden = !custom;
  }
  $('res').addEventListener('change', syncCustom);

  // Preselect from the query string (links from the guides), e.g. ?symptom=refresh
  try {
    var qs = new URLSearchParams(location.search);
    var sym = qs.get('symptom');
    if (sym) { var r = form.querySelector('input[name="symptom"][value="' + sym.replace(/[^a-z-]/g, '') + '"]'); if (r) r.checked = true; }
    ['source', 'middle', 'sink'].forEach(function (k) { var v = qs.get(k); if (v && $(k)) { var o = $(k).querySelector('option[value="' + v.replace(/[^a-z0-9.-]/g, '') + '"]'); if (o) $(k).value = v; } });
  } catch (e) { /* old browsers: keep defaults */ }
  syncCustom();

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    while (out.firstChild) out.removeChild(out.firstChild);
    var res = $('res').value, w, h;
    if (res === 'custom') { w = Math.round(readNumber('w')); h = Math.round(readNumber('h')); }
    else { var p = res.split('x'); w = +p[0]; h = +p[1]; }
    var symptom = (form.querySelector('input[name="symptom"]:checked') || {}).value || 'plan';
    var q = {
      symptom: symptom, h_active: w, v_active: h, refresh_hz: readNumber('hz'),
      bit_depth_bpc: +$('bpc').value, chroma: $('chroma').value, displays: +$('displays').value,
      source: $('source').value, middle: $('middle').value, sinkInput: $('sink').value, cable: $('cable').value,
      usb3_data: !$('usb2mode').checked, message: $('msg-limited').checked ? 'limited' : null, workedBefore: $('worked').checked,
      os: $('os').value
    };
    var pc = readNumber('pclk'); if (isFinite(pc) && pc > 0) q.pixel_clock_mhz = pc;
    var r;
    try { r = E.quickSolve(q); }
    catch (e) {
      var err = el('p', { class: 'err', role: 'alert' }, 'Check your input: ' + e.message.replace(/^mode: /, ''));
      out.appendChild(err); return;
    }
    var h2 = el('h2', { id: 'result-heading', tabindex: '-1' }, 'Result for ' + E.modeLabel(r.mode) + (r.displays > 1 ? ' on ' + r.displays + ' displays' : ''));
    out.appendChild(h2);
    var badge = el('p', { class: 'verdict v-' + r.verdict.toLowerCase() }, VERDICT_TEXT[r.verdict]);
    out.appendChild(badge);
    if (r.limiting_element) out.appendChild(el('p', null, 'Deciding part: ' + r.limiting_element + '.'));
    var ceil = r.lowest_max_refresh;
    if (ceil && typeof ceil.hz === 'number' && isFinite(ceil.hz) && ceil.hz > 0) out.appendChild(el('p', null, 'Calculated ceiling: the ' + ceil.element.toLowerCase() + ' can carry at most about ' + ceil.hz + ' Hz at this resolution and bit depth, before blanking (the real maximum is lower). This is arithmetic, not a verified mode.'));

    if (r.diagnosis.length) { out.appendChild(el('h3', null, 'Fix “no signal / not detected” in this order')); out.appendChild(list(r.diagnosis, true)); }
    if (r.refresh_steps.length) { out.appendChild(el('h3', null, 'Set the refresh rate')); out.appendChild(list(r.refresh_steps, true)); }

    out.appendChild(el('h3', null, 'Each part of your connection'));
    var wrap = el('div', { class: 'tablewrap', role: 'region', 'aria-label': 'Per-part results', tabindex: '0' });
    var t = el('table');
    var thead = el('thead'), tr = el('tr');
    ['Part', 'What you picked', 'Verdict', 'Why'].forEach(function (x) { tr.appendChild(el('th', { scope: 'col' }, x)); });
    thead.appendChild(tr); t.appendChild(thead);
    var tb = el('tbody');
    r.elements.forEach(function (e) {
      var row = el('tr');
      row.appendChild(el('th', { scope: 'row' }, e.element));
      row.appendChild(el('td', null, e.class_label || '—'));
      row.appendChild(el('td', null, e.verdict));
      var why = el('td', null, e.why + ' ');
      if (e.sources && e.sources.length) why.appendChild(srcLinks(e.sources));
      row.appendChild(why);
      tb.appendChild(row);
    });
    t.appendChild(tb); wrap.appendChild(t); out.appendChild(wrap);

    if (r.limits.length) { out.appendChild(el('h3', null, 'Limits that apply to this kind of connection')); out.appendChild(list(r.limits, false)); }
    if (r.to_confirm.length) { out.appendChild(el('h3', null, 'What would confirm it')); out.appendChild(list(r.to_confirm.map(function (x) { return { text: x }; }), false)); }
    out.appendChild(el('p', { class: 'note' }, r.note));
    h2.focus();
  });
})();
