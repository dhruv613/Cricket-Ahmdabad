/* academy-config.js — SINGLE SOURCE OF TRUTH for all copy.
   Seventeen Sports — Cricket Academy & Facility, Vastral, Ahmedabad, Gujarat.
   Loaded from <helmet> before render. */
window.ACADEMY = {
  brand: {
    monogram: '17',
    mark: 'SEVENTEEN SPORTS',
    markSub: 'CRICKET ACADEMY & FACILITY',
    full: 'SEVENTEEN SPORTS',
    kicker: 'SEVENTEEN SPORTS · CRICKET ACADEMY & FACILITY'
  },

  hero: {
    headlineTop: 'MORE THAN A FACILITY.',
    headlineBottom: 'A HOME FOR FUTURE CHAMPIONS.',
    sub: 'Professional cricket coaching, world-class practice infrastructure and structured player development.',
    supportingLine: 'LEARN • PRACTICE • GROW • ACHIEVE',
    primaryCta: { label: 'BOOK A TRIAL', href: '#admission' },
    secondaryCta: 'EXPLORE FACILITIES',
    overviewCta: '← CAMPUS OVERVIEW'
  },

  nav: [
    { label: 'HOME', href: '#top' },
    { label: 'FACILITIES', href: '#facilities' },
    { label: 'PROGRAMS', href: '#programs' },
    { label: 'COACHING', href: '#coaching' },
    { label: 'TIMINGS', href: '#timings' },
    { label: 'GALLERY', href: '#gallery' },
    { label: 'CONTACT', href: '#contact' }
  ],
  navCta: { label: 'ADMISSIONS OPEN', href: '#admission' },

  /* `key` must match the zone key in campus/facilities.js. `label` is the short form used by the
     facility navigation; the longer in-scene hotspot label lives in facilities.js. */
  facilities: [
    {
      key: 'ground', num: '01', label: 'GROUND',
      title: 'Full-Size Cricket Ground',
      points: ['Night match facility', 'Tournament ready', 'Well-maintained outfield', 'Floodlights for evening play'],
      href: '#ground'
    },
    {
      key: 'nets', num: '02', label: 'NETS',
      title: 'Outdoor Practice Nets',
      points: ['Open-air training lanes', 'Turf and astro practice surfaces', 'Professional net setup', 'Spacious practice area'],
      href: '#outdoor'
    },
    {
      key: 'courts', num: '03', label: 'COURTS',
      title: 'Outdoor Multi-Sport Courts',
      points: ['Volleyball court', 'Two pickleball courts', 'Open-air recreation', 'Court-side seating'],
      href: '#facilities'
    },
    {
      key: 'food', num: '04', label: 'FOOD COURT',
      title: 'Food Court & Office',
      points: ['Player and visitor refreshment area', 'Office and reception', 'Direct access from the courts'],
      href: '#contact'
    },
    {
      key: 'arrival', num: '05', label: 'ARRIVAL',
      title: 'Entrance & Parking',
      points: ['Main entrance from the 9 m road', 'Open tapered driveway and parking', 'Academy access beside the food court and office'],
      href: '#contact'
    }
  ],

  contact: {
    name: 'YASH BHATT',
    phone: '83470 33055',
    phoneHref: 'tel:+918347033055',
    whatsappNumber: '918347033055',
    directionsQuery: 'Seventeen Sports, Opp. New Kabir Mandir, Vastral Gaam, Vastral - Gatrad Road, Vastral, Ahmedabad, Gujarat - 382418',
    // The academy's own Google Maps listing. More reliable than geocoding the address string.
    mapUrl: 'https://maps.app.goo.gl/FL49jXqMrBy3pQkW6',
    address: 'Opp. New Kabir Mandir, Vastral Gaam, Vastral - Gatrad Road, Vastral, Ahmedabad, Gujarat - 382418'
  },

  timings: [
    { session: 'Morning Session', time: '7:00 AM – 9:00 AM' },
    { session: 'Evening Session 01', time: '4:00 PM – 6:00 PM' },
    { session: 'Evening Session 02', time: '6:30 PM – 8:30 PM' }
  ],
  // Official client copy and replaceable media. Campus renders are labelled as 3D views.
  content: {
    stats: [['05', 'Outdoor Practice Nets'], ['01', 'Volleyball Court'], ['02', 'Pickleball Courts'], ['100 M', 'Cricket Ground']],
    about: {
      eyebrow: 'About Seventeen Sports',
      heading: ['BUILDING BETTER PLAYERS.', 'BUILDING STRONGER FUTURES.'],
      description: 'Based in Ahmedabad, Seventeen Sports is a professionally managed cricket academy and training facility focused on developing young players through structured coaching, quality infrastructure and a player-first training environment.',
      pillars: ['Professional & Scientific Coaching', 'World-Class Infrastructure', 'Player-Centric Approach', 'Discipline & Character Building', 'Development for Every Young Cricketer'],
      statement: ["WE DON’T JUST TRAIN PLAYERS.", 'WE BUILD FUTURES.']
    },
    outdoor: {
      heading: ['OUTDOOR PRACTICE NETS'],
      subheading: ['BIGGER PRACTICE.', 'BETTER PLAYERS.'],
      surfaces: [
        { number: '04', label: 'Turf Lanes', points: ['Match-Like Bounce', 'Natural Practice Environment', 'Advanced Skill Work'] },
        { number: '01', label: 'Astro Lane', points: ['Consistent Surface', 'High-Volume Training', 'Technical Practice'] }
      ],
      points: ['Spacious Nets', 'Professional Setup', 'Safe & Secure Environment', 'Suitable for All Age Groups'],
      media: { label: 'Outdoor practice nets — 3D campus view', kind: 'outdoor', src: 'assets/campus/views/outdoor-nets.webp', type: 'image' },
      /* `facility` must match a key in the `facilities` list above so the hero campus can frame it. */
      model: { facility: 'nets', badge: '3D model view', cta: 'View the nets in 3D', note: 'Opens the campus model at the nets', caption: '05 NETS · TURF & ASTRO' }
    },
    ground: {
      heading: ['FULL-SIZE GROUND.', 'UNDER THE LIGHTS.'],
      subheading: ['PLAY BIGGER.', 'DREAM HIGHER.'],
      points: ['Full-Size Cricket Ground', 'Night Match Facility', 'Practice Matches', 'Tournament Ready', 'Maintained Outfield', 'Floodlights for Evening & Night Play', 'Suitable for Academies', 'Suitable for Clubs', 'Suitable for Corporate Matches'],
      cta: 'Ground Enquiry',
      media: { label: 'Full-size cricket ground — 3D campus view', kind: 'ground', src: 'assets/campus/views/ground-day.webp', type: 'image' },
      model: { facility: 'ground', badge: '3D model view', cta: 'Explore the ground in 3D', note: 'See the oval, pitch and floodlights', caption: 'FULL-SIZE OVAL · MATCH READY' }
    },
    coaching: {
      eyebrow: 'Professional Coaching',
      heading: ['GUIDED BY EXPERIENCE.', 'DRIVEN BY RESULTS.'],
      points: ['Experienced Coaches', 'Personal Attention', 'Modern Training Methods', 'Batting, Bowling & Fielding', 'Strength & Conditioning', 'Video Analysis', 'Regular Performance Reviews', 'Programs for Different Age Groups'],
      categories: ['Individual Coaching', 'Group Sessions', 'Bowling Machine', 'Skill Development']
    },
    schedule: {
      heading: ['TRAIN REGULARLY.', 'GROW CONSISTENTLY.'],
      points: ['Flexible Batches', 'Well-Structured Training', 'Suitable for School & College Students', 'Personal Coaching Available']
    },
    facilities: {
      heading: ['EVERYTHING A', 'CRICKETER NEEDS.'],
      items: [
        ['4 Turf Practice Lanes', 'Natural practice lanes for advanced skill work.', '#outdoor'],
        ['1 Astro Practice Lane', 'A consistent surface for technical practice.', '#outdoor'],
        ['100 m Cricket Ground', 'A circular ground for practice matches and tournament play.', '#ground'],
        ['Night Facility', 'Floodlights for evening and night play.', '#ground'],
        ['Volleyball Court', 'An open-air court within the Vastral site plan.', '#facilities'],
        ['2 Pickleball Courts', 'Outdoor recreation courts beside the practice area.', '#facilities'],
        ['Food Court & Office', 'Visitor refreshment, office, and reception facilities.', '#contact'],
        ['Visitor Parking', 'On-site parking at the main entrance from the 9 m road.', '#contact'],
        ['Professional Coaching', 'Structured training in batting, bowling and fielding.', '#coaching'],
        ['Personal Coaching', 'Individual attention for your development.', '#coaching'],
        ['Video Analysis', 'Review technique and track player progress.', '#coaching'],
        ['Ground Rental for Matches', 'Enquire about ground availability for your next match.', '#contact'],
        ['Cricket Pitch Rental', 'Contact the academy for pitch availability.', '#contact'],
        ['Safe & Secure Environment', 'A player-first environment for young cricketers.', '#about']
      ]
    },
    gallery: {
      heading: ['SEE THE FACILITY', 'IN ACTION.'],
      filters: ['All', 'Outdoor', 'Ground', 'Coaching', 'Matches'],
      items: [
        { label: 'Room to find your rhythm', category: 'Outdoor', kind: 'outdoor', type: 'image', src: 'assets/campus/views/outdoor-nets.webp', facility: 'nets' },
        { label: 'The full-size cricket ground', category: 'Ground', kind: 'ground', type: 'image', src: 'assets/campus/views/ground-day.webp', facility: 'ground' },
        { label: 'Under the lights', category: 'Ground', kind: 'ground', type: 'image', src: 'assets/campus/views/ground-night.webp', facility: 'ground' },
        { label: 'A closer look at the practice lanes', category: 'Outdoor', kind: 'outdoor', type: 'image', src: 'assets/campus/views/nets-training.webp', facility: 'nets' },
        { label: 'Built for match day', category: 'Matches', kind: 'ground', type: 'image', src: 'assets/campus/views/match-ground.webp', facility: 'ground' },
        { label: 'Outdoor courts and recreation', category: 'Coaching', kind: 'coaching', type: 'image', src: 'assets/campus/views/fitness.webp', facility: 'courts' }
      ]
    },
    admission: {
      eyebrow: 'Admissions Open',
      heading: ['YOUR CRICKET', 'JOURNEY STARTS HERE.'],
      experience: ['Beginner', 'Intermediate', 'Advanced'],
      cta: 'Book a Trial Session',
      note: 'This form prepares your enquiry on this device. Nothing is submitted online. Contact the academy to confirm your trial.'
    }
  }
};
window.dispatchEvent(new Event('academy:config'));
