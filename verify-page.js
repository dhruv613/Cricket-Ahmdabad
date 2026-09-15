(async () => {
  const results = [];
  const assert = (name, passed, detail) => { results.push({ name, passed, detail }); if (!passed) throw Error(name + ': ' + JSON.stringify(detail)); };
  const $ = selector => document.querySelector(selector);
  assert('All 13 page components render', document.querySelectorAll('[data-component]').length === 13);
  assert('Three.js model is ready', !!$('campus-scene')._api && !!$('campus-scene canvas'));
  assert('All in-page links resolve', [...document.querySelectorAll('a[href^="#"]')].every(a => document.getElementById(a.hash.slice(1))));
  assert('No horizontal overflow', document.documentElement.scrollWidth <= innerWidth, { width: innerWidth, scroll: document.documentElement.scrollWidth });
  for (const filter of document.querySelectorAll('[data-filter]')) {
    filter.click();
    const visible = [...document.querySelectorAll('.gallery-item')].filter(item => !item.hidden);
    assert('Gallery filter: ' + filter.dataset.filter, visible.length > 0 && visible.every(item => filter.dataset.filter === 'All' || item.dataset.category === filter.dataset.filter));
  }
  $('[data-filter="All"]').click();
  $('[data-gallery="0"]').click();
  assert('Gallery preview opens', $('#gallery-dialog').open);
  $('.dialog-close').click();
  assert('Gallery preview closes', !$('#gallery-dialog').open);
  const detail = $('.facility-detail'); detail.querySelector('summary').click();
  assert('Facility detail expands', detail.open); detail.querySelector('summary').click();
  const wheel = new WheelEvent('wheel', { deltaY: 250, bubbles: true, cancelable: true }); $('campus-scene canvas').dispatchEvent(wheel);
  assert('Model does not trap page scrolling', !wheel.defaultPrevented);
  for (const key of ['ground','nets','coaching','analysis','fitness']) {
    $('[data-key="' + key + '"]').click();
    assert('3D selector updates detail: ' + key, $('#facility-panel').style.opacity === '1' && $('[data-key="' + key + '"]').getAttribute('aria-pressed') === 'true');
  }
  $('#back-btn').click();
  assert('Campus overview restores hero', $('#hero-content').style.opacity === '1' && $('#facility-panel').inert);
  $('#explore-campus').click();
  assert('Explore mode exposes campus', $('#top').classList.contains('is-exploring') && $('#hero-content').inert);
  $('#back-btn').click();
  const form = $('#trial-form');
  assert('Empty trial form rejected', !form.checkValidity());
  const values = { playerName: 'Test Player', age: '15', parentName: 'Test Parent', phone: '9999999999', experience: 'Beginner', message: 'Website verification only.' };
  for (const [key, value] of Object.entries(values)) { form.elements[key].value = value; form.elements[key].dispatchEvent(new Event('input', { bubbles: true })); }
  $('[data-session="1"]').click();
  assert('Session link prefills the form', form.elements.session.value === window.ACADEMY.timings[1].session);
  assert('Completed form valid', form.checkValidity());
  const before = performance.getEntriesByType('resource').length;
  form.requestSubmit();
  assert('Local enquiry is explicit about no submission', !$('#trial-result').hidden && $('#trial-result').innerText.includes('not submitted'));
  assert('Enquiry includes selected session', $('#trial-summary').textContent.includes(window.ACADEMY.timings[1].session));
  assert('Enquiry makes no network request', performance.getEntriesByType('resource').length === before);
  form.reset(); form.dispatchEvent(new Event('input', { bubbles: true }));
  $('.ground-enquiry').click();
  assert('Ground enquiry prefills message', form.elements.message.value.includes('ground availability'));
  form.reset(); form.dispatchEvent(new Event('input', { bubbles: true }));
  assert('Player data is not persisted', !localStorage.length && !sessionStorage.length);
  window.scrollTo({ top: 0, behavior: 'instant' });
  return JSON.stringify(results);
})()
