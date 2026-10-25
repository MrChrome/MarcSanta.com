// Proportional vertical timeline: each era's height tracks how long it lasted,
// so scrolling the page moves through time.
var NOW = (function() {
  var d = new Date();
  return d.getFullYear() + d.getMonth() / 12;
})();

var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseRange(d) {
  if (d.birthDate) {
    var b = new Date(d.birthDate + 'T00:00:00');
    return { start: b.getFullYear() + b.getMonth() / 12, end: NOW };
  }
  var parts = d.years.split('-').map(function(p) { return p.trim(); });
  var start = parseInt(parts[0], 10);
  var end = !parts[1] ? start : /today|present/i.test(parts[1]) ? NOW : parseInt(parts[1], 10);
  return { start: start, end: end };
}

function ageOf(birthDate) {
  var now = new Date();
  var birth = new Date(birthDate + 'T00:00:00');
  var years = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) years--;
  if (years >= 1) return years + ' year' + (years === 1 ? '' : 's') + ' old';
  var months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months--;
  return months + ' month' + (months === 1 ? '' : 's') + ' old';
}

function el(tag, cls, text) {
  var node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}

function bulletList(bullets) {
  var ul = el('ul', 'era-bullets');
  bullets.forEach(function(b) {
    var isSub = b.charCodeAt(0) === 0x25aa;
    ul.appendChild(el('li', isSub ? 'sub' : null, isSub ? b.slice(1).trim() : b));
  });
  return ul;
}

// Entries that fall entirely inside an earlier era (an internship during
// school) ride alongside it instead of taking their own slot in the lane.
var eras = [];
var sideTrips = [];
timelineData.forEach(function(d) {
  if (d.type === 'personal') return;
  var r = parseRange(d);
  for (var i = 0; i < eras.length; i++) {
    var h = parseRange(eras[i]);
    if (r.start >= h.start && r.end <= h.end) {
      sideTrips[i].push(d);
      return;
    }
  }
  eras.push(d);
  sideTrips.push([]);
});
var family = timelineData.filter(function(d) { return d.type === 'personal'; });
var anchors = [];

// Hero: current role and a few numbers, all derived from the data
(function buildHero() {
  var work = eras.filter(function(d) { return d.type === 'experience'; });
  var current = work[work.length - 1];
  var currentRole = current.pdfSections ? current.pdfSections[0].role : current.role.split('\n').pop();
  document.getElementById('lede').textContent = currentRole + '. ' +
    'Builds software, and the teams that build it.';

  var degrees = eras.filter(function(d) { return d.type === 'education' && d.role; }).length;
  var stats = [
    [Math.floor(NOW - parseRange(work[0]).start), 'years working in tech'],
    [Math.floor(NOW - parseRange(current).start), 'years at ' + current.name],
    [degrees, 'computer science degrees'],
    [family.length, 'kids']
  ];
  var dl = document.getElementById('stats');
  stats.forEach(function(s) {
    var wrap = el('div', 'stat');
    wrap.appendChild(el('dt', 'stat-label', s[1]));
    wrap.appendChild(el('dd', 'stat-num', s[0]));
    dl.appendChild(wrap);
  });
  document.getElementById('scrollCueText').textContent = 'Start in ' + Math.floor(parseRange(eras[0]).start);
})();

// Career lane
function sideCard(d, host) {
  var r = parseRange(d);
  var box = el('div', 'era-side era-side--' + d.type + ' side-track');
  box.dataset.start = r.start;
  box.dataset.end = r.end;
  var meta = el('div', 'era-meta');
  meta.appendChild(el('span', 'era-kind', d.type === 'education' ? 'School' : 'Work'));
  meta.appendChild(el('span', 'era-years', d.years.replace(' - ', ' — ')));
  meta.appendChild(el('span', 'era-dur', 'While at ' + host.name.split(' ')[0]));
  box.appendChild(meta);
  if (d.logo) {
    var img = el('img', 'era-logo');
    img.src = d.logo;
    img.alt = '';
    box.appendChild(img);
  }
  box.appendChild(el('h4', 'era-side-name' + (d.logo ? ' sr-only' : ''), d.name));
  if (d.role) box.appendChild(el('p', 'era-role', d.role));
  box.appendChild(bulletList(d.bullets));
  return box;
}

(function buildCareer() {
  var career = document.getElementById('career');
  eras.forEach(function(d, i) {
    var r = parseRange(d);
    var era = el('article', 'era era--' + d.type);
    era.dataset.start = r.start;
    era.dataset.end = r.end;
    era.appendChild(el('div', 'era-bar'));

    var card = el('div', 'era-card');
    var meta = el('div', 'era-meta');
    meta.appendChild(el('span', 'era-kind', d.type === 'education' ? 'School' : 'Work'));
    meta.appendChild(el('span', 'era-years', d.years.replace(' - ', ' — ')));
    var span = Math.floor(r.end - r.start + 0.01);
    meta.appendChild(el('span', 'era-dur', span + (span === 1 ? ' yr' : ' yrs')));
    card.appendChild(meta);

    if (d.logo) {
      var img = el('img', 'era-logo' + (d.logoClass ? ' ' + d.logoClass : ''));
      img.src = d.logo;
      img.alt = '';
      card.appendChild(img);
    }
    card.appendChild(el('h3', 'era-name' + (d.logo ? ' sr-only' : ''), d.name));

    if (d.pdfSections) {
      // Promotions, oldest first. Scrolling through the era opens the role
      // held in that year (see onTimelineScroll); clicking a role opens it too.
      var steps = el('ol', 'era-steps');
      d.pdfSections.slice().reverse().forEach(function(s, i, all) {
        var li = el('li', i === all.length - 1 ? 'is-now' : null);
        li.dataset.start = parseInt(s.years, 10);
        var head = el('button', 'step-head');
        head.type = 'button';
        head.appendChild(el('span', 'step-role', s.role));
        head.appendChild(el('span', 'step-years', s.years.replace('Present', 'Today').replace(' - ', ' — ')));
        head.addEventListener('click', function() { openStep(li); });
        li.appendChild(head);
        var body = el('div', 'step-body');
        body.appendChild(bulletList(s.bullets));
        li.appendChild(body);
        steps.appendChild(li);
      });
      card.appendChild(steps);
    } else {
      if (d.role) card.appendChild(el('p', 'era-role', d.role));
      card.appendChild(bulletList(d.bullets));
    }

    sideTrips[i].forEach(function(s) {
      var r2 = parseRange(s);
      var branch = el('div', 'era-branch era-branch--' + s.type + ' side-track');
      branch.dataset.start = r2.start;
      branch.dataset.end = r2.end;
      era.appendChild(branch);
      card.appendChild(sideCard(s, d));
    });

    era.appendChild(card);
    career.appendChild(era);
  });

  var end = el('div', 'era-end');
  var now = new Date();
  end.appendChild(el('span', 'era-end-dot'));
  end.appendChild(el('span', null, 'Today · ' + MONTHS[now.getMonth()] + ' ' + now.getFullYear()));
  career.appendChild(end);
})();

// Family lane: each kid is a branch that starts at their birth and runs to today
(function buildFamily() {
  var life = document.getElementById('life');
  family.forEach(function(d, i) {
    var birth = new Date(d.birthDate + 'T00:00:00');
    var branch = el('div', 'branch');
    branch.style.setProperty('--i', i);
    branch.dataset.start = parseRange(d).start;
    if (d.photo) {
      var photo = el('img', 'branch-photo');
      photo.src = d.photo;
      photo.alt = d.name;
      photo.tabIndex = 0;
      branch.classList.add('has-photo');
      branch.appendChild(photo);
    }
    var label = el('div', 'branch-label');
    label.appendChild(el('span', 'branch-name', d.name));
    label.appendChild(el('span', 'branch-date', MONTHS[birth.getMonth()] + ' ' + birth.getFullYear()));
    label.appendChild(el('span', 'branch-age', ageOf(d.birthDate)));
    branch.appendChild(label);
    life.appendChild(branch);
  });
})();

function openStep(li) {
  Array.prototype.forEach.call(li.parentNode.children, function(step) {
    step.classList.toggle('is-open', step === li);
  });
}

function yOf(year) {
  for (var i = 0; i < anchors.length - 1; i++) {
    var a = anchors[i], b = anchors[i + 1];
    if (b[0] > a[0] && year >= a[0] && year <= b[0]) {
      return a[1] + (year - a[0]) / (b[0] - a[0]) * (b[1] - a[1]);
    }
  }
  return year <= anchors[0][0] ? anchors[0][1] : anchors[anchors.length - 1][1];
}

function yearAt(y) {
  for (var i = 0; i < anchors.length - 1; i++) {
    var a = anchors[i], b = anchors[i + 1];
    if (b[1] > a[1] && y >= a[1] && y <= b[1]) {
      return a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0]);
    }
  }
  return y <= anchors[0][1] ? anchors[0][0] : anchors[anchors.length - 1][0];
}

function layoutTimeline() {
  var yearPx = window.innerWidth <= 768 ? 100 : 130;
  var eraEls = document.querySelectorAll('.era');

  // Eras get a height proportional to their length but may grow to fit their
  // card, so the year scale is piecewise: interpolate between era edges.
  anchors = [];
  eraEls.forEach(function(era) {
    var start = parseFloat(era.dataset.start), end = parseFloat(era.dataset.end);
    era.style.minHeight = Math.round((end - start) * yearPx) + 'px';
  });
  eraEls.forEach(function(era) {
    anchors.push([parseFloat(era.dataset.start), era.offsetTop]);
    anchors.push([parseFloat(era.dataset.end), era.offsetTop + era.offsetHeight]);

    // Notches on the bar where promotions happened
    era.querySelectorAll('.era-notch').forEach(function(n) { n.remove(); });
  });
  eras.forEach(function(d, i) {
    if (!d.pdfSections) return;
    var era = eraEls[i];
    d.pdfSections.slice(0, -1).forEach(function(s) {
      var notch = el('span', 'era-notch');
      notch.style.top = (yOf(parseInt(s.years, 10)) - era.offsetTop) + 'px';
      era.querySelector('.era-bar').appendChild(notch);
    });
  });

  document.querySelectorAll('.era-branch').forEach(function(branch) {
    var top = yOf(parseFloat(branch.dataset.start));
    branch.style.top = (top - branch.parentNode.offsetTop) + 'px';
    branch.style.height = (yOf(parseFloat(branch.dataset.end)) - top) + 'px';
  });

  var ruler = document.getElementById('ruler');
  ruler.querySelectorAll('.tick').forEach(function(t) { t.remove(); });
  var first = Math.ceil(anchors[0][0]);
  for (var y = first; y <= Math.floor(NOW); y++) {
    var tick = el('div', 'tick' + (y % 5 === 0 ? ' tick-major' : ''));
    tick.dataset.year = y;
    tick.style.top = yOf(y) + 'px';
    tick.appendChild(el('span', 'tick-label', y));
    ruler.appendChild(tick);
  }

  document.querySelectorAll('.branch').forEach(function(branch) {
    var top = yOf(parseFloat(branch.dataset.start));
    branch.style.top = top + 'px';
    branch.style.height = (anchors[anchors.length - 1][1] - top) + 'px';
  });

  onTimelineScroll();
}

var lastYear = null;
function onTimelineScroll() {
  if (!anchors.length) return;
  var career = document.getElementById('career');
  var rect = career.getBoundingClientRect();
  var vh = window.innerHeight;
  var probe = vh * 0.45 - rect.top;
  var total = anchors[anchors.length - 1][1];
  var active = rect.top < vh * 0.55 && rect.bottom > vh * 0.35;

  document.body.classList.toggle('past-hero', window.scrollY > vh * 0.6);
  document.getElementById('rulerFill').style.height = Math.max(0, Math.min(total, probe)) + 'px';

  var counter = document.getElementById('yearCounter');
  counter.classList.toggle('visible', active);
  var year = Math.floor(yearAt(Math.max(0, Math.min(total, probe))));
  if (year === lastYear) return;
  lastYear = year;
  counter.textContent = year;

  document.querySelectorAll('.tick').forEach(function(t) {
    t.classList.toggle('is-active', +t.dataset.year === year);
    t.classList.toggle('is-past', +t.dataset.year < year);
  });
  document.querySelectorAll('.era').forEach(function(era) {
    era.classList.toggle('is-current', year >= +era.dataset.start && year < +era.dataset.end);
  });
  document.querySelectorAll('.era-steps').forEach(function(list) {
    var steps = list.children, pick = steps[0];
    for (var i = 0; i < steps.length; i++) {
      if (year >= +steps[i].dataset.start) pick = steps[i];
    }
    openStep(pick);
  });
  document.querySelectorAll('.side-track').forEach(function(t) {
    t.classList.toggle('is-current', year >= +t.dataset.start && year < +t.dataset.end);
  });
}

(function wireTimeline() {
  var ticking = false;
  window.addEventListener('scroll', function() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function() { ticking = false; onTimelineScroll(); });
  }, { passive: true });
  window.addEventListener('resize', layoutTimeline);
  window.addEventListener('load', layoutTimeline);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutTimeline);
  layoutTimeline();

  var cards = document.querySelectorAll('.era-card, .branch-label');
  if (!('IntersectionObserver' in window)) {
    cards.forEach(function(c) { c.classList.add('in'); });
    return;
  }
  var io = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -10% 0px' });
  cards.forEach(function(c) { io.observe(c); });
})();


// "Other stuff" teaser: read the list from other/ so it is maintained in one place
(function buildElsewhere() {
  var list = document.getElementById('elsewhereList');
  if (!list || !window.fetch || !window.DOMParser) return;
  var base = new URL('other/', location.href);
  fetch(base).then(function(res) {
    if (!res.ok) throw new Error(res.status);
    return res.text();
  }).then(function(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('main li > a').forEach(function(a) {
      var title = a.querySelector('.t');
      if (!title) return;
      var desc = a.querySelector('.d');
      var link = el('a', 'elsewhere-item');
      link.href = new URL(a.getAttribute('href'), base).href;
      if (link.host !== location.host) {
        link.target = '_blank';
        link.rel = 'noopener';
      }
      link.appendChild(el('span', 'elsewhere-title', title.textContent));
      if (desc) link.appendChild(el('span', 'elsewhere-desc', desc.textContent));
      link.appendChild(el('span', 'elsewhere-arrow', link.target ? '\u2197' : '\u2192'));
      var li = el('li');
      li.appendChild(link);
      list.appendChild(li);
    });
  }).catch(function() {});
})();

function toggleResumeDropdown() {
  document.getElementById('resumeDropdown').classList.toggle('open');
}

function closeResumeDropdown() {
  document.getElementById('resumeDropdown').classList.remove('open');
}

document.addEventListener('click', function(e) {
  var el = document.getElementById('resumeDropdown');
  if (el && !el.contains(e.target)) el.classList.remove('open');
});

function downloadFile(content, filename, mimeType) {
  var blob = new Blob([content], { type: mimeType });
  var url = URL.createObjectURL(blob);
  var a = window.document.createElement('a');
  a.href = url;
  a.download = filename;
  window.document.body.appendChild(a);
  a.click();
  window.document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportText() {
  var WIDTH = 80;
  var lines = [];

  lines.push('Marc Santa');
  lines.push('Greater Detroit, MI  |  marc.santa@icloud.com  |  www.marcsanta.com');
  lines.push('');

  function section(title) {
    lines.push(title.toUpperCase());
    lines.push('\u2500'.repeat(WIDTH));
  }

  function renderBullets(bullets) {
    bullets.forEach(function(b) {
      var isSub = b.charCodeAt(0) === 0x25aa;
      lines.push((isSub ? '    - ' : '  \u2022 ') + (isSub ? b.slice(2).trim() : b));
    });
  }

  function roleLine(role, years) {
    var pad = WIDTH - role.length - years.length;
    lines.push(pad > 0 ? role + ' '.repeat(pad) + years : role + '   ' + years);
  }

  function entry(d) {
    lines.push('');
    lines.push(d.name);
    if (d.pdfSections) {
      d.pdfSections.forEach(function(s) {
        roleLine(s.role, s.years || '');
        renderBullets(s.bullets);
      });
    } else {
      var role = d.pdfRole || d.role;
      if (role) roleLine(role, d.pdfYears || d.years);
      renderBullets(d.bullets);
    }
  }

  section('Experience');
  resumeEntries('experience').reverse().forEach(entry);
  lines.push('');
  section('Education');
  resumeEntries('education').reverse().forEach(entry);

  downloadFile(lines.join('\n'), 'Marc_Santa_Resume.txt', 'text/plain');
}

// Timeline entries that belong on the downloadable resume
function resumeEntries(type) {
  return timelineData.filter(function(d) { return d.type === type && d.resume !== false; });
}

function exportJSON() {
  var data = timelineData.filter(function(d) { return d.resume !== false; }).map(function(d) {
    var out = {};
    Object.keys(d).forEach(function(k) {
      if (k !== 'grow' && k !== 'pdfYears' && k !== 'resume') out[k] = d[k];
    });
    return out;
  });
  downloadFile(JSON.stringify(data, null, 2), 'Marc_Santa_Resume.json', 'application/json');
}

function exportMarkdown() {
  var lines = [];

  lines.push('# Marc Santa');
  lines.push('Greater Detroit, MI  |  marc.santa@icloud.com  |  www.marcsanta.com');
  lines.push('');

  function section(title) {
    lines.push('## ' + title);
    lines.push('');
  }

  function renderBullets(bullets) {
    bullets.forEach(function(b) {
      var isSub = b.charCodeAt(0) === 0x25aa;
      lines.push((isSub ? '    - ' : '- ') + (isSub ? b.slice(2).trim() : b));
    });
  }

  function entry(d) {
    lines.push('### ' + d.name);
    if (d.pdfSections) {
      d.pdfSections.forEach(function(s) {
        lines.push('**' + s.role + '** | ' + (s.years || ''));
        lines.push('');
        renderBullets(s.bullets);
        lines.push('');
      });
    } else {
      var role = d.pdfRole || d.role;
      if (role) {
        lines.push('**' + role + '** | ' + (d.pdfYears || d.years));
        lines.push('');
      }
      renderBullets(d.bullets);
      lines.push('');
    }
  }

  section('Experience');
  resumeEntries('experience').reverse().forEach(entry);
  section('Education');
  resumeEntries('education').reverse().forEach(entry);

  downloadFile(lines.join('\n'), 'Marc_Santa_Resume.md', 'text/markdown');
}

function exportLatex() {
  function esc(s) {
    return s
      .replace(/\\/g, '\\textbackslash{}')
      .replace(/&/g, '\\&')
      .replace(/%/g, '\\%')
      .replace(/\$/g, '\\$')
      .replace(/#/g, '\\#')
      .replace(/_/g, '\\_')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/~/g, '\\textasciitilde{}')
      .replace(/\^/g, '\\textasciicircum{}');
  }

  var lines = [];

  lines.push('\\documentclass[letterpaper,10pt]{article}');
  lines.push('\\usepackage[top=0.6in,bottom=0.6in,left=0.75in,right=0.75in]{geometry}');
  lines.push('\\usepackage{enumitem}');
  lines.push('\\usepackage{titlesec}');
  lines.push('\\usepackage[T1]{fontenc}');
  lines.push('\\pagestyle{empty}');
  lines.push('\\setlength{\\parindent}{0pt}');
  lines.push('\\titleformat{\\section}{\\large\\bfseries}{}{0em}{}[\\titlerule]');
  lines.push('\\titlespacing{\\section}{0pt}{8pt}{4pt}');
  lines.push('');
  lines.push('\\begin{document}');
  lines.push('');
  lines.push('{\\LARGE\\bfseries Marc Santa}\\\\[2pt]');
  lines.push('Greater Detroit, MI \\textbar{} marc.santa@icloud.com \\textbar{} www.marcsanta.com');
  lines.push('');

  function section(title) {
    lines.push('\\section{' + title + '}');
    lines.push('');
  }

  function renderBullets(bullets) {
    lines.push('\\begin{itemize}[leftmargin=1.5em,topsep=2pt,itemsep=1pt,parsep=0pt]');
    bullets.forEach(function(b) {
      var isSub = b.charCodeAt(0) === 0x25aa;
      var text = esc(isSub ? b.slice(2).trim() : b);
      if (isSub) {
        lines.push('  \\begin{itemize}[leftmargin=1.5em,topsep=0pt,itemsep=0pt,parsep=0pt]');
        lines.push('    \\item ' + text);
        lines.push('  \\end{itemize}');
      } else {
        lines.push('  \\item ' + text);
      }
    });
    lines.push('\\end{itemize}');
  }

  function entry(d) {
    lines.push('\\textbf{' + esc(d.name) + '}\\\\');
    if (d.pdfSections) {
      d.pdfSections.forEach(function(s) {
        lines.push('\\textit{' + esc(s.role) + '} \\hfill ' + esc(s.years || '') + '\\\\');
        renderBullets(s.bullets);
      });
    } else {
      var role = d.pdfRole || d.role;
      if (role) {
        lines.push('\\textit{' + esc(role) + '} \\hfill ' + esc(d.pdfYears || d.years) + '\\\\');
      }
      renderBullets(d.bullets);
    }
    lines.push('');
  }

  section('Experience');
  resumeEntries('experience').reverse().forEach(entry);
  section('Education');
  resumeEntries('education').reverse().forEach(entry);

  lines.push('\\end{document}');

  downloadFile(lines.join('\n'), 'Marc_Santa_Resume.tex', 'application/x-latex');
}

function exportPDF() {
  if (!window.jspdf) { alert('PDF library still loading, please try again.'); return; }
  var jsPDF = window.jspdf.jsPDF;
  // Render, and if it runs past one page, shrink type and spacing and retry.
  // Below MIN_SCALE we stop shrinking and let it break onto a second page.
  var MIN_SCALE = 0.75;
  var doc;
  for (var k = 1; ; k -= 0.025) {
    doc = new jsPDF({ unit: 'pt', format: 'letter' });
    var fits = renderResumePDF(doc, k, k - 0.025 < MIN_SCALE);
    if (fits || k - 0.025 < MIN_SCALE) break;
  }
  doc.save('Marc_Santa_Resume.pdf');
}

// Draws the resume at scale k. Returns false as soon as content would run
// past the bottom of the first page, unless allowBreaks is set.
function renderResumePDF(doc, k, allowBreaks) {
  var margin = 54;
  var pageWidth = doc.internal.pageSize.getWidth();
  var bottom = doc.internal.pageSize.getHeight() - 44;
  var usable = pageWidth - margin * 2;
  var y = 48;
  var overflow = false;

  function room(h) {
    if (y + h <= bottom) return true;
    if (!allowBreaks) { overflow = true; return false; }
    doc.addPage();
    y = 48;
    return true;
  }

  // Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24 * k);
  doc.text('Marc Santa', pageWidth / 2, y, { align: 'center' });
  y += 17 * k;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10 * k);
  doc.setTextColor(100, 100, 100);
  doc.text('Greater Detroit, MI  |  marc.santa@icloud.com |  www.marcsanta.com', pageWidth / 2, y, { align: 'center' });
  y += 26 * k;

  function section(title) {
    if (!room(30 * k)) return;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5 * k);
    doc.setTextColor(40, 40, 40);
    doc.text(title.toUpperCase(), margin, y);
    y += 5 * k;
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 14 * k;
  }

  function renderBullets(bullets) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10 * k);
    doc.setTextColor(50, 50, 50);
    bullets.forEach(function(b) {
      var isSub = b.charCodeAt(0) === 0x25aa;
      var text = isSub ? '-  ' + b.slice(2) : '\u2022  ' + b;
      var indent = isSub ? margin + 24 : margin + 10;
      var lines = doc.splitTextToSize(text, usable - (isSub ? 24 : 10));
      lines.forEach(function(line) {
        if (!room(14 * k)) return;
        doc.text(line, indent, y);
        y += 14 * k;
      });
    });
  }

  function roleLine(role, years) {
    if (!room(15 * k)) return;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10 * k);
    doc.setTextColor(60, 60, 60);
    doc.text(role, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(years || '', pageWidth - margin, y, { align: 'right' });
    y += 15 * k;
  }

  function entry(d) {
    if (!room(30 * k)) return;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11 * k);
    doc.setTextColor(30, 30, 30);
    doc.text(d.name, margin, y);
    y += 15 * k;
    if (d.pdfSections) {
      // Multi-role: date on each role line
      d.pdfSections.forEach(function(s) {
        roleLine(s.role, s.years);
        renderBullets(s.bullets);
        y += 3 * k;
      });
    } else {
      // Single role: date on role line
      var role = d.pdfRole || d.role;
      if (role) roleLine(role, d.pdfYears || d.years);
      renderBullets(d.bullets);
    }
    y += 11 * k;
  }

  // Experience (reverse chronological)
  section('Experience');
  resumeEntries('experience').reverse().forEach(entry);

  // Education (reverse chronological)
  section('Education');
  resumeEntries('education').reverse().forEach(entry);

  return !overflow;
}

function exportWord() {
  if (!window.docx) { alert('Word library still loading, please try again.'); return; }
  var D = window.docx;
  var paras = [];
  var TAB_RIGHT = 9360; // twips: letter width minus 1in margins each side
  var FONT = 'Arial';
  // Colors matched exactly from PDF (RGB -> hex)
  var C_NAME    = '1e1e1e'; // rgb(30,30,30)
  var C_SECTION = '282828'; // rgb(40,40,40)
  var C_ENTRY   = '1e1e1e'; // rgb(30,30,30)
  var C_ROLE    = '3c3c3c'; // rgb(60,60,60)
  var C_DATE    = '646464'; // rgb(100,100,100)
  var C_BULLET  = '323232'; // rgb(50,50,50)

  function r(opts) {
    return new D.TextRun(Object.assign({ font: FONT, noProof: true }, opts));
  }

  // Name — 24pt bold centered
  paras.push(new D.Paragraph({
    alignment: 'center',
    spacing: { after: 80, line: 276, lineRule: 'auto' },
    children: [r({ text: 'Marc Santa', bold: true, size: 48, color: C_NAME })]
  }));

  // Contact — 10pt centered with bottom rule
  paras.push(new D.Paragraph({
    alignment: 'center',
    spacing: { after: 160, line: 276, lineRule: 'auto' },
    children: [r({ text: 'Greater Detroit, MI  |  marc.santa@icloud.com  |  www.marcsanta.com', size: 20, color: C_DATE })]
  }));

  function sectionHeader(title) {
    paras.push(new D.Paragraph({
      children: [r({ text: title.toUpperCase(), bold: true, size: 26, color: C_SECTION })],
      border: { bottom: { color: 'C8C8C8', style: 'single', size: 4, space: 4 } },
      spacing: { before: 280, after: 120, line: 276, lineRule: 'auto' }
    }));
  }

  function renderBullets(bullets) {
    bullets.forEach(function(b) {
      var isSub = b.charCodeAt(0) === 0x25aa;
      var txt = isSub ? b.slice(2) : b;
      paras.push(new D.Paragraph({
        indent: { left: isSub ? 560 : 200, hanging: 200 },
        spacing: { after: 60, line: 276, lineRule: 'auto' },
        children: [r({ text: (isSub ? '-  ' : '\u2022  ') + txt, size: 20, color: C_BULLET })]
      }));
    });
  }

  function roleRow(roleText, yearsText) {
    // Use 'right' string directly — avoids any enum resolution issues with the UMD bundle
    return new D.Paragraph({
      tabStops: [{ type: 'right', position: TAB_RIGHT }],
      spacing: { after: 80, line: 276, lineRule: 'auto' },
      children: [
        r({ text: roleText, italics: true, size: 20, color: C_ROLE }),
        r({ text: '\t' + yearsText, size: 20, color: C_DATE })
      ]
    });
  }

  function entry(d) {
    paras.push(new D.Paragraph({
      children: [r({ text: d.name, bold: true, size: 22, color: C_ENTRY })],
      spacing: { before: 200, after: 60, line: 276, lineRule: 'auto' }
    }));
    if (d.pdfSections) {
      d.pdfSections.forEach(function(s) {
        paras.push(roleRow(s.role, s.years || ''));
        renderBullets(s.bullets);
      });
    } else {
      var role = d.pdfRole || d.role;
      if (role) paras.push(roleRow(role, d.pdfYears || d.years));
      renderBullets(d.bullets);
    }
  }

  sectionHeader('Experience');
  resumeEntries('experience').reverse().forEach(entry);
  sectionHeader('Education');
  resumeEntries('education').reverse().forEach(entry);

  var resumeDoc = new D.Document({ sections: [{ properties: {}, children: paras }] });
  D.Packer.toBlob(resumeDoc).then(function(blob) {
    downloadFile(blob, 'Marc_Santa_Resume.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  });
}
