/* Reusable approved-media slot. Empty sources intentionally render a labelled placeholder. */
(function () {
  if (customElements.get('image-slot')) return;
  customElements.define('image-slot', class extends HTMLElement {
    connectedCallback() {
      if (this.children.length) return;
      var label = this.getAttribute('label') || 'Facility media';
      var src = this.getAttribute('src');
      var video = this.getAttribute('type') === 'video';
      if (src) {
        var media = document.createElement(video ? 'video' : 'img');
        if (video) { media.controls = true; media.preload = 'none'; media.playsInline = true; media.setAttribute('aria-label', label); }
        else { media.alt = label; media.loading = 'lazy'; media.decoding = 'async'; }
        media.src = src;
        media.addEventListener('error', () => { this.replaceChildren(); this.removeAttribute('src'); this.connectedCallback(); }, { once: true });
        this.appendChild(media);
        return;
      }
      this.classList.add('media-placeholder');
      var illustration = document.createElement('div');
      illustration.className = 'media-lines';
      illustration.setAttribute('aria-hidden', 'true');
      illustration.innerHTML = '<span class="media-boundary"></span><span class="media-pitch"></span><span class="media-stumps"></span><span class="media-light light-one"></span><span class="media-light light-two"></span>';
      var caption = document.createElement('span'); caption.className = 'media-caption';
      var name = document.createElement('strong'); name.textContent = label;
      var note = document.createElement('small'); note.textContent = (video ? 'VIDEO' : 'PHOTO') + ' COMING SOON';
      caption.append(name, note);
      this.append(illustration, caption);
    }
  });
})();
