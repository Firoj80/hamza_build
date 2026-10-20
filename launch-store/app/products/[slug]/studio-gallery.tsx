'use client';

import Image from 'next/image';
import { useState } from 'react';

const screens = [
  { src: '/images/screenshots/studio-validate.jpg', alt: 'Validation workspace for defining an audience, problem and customer evidence', title: 'Validate an idea', description: 'Keep your audience, problem and research notes together.' },
  { src: '/images/screenshots/studio-prompts.jpg', alt: 'Editable AI prompt workspace', title: 'Prepare prompts', description: 'Use your context to draft prompts, then review the output in your chosen AI tool.' },
  { src: '/images/screenshots/studio-content.jpg', alt: 'Thirty editable content post starters', title: 'Plan useful posts', description: 'Choose an angle, add a real example and make each draft yours.' },
  { src: '/images/screenshots/studio-store.jpg', alt: 'Product listing, links and scenario calculator workspace', title: 'Shape the offer', description: 'Describe real deliverables and model scenarios using your own assumptions.' },
  { src: '/images/screenshots/studio-checklist.jpg', alt: 'Launch checklist and results notes workspace', title: 'Launch and learn', description: 'Track next actions and record what happens after you publish.' },
];

export default function StudioGallery() {
  const [active, setActive] = useState(0);
  const screen = screens[active];

  return <section className="detail-gallery" aria-label="Launchpad Studio screenshots">
    <div className="gallery-bar"><span><i/> INSIDE LAUNCHPAD STUDIO</span><small>REAL PRODUCT SCREENS</small></div>
    <div className="gallery-tabs" role="tablist" aria-label="Choose a workspace screen">
      {screens.map((item, index) => <button key={item.src} type="button" role="tab" aria-selected={active === index} aria-controls="studio-screen" onClick={() => setActive(index)}>
        <span>{String(index + 1).padStart(2, '0')}</span>{item.title}
      </button>)}
    </div>
    <figure className="detail-gallery-image" id="studio-screen" role="tabpanel">
      <Image src={screen.src} alt={screen.alt} width={1440} height={1000} />
      <figcaption><b>{screen.title}</b><span>{screen.description}</span></figcaption>
    </figure>
  </section>;
}
