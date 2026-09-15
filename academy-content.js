/* AcademyContent: independent sections consuming the centralized ACADEMY config.
   No framework, backend, remote form submission or persistent player-data storage. */
(function () {
  'use strict';
  var C = window.ACADEMY, D = C.content;
  var esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
  var heading = (lines, level = 'h2') => '<' + level + '>' + lines.map(esc).join('<br>') + '</' + level + '>';
  var eyebrow = text => '<p class="eyebrow">' + esc(text) + '</p>';
  var list = (items, cls = 'feature-list') => '<ul class="' + cls + '">' + items.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul>';
  var media = item => '<image-slot kind="' + esc(item.kind) + '" label="' + esc(item.label) + '" type="' + esc(item.type) + '" src="' + esc(item.src) + '"></image-slot>';
  /* Media paired with a launcher into the hero campus model. The anchor alone already reaches the 3D scene,
     so the data attribute only upgrades that jump into a framed view of the named facility. */
  var modelMedia = (item, m) => '<div class="model-media">' + media(item) + '<span class="model-badge"><span class="model-badge-dot" aria-hidden="true"></span>' + esc(m.badge) + '</span></div><a class="model-launch" href="#top" data-campus-focus="' + esc(m.facility) + '"><span class="model-launch-cube" aria-hidden="true"></span><span class="model-launch-text"><strong>' + esc(m.cta) + '</strong><small>' + esc(m.note) + '</small></span><span class="model-launch-go" aria-hidden="true">↗</span></a><div class="media-footer"><span>' + esc(m.caption) + '</span><span aria-hidden="true">↗</span></div>';
  var button = (text, href, cls = '') => '<a class="button ' + cls + '" href="' + esc(href) + '">' + esc(text) + '<span aria-hidden="true">↗</span></a>';
  var wrap = (name, id, cls, content) => '<section data-component="' + name + '" id="' + id + '" class="section ' + cls + '"><div class="section-inner" data-reveal>' + content + '</div></section>';
  var rule = (num, text) => '<div class="section-rule"><span>' + num + ' / ' + esc(text) + '</span><span aria-hidden="true">+ + +</span></div>';

  function FacilityStats() {
    return '<section id="facility-stats" data-component="FacilityStats" class="stats-strip" aria-label="Facility numbers"><div class="stats-inner" data-reveal>' + D.stats.map(s => '<div class="stat"><strong>' + esc(s[0]) + '</strong><span>' + esc(s[1]) + '</span></div>').join('') + '</div></section>';
  }
  function AboutSection() {
    var A = D.about;
    return wrap('AboutSection', 'about', 'about-section light-section', rule('01', 'The academy') + '<div class="about-grid"><div>' + eyebrow(A.eyebrow) + heading(A.heading) + '<p class="intro-copy">' + esc(A.description) + '</p></div><ol class="pillars">' + A.pillars.map((p, i) => '<li><span>0' + (i + 1) + '</span><h3>' + esc(p) + '</h3><span aria-hidden="true">↗</span></li>').join('') + '</ol></div><div class="feature-statement">' + A.statement.map(esc).join(' <strong>') + '</strong><span aria-hidden="true">↗</span></div>');
  }
  function OutdoorNets() {
    var A = D.outdoor;
    return wrap('OutdoorNets', 'outdoor', 'outdoor-section light-section', rule('02', 'Outdoor nets') + '<div class="section-heading-row"><div>' + eyebrow('Room to find your rhythm') + heading(A.heading) + '</div><p class="section-subtitle">' + A.subheading.map(esc).join('<br>') + '</p></div><div class="outdoor-layout"><div class="outdoor-media">' + modelMedia(A.media, A.model) + '</div><div class="surface-list">' + A.surfaces.map(s => '<div class="surface"><div class="surface-heading"><strong>' + esc(s.number) + '</strong><h3>' + esc(s.label) + '</h3></div>' + list(s.points) + '</div>').join('') + '</div></div>' + list(A.points, 'inline-points'));
  }
  function GroundSection() {
    var A = D.ground;
    return wrap('GroundSection', 'ground', 'ground-section', rule('03', 'Match day. After dark.') + '<div class="ground-layout"><div>' + eyebrow('The game doesn’t end at sunset') + heading(A.heading) + '<p class="section-subtitle">' + A.subheading.map(esc).join('<br>') + '</p>' + button(A.cta, '#admission', 'ground-enquiry') + '</div><div class="ground-visual">' + modelMedia(A.media, A.model) + '</div></div>' + list(A.points, 'ground-points'));
  }
  function CoachingSection() {
    var A = D.coaching;
    return wrap('CoachingSection', 'coaching', 'coaching-section light-section', rule('04', 'Player development') + '<div class="coaching-layout"><div>' + eyebrow(A.eyebrow) + heading(A.heading) + button('Find your training session', '#timings', 'button-dark') + '</div><div>' + list(A.points, 'coaching-points') + '</div></div><div id="programs" class="coaching-categories">' + A.categories.map((name, i) => '<a href="#admission"><span>0' + (i + 1) + '</span><h3>' + esc(name) + '</h3><span aria-hidden="true">↗</span></a>').join('') + '</div>');
  }
  function ScheduleSection() {
    return wrap('ScheduleSection', 'timings', 'schedule-section', rule('05', 'Make time for your game') + '<div class="section-heading-row"><div>' + eyebrow('Training sessions') + heading(D.schedule.heading) + '</div>' + button('Choose your batch', '#admission', 'button-outline') + '</div><div class="schedule-grid">' + C.timings.map((s, i) => '<article class="session"><div><span class="session-icon" aria-hidden="true">' + ['☼','◒','☾'][i % 3] + '</span><span class="session-index">0' + (i + 1) + '</span></div><h3>' + esc(s.session) + '</h3><p>' + esc(s.time) + '</p><a class="text-link" href="#admission" data-session="' + i + '">Enquire for this session <span aria-hidden="true">↗</span></a></article>').join('') + '</div>' + list(D.schedule.points, 'inline-points'));
  }
  function FacilitiesGrid() {
    return wrap('FacilitiesGrid', 'facilities', 'facilities-section light-section', rule('06', 'Explore the facilities') + '<div class="section-heading-row"><div>' + eyebrow('Purpose-built for cricket') + heading(D.facilities.heading) + '</div><p class="quiet-copy">Explore the spaces and support<br>behind every training session.</p></div><div class="facilities-grid">' + D.facilities.items.map((f, i) => '<details class="facility-detail"><summary><span class="detail-index">' + String(i + 1).padStart(2, '0') + '</span><h3>' + esc(f[0]) + '</h3><span class="detail-toggle" aria-hidden="true">+</span></summary><div class="detail-body"><p>' + esc(f[1]) + '</p><a class="text-link" href="' + esc(f[2]) + '">Explore <span aria-hidden="true">↗</span></a></div></details>').join('') + '</div>');
  }
  function Gallery() {
    return wrap('Gallery', 'gallery', 'gallery-section', rule('07', 'Inside the academy') + '<div class="section-heading-row"><div>' + eyebrow('Our space. Your possibilities.') + heading(D.gallery.heading) + '</div><p class="quiet-copy">A closer look at the academy.<br>Explore outdoor spaces through 3D model views.</p></div><div class="gallery-filters" role="group" aria-label="Filter gallery">' + D.gallery.filters.map((f, i) => '<button type="button" data-filter="' + esc(f) + '" aria-pressed="' + (i === 0) + '">' + esc(f) + '</button>').join('') + '</div><p id="gallery-count" class="sr-only" aria-live="polite"></p><div class="gallery-grid">' + D.gallery.items.map((item, i) => '<article class="gallery-item" data-category="' + esc(item.category) + '"><button type="button" data-gallery="' + i + '" aria-label="Preview ' + esc(item.label) + '">' + '<span class="gallery-image">' + media(item) + (item.facility ? '<span class="gallery-source">3D model view</span>' : '') + '</span><span class="gallery-caption"><span><small>' + esc(item.category) + '</small><strong>' + esc(item.label) + '</strong></span><span class="gallery-expand" aria-hidden="true">' + (item.type === 'video' ? '▷' : '↗') + '</span></span></button></article>').join('') + '</div><dialog id="gallery-dialog" aria-labelledby="gallery-dialog-title"><div class="dialog-header"><h3 id="gallery-dialog-title"></h3><button type="button" class="dialog-close" aria-label="Close gallery preview">×</button></div><div id="gallery-preview"></div><p>Approved facility media will appear here when available.</p></dialog>');
  }
  function AdmissionSection() {
    var A = D.admission;
    return wrap('AdmissionSection', 'admission', 'admission-section', rule('08', 'Take the first step') + '<div class="admission-layout"><div class="admission-copy">' + eyebrow(A.eyebrow) + heading(A.heading) + '<p>Bring your ambition.<br>Let’s build your game.</p><div class="admission-wordmark" aria-hidden="true">' + esc(C.hero.supportingLine) + '</div>' + button('Talk to the academy', C.contact.phoneHref, 'button-outline') + '</div><form id="trial-form"><p class="form-intro">Tell us about the player</p><div class="form-grid"><div class="field"><label for="player-name">Player Name <span>*</span></label><input id="player-name" name="playerName" autocomplete="name" required maxlength="100"></div><div class="field"><label for="player-age">Age <span>*</span></label><input id="player-age" name="age" type="number" min="1" max="100" inputmode="numeric" required></div><div class="field"><label for="parent-name">Parent Name</label><input id="parent-name" name="parentName" maxlength="100"></div><div class="field"><label for="player-phone">Phone Number <span>*</span></label><input id="player-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" pattern="[+0-9 ()-]{10,18}" required title="Enter a phone number with 10 to 15 digits" maxlength="18"></div><div class="field"><label for="experience">Experience Level <span>*</span></label><select id="experience" name="experience" required><option value="">Select experience</option>' + A.experience.map(e => '<option>' + esc(e) + '</option>').join('') + '</select></div><div class="field"><label for="preferred-session">Preferred Training Session <span>*</span></label><select id="preferred-session" name="session" required><option value="">Select session</option>' + C.timings.map(s => '<option value="' + esc(s.session) + '">' + esc(s.session + ' · ' + s.time) + '</option>').join('') + '</select></div><div class="field full-width"><label for="trial-message">Message</label><textarea id="trial-message" name="message" rows="3" maxlength="2000" placeholder="Tell us about your goals or enquiry"></textarea></div></div><p class="form-note">' + esc(A.note) + '</p><button class="button submit-button" type="submit">' + esc(A.cta) + '<span aria-hidden="true">↗</span></button><div id="trial-result" hidden role="status" tabindex="-1"><strong>Enquiry prepared — not submitted.</strong><p>Review and download your enquiry, then contact the academy to arrange your trial.</p><pre id="trial-summary"></pre><div class="result-actions"><button type="button" id="download-enquiry" class="button button-outline">Download enquiry ↓</button>' + button('Call to confirm', C.contact.phoneHref) + '</div></div></form></div>');
  }
  function ContactSection() {
    var mapUrl = C.contact.mapUrl;
    var directions = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(C.contact.directionsQuery);
    var whatsapp = 'https://wa.me/' + C.contact.whatsappNumber;
    return wrap('ContactSection', 'contact', 'contact-section light-section', rule('09', 'Visit. Practice. Belong.') + '<div class="contact-layout"><div class="map-placeholder" role="group" aria-label="Academy location"><div class="map-grid" aria-hidden="true"></div><div class="map-pin" aria-hidden="true">⌖</div><strong>' + esc(C.brand.full) + '</strong><a class="map-link" href="' + esc(mapUrl) + '" target="_blank" rel="noopener noreferrer">View on Google Maps <span aria-hidden="true">↗</span></a><a class="button button-dark" href="' + esc(directions) + '" target="_blank" rel="noopener noreferrer">Get Directions <span aria-hidden="true">↗</span></a></div><div class="contact-copy">' + eyebrow('We’re ready when you are') + '<h2>LET’S TALK<br>CRICKET.</h2><address>' + esc(C.contact.address) + '</address><a class="contact-phone" href="' + esc(C.contact.phoneHref) + '">' + esc(C.contact.phone) + '</a><p class="contact-person">' + esc(C.contact.name) + '</p><h3>Opening Hours / Training Sessions</h3><ul class="opening-hours">' + C.timings.map(s => '<li><span>' + esc(s.session) + '</span><strong>' + esc(s.time) + '</strong></li>').join('') + '</ul><div class="contact-actions">' + button('Call Now', C.contact.phoneHref, 'button-dark') + '<a class="button button-outline" href="' + esc(whatsapp) + '" target="_blank" rel="noopener noreferrer">WhatsApp <span aria-hidden="true">↗</span></a></div></div></div>');
  }
  function Footer() {
    return '<footer data-component="Footer" class="site-footer"><div class="footer-top"><a href="#top" class="footer-brand">' + esc(C.brand.full) + '<span>' + esc(C.brand.markSub) + '</span></a><p>' + esc(C.hero.supportingLine) + '</p><a class="back-top" href="#top" aria-label="Back to top">↑</a></div><div class="footer-bottom"><span>© ' + new Date().getFullYear() + ' ' + esc(C.brand.full) + '. All rights reserved.</span><nav aria-label="Footer navigation">' + C.nav.filter(n => ['#facilities','#coaching','#contact'].includes(n.href)).map(n => '<a href="' + esc(n.href) + '">' + esc(n.label) + '</a>').join('') + '</nav></div></footer>';
  }

  document.getElementById('academy-content').innerHTML = [FacilityStats, AboutSection, OutdoorNets, GroundSection, CoachingSection, ScheduleSection, FacilitiesGrid, Gallery, AdmissionSection, ContactSection, Footer].map(component => component()).join('');
  document.title = C.brand.full + ' — ' + C.brand.markSub;
  document.querySelector('meta[name="description"]').content = C.hero.sub;

  // Gallery buttons remain keyboard-accessible; filtering never moves focus unexpectedly.
  var filterButtons = document.querySelectorAll('[data-filter]');
  filterButtons.forEach(btn => btn.addEventListener('click', () => {
    filterButtons.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    var count = 0;
    document.querySelectorAll('.gallery-item').forEach(item => { item.hidden = btn.dataset.filter !== 'All' && item.dataset.category !== btn.dataset.filter; if (!item.hidden) count++; });
    document.getElementById('gallery-count').textContent = count + ' campus views shown';
  }));
  var dialog = document.getElementById('gallery-dialog');
  document.querySelectorAll('[data-gallery]').forEach(btn => btn.addEventListener('click', () => {
    var item = D.gallery.items[Number(btn.dataset.gallery)];
    document.getElementById('gallery-dialog-title').textContent = item.label;
    document.getElementById('gallery-preview').innerHTML = media(item) + (item.facility ? '<a class="model-launch" href="#top" data-campus-focus="' + esc(item.facility) + '">Explore this area in 3D <span aria-hidden="true">↗</span></a>' : '');
    dialog.querySelector('p').hidden = false;
    dialog.querySelector('p').textContent = item.facility ? 'Rendered from the 3D campus model. This is an illustrative view, not a photograph of the academy.' : (item.src ? '' : 'Approved facility media will appear here when available.');
    dialog.showModal();
  }));
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) { var r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
  dialog.addEventListener('close', () => { document.getElementById('gallery-preview').replaceChildren(); });

  document.querySelectorAll('[data-session]').forEach(link => link.addEventListener('click', () => { document.getElementById('preferred-session').value = C.timings[Number(link.dataset.session)].session; }));
  document.querySelector('.ground-enquiry').addEventListener('click', () => { var field = document.getElementById('trial-message'); if (!field.value) field.value = 'I would like to enquire about ground availability for a match.'; });
  var form = document.getElementById('trial-form'), enquiryText = '';
  var phone = document.getElementById('player-phone');
  phone.addEventListener('input', () => { var digits = phone.value.replace(/\D/g, ''); phone.setCustomValidity(digits.length >= 10 && digits.length <= 15 ? '' : 'Enter a phone number with 10 to 15 digits.'); });
  form.addEventListener('input', () => { document.getElementById('trial-result').hidden = true; enquiryText = ''; });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    var values = new FormData(form);
    enquiryText = C.brand.full + ' — Trial enquiry\n\n' + [['Player Name','playerName'], ['Age','age'], ['Parent Name','parentName'], ['Phone Number','phone'], ['Experience Level','experience'], ['Preferred Training Session','session'], ['Message','message']].map(([label, key]) => label + ': ' + (String(values.get(key) || '').trim() || '—')).join('\n');
    document.getElementById('trial-summary').textContent = enquiryText;
    var result = document.getElementById('trial-result'); result.hidden = false; result.focus({ preventScroll: true }); result.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
  document.getElementById('download-enquiry').addEventListener('click', () => {
    if (!enquiryText) return;
    var url = URL.createObjectURL(new Blob([enquiryText], { type: 'text/plain;charset=utf-8' }));
    var a = document.createElement('a'); a.href = url; a.download = 'trial-enquiry.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  var toggle = document.getElementById('menu-toggle'), nav = document.getElementById('nav-links');
  function closeMenu() { toggle.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open'); }
  toggle.addEventListener('click', () => { var open = toggle.getAttribute('aria-expanded') !== 'true'; toggle.setAttribute('aria-expanded', String(open)); nav.classList.toggle('is-open', open); });
  nav.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeMenu(); } });
  document.querySelectorAll('[data-scene-overview]').forEach(link => link.addEventListener('click', () => document.getElementById('back-btn').click()));
  // The href already scrolls to the hero; this only asks the campus to frame that facility once it is there.
  document.addEventListener('click', event => {
    var link = event.target.closest('[data-campus-focus]');
    if (!link) return;
    if (dialog.open) dialog.close();
    window.dispatchEvent(new CustomEvent('academy:focus-facility', { detail: { key: link.dataset.campusFocus } }));
  });

  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } }), { threshold: 0.08 });
    document.querySelectorAll('[data-reveal]').forEach(el => { el.classList.add('will-reveal'); observer.observe(el); });
  }
})();
