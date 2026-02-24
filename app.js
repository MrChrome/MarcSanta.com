// Build HTML timeline from data
(function buildTimeline() {
  var timeline = document.getElementById('timeline');
  timelineData.forEach(function(d) {
    var item = document.createElement('div');
    item.className = 'timeline-item';
    var style = 'flex-grow: ' + d.grow + ';';
    if (d.last) style += ' align-items: flex-start;';
    item.setAttribute('style', style);

    var content = document.createElement('div');
    content.className = 'timeline-content';
    if (d.last) content.setAttribute('style', 'left: 0; transform: translateX(-50%);');

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

    var tooltip = document.createElement('div');
    tooltip.className = 'timeline-tooltip';
    tooltip.innerHTML = d.bullets.map(function(b) {
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
  chevrons.innerHTML = '<svg width="40" height="24" viewBox="0 0 40 24" fill="none" stroke="#ec4899" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
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
          t.style.display = '';
        });
        if (!isOpen) tt.style.display = 'block';
      });
    });
  }
})();

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
