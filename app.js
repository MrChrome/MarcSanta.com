// Build HTML timeline from data
(function buildTimeline() {
  var timeline = document.getElementById('timeline');
  timelineData.forEach(function(d) {
    var item = document.createElement('div');
    item.className = 'timeline-item' + (d.fork ? ' timeline-fork' : '');
    var style = 'flex-grow: ' + d.grow + ';';
    if (d.last) style += ' align-items: flex-start;';
    item.setAttribute('style', style);

    var content = document.createElement('div');
    content.className = 'timeline-content';
    if (d.last && !d.fork) content.setAttribute('style', 'left: 0; transform: translateX(-50%);');

    if (d.logo) {
      var img = document.createElement('img');
      img.className = 'timeline-logo' + (d.logoClass ? ' ' + d.logoClass : '');
      img.src = d.logo;
      img.alt = d.name;
      content.appendChild(img);
    } else {
      var label = document.createElement('div');
      label.className = 'timeline-label';
      label.textContent = d.name;
      content.appendChild(label);
    }

    var years = document.createElement('div');
    years.className = 'timeline-years';
    years.textContent = d.years;
    content.appendChild(years);

    if (d.role) {
      var sub = document.createElement('div');
      sub.className = 'timeline-sub';
      sub.innerHTML = d.role.replace(/\n/g, '<br>');
      content.appendChild(sub);
    }

    item.appendChild(content);

    var dot = document.createElement('div');
    dot.className = 'timeline-dot';
    item.appendChild(dot);

    if (d.fork) {
      var forkDepth = d.forkDepth || 70;
      var forkX = d.forkX || 14;
      var forkColor = d.forkColor || '#38bdf8';
      item.dataset.forkDepth = forkDepth;
      item.dataset.forkX = forkX;
      item.dataset.forkColor = forkColor;
      item.dataset.forkName = d.name;
      item.dataset.forkYears = d.years;
      item.style.setProperty('--fork-depth', forkDepth);
      item.style.setProperty('--fork-x', forkX);
      item.style.setProperty('--fork-color', forkColor);

      var ns = 'http://www.w3.org/2000/svg';
      var forkSvg = document.createElementNS(ns, 'svg');
      forkSvg.setAttribute('class', 'timeline-fork-svg');
      forkSvg.setAttribute('viewBox', '-2 -2 ' + (forkX + 16) + ' ' + (forkDepth + 16));
      forkSvg.setAttribute('width', forkX + 16);
      forkSvg.setAttribute('height', forkDepth + 16);
      forkSvg.setAttribute('fill', 'none');
      // Diagonal from junction (0,0) down to bend point (forkX, forkDepth)
      var forkLine = document.createElementNS(ns, 'line');
      forkLine.setAttribute('x1', '0'); forkLine.setAttribute('y1', '0');
      forkLine.setAttribute('x2', forkX); forkLine.setAttribute('y2', forkDepth);
      forkLine.setAttribute('stroke', forkColor);
      forkLine.setAttribute('stroke-width', '2.5');
      forkLine.setAttribute('stroke-linecap', 'round');
      // Dot at bend point
      var forkDot = document.createElementNS(ns, 'circle');
      forkDot.setAttribute('cx', forkX); forkDot.setAttribute('cy', forkDepth);
      forkDot.setAttribute('r', '7');
      forkDot.setAttribute('fill', forkColor);
      forkDot.setAttribute('stroke', '#0f172a');
      forkDot.setAttribute('stroke-width', '3');
      // Outer glow ring
      var forkRing = document.createElementNS(ns, 'circle');
      forkRing.setAttribute('cx', forkX); forkRing.setAttribute('cy', forkDepth);
      forkRing.setAttribute('r', '10');
      forkRing.setAttribute('fill', 'none');
      forkRing.setAttribute('stroke', forkColor);
      forkRing.setAttribute('stroke-width', '2');
      forkRing.setAttribute('opacity', '0.6');
      forkSvg.appendChild(forkLine);
      forkSvg.appendChild(forkDot);
      forkSvg.appendChild(forkRing);
      forkSvg.addEventListener('mouseenter', function() { item.classList.add('fork-hovered'); });
      forkSvg.addEventListener('mouseleave', function() { item.classList.remove('fork-hovered'); });
      item.appendChild(forkSvg);
    }

    var tooltip = document.createElement('div');
    tooltip.className = 'timeline-tooltip';
    var tooltipBullets = d.bullets.slice();
    if (d.birthDate && d.pronoun) {
      var now = new Date();
      var birth = new Date(d.birthDate + 'T00:00:00');
      var years = now.getFullYear() - birth.getFullYear();
      if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) years--;
      var ageStr;
      if (years < 1) {
        var months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
        if (now.getDate() < birth.getDate()) months--;
        ageStr = months + ' month' + (months === 1 ? '' : 's') + ' old';
      } else {
        ageStr = years + ' year' + (years === 1 ? '' : 's') + ' old';
      }
      tooltipBullets.push(d.pronoun + ' is ' + ageStr + '.');
    }
    tooltip.innerHTML = tooltipBullets.map(function(b) {
      if (b.charCodeAt(0) === 0x25aa) {
        return '<span style="display:block;padding-left:1rem;">' + b + '</span>';
      }
      return '<span style="display:block;">&bull; ' + b + '</span>';
    }).join('');
    item.appendChild(tooltip);

    timeline.appendChild(item);
  });

  // Chevrons
  var chevrons = document.createElement('div');
  chevrons.className = 'timeline-chevrons';
  chevrons.innerHTML = '<svg width="40" height="24" viewBox="0 0 40 24" fill="none" stroke="#0c4a6e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    + '<polyline points="2,6 10,12 2,18" opacity="0.4"/>'
    + '<polyline points="15,6 23,12 15,18" opacity="0.65"/>'
    + '<polyline points="28,6 36,12 28,18" opacity="1"/>'
    + '</svg>';
  timeline.appendChild(chevrons);

  // Touch support
  if ('ontouchstart' in window) {
    document.querySelectorAll('.timeline-item').forEach(function(item) {
      item.addEventListener('click', function() {
        var tt = this.querySelector('.timeline-tooltip');
        if (!tt) return;
        var isOpen = tt.style.display === 'block';
        document.querySelectorAll('.timeline-tooltip').forEach(function(t) {
          t.style.display = 'none';
        });
        if (!isOpen) tt.style.display = 'block';
      });
    });
  }

  buildForkArms();
})();

function buildForkArms() {
  // Remove any existing arms
  document.querySelectorAll('.fork-arm, .fork-arm-mobile').forEach(function(el) {
    if (el.parentNode) el.parentNode.removeChild(el);
  });

  var timelineEl = document.getElementById('timeline');
  var timelineRect = timelineEl.getBoundingClientRect();
  var isMobile = window.innerWidth <= 768;

  document.querySelectorAll('.timeline-item.timeline-fork').forEach(function(item) {
    var ns = 'http://www.w3.org/2000/svg';
    var depth = parseInt(item.dataset.forkDepth) || 70;

    var color = item.dataset.forkColor || '#38bdf8';
    var cr = parseInt(color.slice(1,3), 16);
    var cg = parseInt(color.slice(3,5), 16);
    var cb = parseInt(color.slice(5,7), 16);
    var colorAlpha = 'rgba(' + cr + ',' + cg + ',' + cb + ',0.6)';

    if (isMobile) {
      // Mobile: L-shaped branch from main dot going RIGHT then UP
      var dotEl = item.querySelector('.timeline-dot');
      var dotRect = dotEl.getBoundingClientRect();
      // The dot's getBoundingClientRect() includes its translateX(-55%) transform,
      // which shifts it left of the actual main vertical line. Use the line's true
      // X instead: the timeline's padding-left (where ::before is positioned).
      var mainLineX = Math.round(parseFloat(getComputedStyle(timelineEl).paddingLeft));
      var dotCY = Math.round(dotRect.top  - timelineRect.top  + dotRect.height / 2);

      // Vary RIGHT per item via forkDepth so Peter and Audrey don't overlap
      var RIGHT = Math.round(depth * 0.5 + 10);
      var UP = 55;

      var mArm = document.createElement('div');
      mArm.className = 'fork-arm-mobile';
      mArm.style.left = mainLineX + 'px';
      mArm.style.top  = (dotCY - UP) + 'px';

      // L-shape SVG: (0,UP) → right to (RIGHT,UP) → up to (RIGHT,0)
      var svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('width',   RIGHT + 20);
      svg.setAttribute('height',  UP + 20);
      svg.setAttribute('viewBox', '-5 -10 ' + (RIGHT + 20) + ' ' + (UP + 20));
      svg.setAttribute('fill', 'none');
      svg.setAttribute('overflow', 'visible');

      var lp = document.createElementNS(ns, 'path');
      lp.setAttribute('d', 'M 0,' + UP + ' H ' + RIGHT + ' V 0');
      lp.setAttribute('stroke', color);
      lp.setAttribute('stroke-width', '2.5');
      lp.setAttribute('stroke-linecap', 'round');
      lp.setAttribute('stroke-linejoin', 'round');
      lp.setAttribute('fill', 'none');

      var eDot = document.createElementNS(ns, 'circle');
      eDot.setAttribute('cx', RIGHT); eDot.setAttribute('cy', '0');
      eDot.setAttribute('r', '7');
      eDot.setAttribute('fill', color);
      eDot.setAttribute('stroke', '#0f172a');
      eDot.setAttribute('stroke-width', '3');

      var eRing = document.createElementNS(ns, 'circle');
      eRing.setAttribute('cx', RIGHT); eRing.setAttribute('cy', '0');
      eRing.setAttribute('r', '10');
      eRing.setAttribute('fill', 'none');
      eRing.setAttribute('stroke', color);
      eRing.setAttribute('stroke-width', '2');
      eRing.setAttribute('opacity', '0.6');

      svg.appendChild(lp);
      svg.appendChild(eDot);
      svg.appendChild(eRing);
      mArm.appendChild(svg);

      // Label at the top of the branch (top-right of arm)
      var lbl = document.createElement('div');
      lbl.className = 'fork-arm-mobile-label';
      lbl.style.left = (RIGHT + 18) + 'px';

      var nameEl = document.createElement('div');
      nameEl.className = 'timeline-label';
      nameEl.textContent = item.dataset.forkName || '';

      var yearsEl = document.createElement('div');
      yearsEl.className = 'timeline-years';
      yearsEl.textContent = item.dataset.forkYears || '';

      lbl.appendChild(nameEl);
      lbl.appendChild(yearsEl);
      mArm.appendChild(lbl);

      mArm.addEventListener('mouseenter', function() { item.classList.add('fork-hovered'); });
      mArm.addEventListener('mouseleave', function() { item.classList.remove('fork-hovered'); });
      if ('ontouchstart' in window) {
        mArm.addEventListener('click', function() {
          var tt = item.querySelector('.timeline-tooltip');
          if (!tt) return;
          var isOpen = tt.style.display === 'block';
          document.querySelectorAll('.timeline-tooltip').forEach(function(t) { t.style.display = 'none'; });
          if (!isOpen) tt.style.display = 'block';
        });
      }
      timelineEl.appendChild(mArm);

    } else {
      // Desktop: horizontal arm extending to the right edge with chevrons
      var itemRect = item.getBoundingClientRect();
      var fx = parseInt(item.dataset.forkX) || 14;
      var armLeft = Math.round(itemRect.left - timelineRect.left + itemRect.width / 2 + fx);
      var armTop  = Math.round(itemRect.top  - timelineRect.top  + itemRect.height / 2 + depth - 12);

      var arm = document.createElement('div');
      arm.className = 'fork-arm';
      arm.style.left = armLeft + 'px';
      arm.style.top  = armTop  + 'px';
      arm.style.setProperty('--fork-color', color);
      arm.style.setProperty('--fork-color-alpha', colorAlpha);

      var chevSvg = document.createElementNS(ns, 'svg');
      chevSvg.setAttribute('class', 'fork-arm-chevrons');
      chevSvg.setAttribute('width', '40');
      chevSvg.setAttribute('height', '24');
      chevSvg.setAttribute('viewBox', '0 0 40 24');
      chevSvg.setAttribute('fill', 'none');
      chevSvg.setAttribute('stroke', color);
      chevSvg.setAttribute('stroke-width', '1.8');
      chevSvg.setAttribute('stroke-linecap', 'round');
      chevSvg.setAttribute('stroke-linejoin', 'round');
      [['2,6 10,12 2,18', '0.4'], ['15,6 23,12 15,18', '0.65'], ['28,6 36,12 28,18', '1']].forEach(function(p) {
        var poly = document.createElementNS(ns, 'polyline');
        poly.setAttribute('points', p[0]);
        poly.setAttribute('opacity', p[1]);
        chevSvg.appendChild(poly);
      });
      arm.appendChild(chevSvg);
      arm.addEventListener('mouseenter', function() { item.classList.add('fork-hovered'); });
      arm.addEventListener('mouseleave', function() { item.classList.remove('fork-hovered'); });
      timelineEl.appendChild(arm);
    }
  });
}

window.addEventListener('resize', buildForkArms);

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
  timelineData.filter(function(d) { return d.type === 'experience'; }).reverse().forEach(entry);
  lines.push('');
  section('Education');
  timelineData.filter(function(d) { return d.type === 'education'; }).reverse().forEach(entry);

  downloadFile(lines.join('\n'), 'Marc_Santa_Resume.txt', 'text/plain');
}

function exportJSON() {
  var data = timelineData.map(function(d) {
    var out = {};
    Object.keys(d).forEach(function(k) {
      if (k !== 'grow' && k !== 'pdfYears') out[k] = d[k];
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
  timelineData.filter(function(d) { return d.type === 'experience'; }).reverse().forEach(entry);
  section('Education');
  timelineData.filter(function(d) { return d.type === 'education'; }).reverse().forEach(entry);

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
  timelineData.filter(function(d) { return d.type === 'experience'; }).reverse().forEach(entry);
  section('Education');
  timelineData.filter(function(d) { return d.type === 'education'; }).reverse().forEach(entry);

  lines.push('\\end{document}');

  downloadFile(lines.join('\n'), 'Marc_Santa_Resume.tex', 'application/x-latex');
}

function exportPDF() {
  if (!window.jspdf) { alert('PDF library still loading, please try again.'); return; }
  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF({ unit: 'pt', format: 'letter' });
  var margin = 60;
  var pageWidth = doc.internal.pageSize.getWidth();
  var usable = pageWidth - margin * 2;
  var y = 50;

  // Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('Marc Santa', pageWidth / 2, y, { align: 'center' });
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Greater Detroit, MI  |  marc.santa@icloud.com |  www.marcsanta.com', pageWidth / 2, y, { align: 'center' });
  y += 20;

  y += 10;

  function section(title) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(40, 40, 40);
    doc.text(title.toUpperCase(), margin, y);
    y += 5;
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 15;
  }

  function renderBullets(bullets) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    bullets.forEach(function(b) {
      var isSub = b.charCodeAt(0) === 0x25aa;
      var text = isSub ? '-  ' + b.slice(2) : '\u2022  ' + b;
      var indent = isSub ? margin + 24 : margin + 10;
      var lines = doc.splitTextToSize(text, usable - (isSub ? 24 : 10));
      lines.forEach(function(line) {
        if (y > 720) { doc.addPage(); y = 50; }
        doc.text(line, indent, y);
        y += 16;
      });
    });
  }

  function entry(d) {
    var dateStr = d.pdfYears || d.years;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    if (d.pdfSections) {
      // Multi-role: date on each role line
      doc.text(d.name, margin, y);
      y += 17;
      d.pdfSections.forEach(function(s) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.text(s.role, margin, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(s.years || '', pageWidth - margin, y, { align: 'right' });
        y += 17;
        renderBullets(s.bullets);
      });
    } else {
      // Single role: date on role line
      doc.text(d.name, margin, y);
      y += 17;
      var role = d.pdfRole || d.role;
      if (role) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.text(role, margin, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(dateStr, pageWidth - margin, y, { align: 'right' });
        y += 17;
      }
      renderBullets(d.bullets);
    }
    y += 16;
  }

  // Experience (reverse chronological)
  section('Experience');
  timelineData.filter(function(d) { return d.type === 'experience'; }).reverse().forEach(entry);

  // Education (reverse chronological)
  section('Education');
  timelineData.filter(function(d) { return d.type === 'education'; }).reverse().forEach(entry);

  doc.save('Marc_Santa_Resume.pdf');
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
  timelineData.filter(function(d) { return d.type === 'experience'; }).reverse().forEach(entry);
  sectionHeader('Education');
  timelineData.filter(function(d) { return d.type === 'education'; }).reverse().forEach(entry);

  var resumeDoc = new D.Document({ sections: [{ properties: {}, children: paras }] });
  D.Packer.toBlob(resumeDoc).then(function(blob) {
    downloadFile(blob, 'Marc_Santa_Resume.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  });
}
