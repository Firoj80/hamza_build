export const studio = { name: 'Launchpad Studio', price: 19, currency: 'USD', slug: 'launchpad-studio', href: '/products/launchpad-studio' } as const;
export const guide = { name: 'Idea-to-Income Fieldguide', price: 0, currency: 'USD', slug:'first-product-fieldguide', href: '/products/first-product-fieldguide', readerHref: '/fieldguide' } as const;
export const social = { threads: 'https://www.threads.com/@build_hamza', x: 'https://x.com/hamza_build' };

export const productDetails = {
  'first-product-fieldguide': {
    product: 'fieldguide' as const,
    name: guide.name,
    price: guide.price,
    eyebrow: 'THE FIRST STEP',
    headline: 'Turn one useful problem into a clear first launch.',
    description: 'A practical seven-page guide for choosing a specific audience, checking whether a problem matters, shaping a small product, and planning an honest launch.',
    image: '/images/first-product-fieldguide.webp',
    imageAlt: 'Green workbook mockup with the earlier First Product Fieldguide cover title',
    imageLabel: 'FIELDGUIDE COVER CONCEPT',
    includes: [
      'A worked example and a fill-in idea brief',
      'Five questions for learning from potential users',
      'AI prompts to outline, draft and review your resource',
      'A practical listing template and launch checklist',
      'A simple way to compare views, visits and purchases',
    ],
    sections: [
      { title: 'Start with a real problem', body: 'Choose one person and one recurring task. Use the research questions to understand what they do today before investing in a large product.' },
      { title: 'Make a small, useful first version', body: 'Use the examples and prompts to prepare a focused draft. Add your own knowledge, verify facts, and ask a few relevant people to try it.' },
      { title: 'Plan the next step', body: 'Write an honest listing, show one useful result, and track relevant visits and purchases so your next decision comes from evidence.' },
    ],
    access: 'Free seven-page reader inside your account. Create a free account to open it; no checkout or payment is required.',
    limitation: 'The guide provides prompts and a plan; it does not validate demand, run AI, publish for you, or promise sales.',
    nextStep: 'Finished the guide and ready to organise prompts, product copy and launch tasks in one place? Launchpad Studio is an optional $19 one-time purchase.',
    nextHref: studio.href,
  },
  'launchpad-studio': {
    product: 'studio' as const,
    name: studio.name,
    price: studio.price,
    eyebrow: 'THE ONLINE WORKSPACE',
    headline: 'Take your product idea from notes to a launch plan.',
    description: 'A private, browser-based workspace that helps you investigate an idea, prepare prompts, shape your offer, draft useful posts and keep launch notes together.',
    image: '/images/screenshots/studio-validate.jpg',
    imageAlt: 'Launchpad Studio validation workspace screenshot',
    imageLabel: 'REAL WORKSPACE SCREENSHOT',
    includes: [
      'A guided idea and customer-evidence workspace',
      'Editable prompts to use with an AI tool you choose',
      'Thirty distinct post angles you can customise',
      'Listing copy, your own links and a scenario calculator',
      'A launch checklist and account-saved progress',
    ],
    sections: [
      { title: 'Work through five clear stages', body: 'Move from idea validation to prompts, content, the offer and launch measurement. Use the step navigation to focus on one task at a time.' },
      { title: 'Turn your context into useful drafts', body: 'Add your audience, problem and evidence once. Use them in editable AI prompts, post starters and listing copy, then replace every placeholder with your own verified details.' },
      { title: 'Keep your plan in your account', body: 'Save research notes and launch progress in your private workspace. Return through your library whenever you are ready to continue.' },
    ],
    access: 'Private online workspace in your Hamza Idrishi account. One-time payment of $19 USD. No app ZIP or HTML download.',
    limitation: 'Studio prepares editable templates and arithmetic scenarios. It does not run an AI model, publish posts, validate demand or forecast earnings.',
    nextStep: 'Want a free guided foundation before opening the workspace? Start with the Idea-to-Income Fieldguide.',
    nextHref: guide.href,
  },
} as const;
