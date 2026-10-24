import { guide, studio } from './catalog';

export type EmailSegmentKey =
  | 'registered_only'
  | 'buyer_5'
  | 'buyer_9'
  | 'review_request';

export type TemplateSlot = 1 | 2 | 3 | 4 | 5;

export type EmailTemplate = {
  id: string;
  segment: EmailSegmentKey;
  slot: TemplateSlot;
  title: string;
  badge: string;
  subject: string;
  body: string;
  updatedAt: string;
};

export type SegmentAutomationConfig = {
  segment: EmailSegmentKey;
  autoSendEnabled: boolean;
  activeTemplateSlot: TemplateSlot;
  skipAlreadyEmailed: boolean;
  updatedAt: string;
};

export type SentEmailLog = {
  id: string;
  to: string;
  userId?: string;
  segment: EmailSegmentKey;
  templateSlot: TemplateSlot;
  subject: string;
  mode: 'manual' | 'auto';
  status: 'sent' | 'failed';
  gmailMessageId?: string;
  error?: string;
  sentAt: string;
};

export type ProductReview = {
  id: string;
  email: string;
  name: string;
  role: string;
  productKey: 'fieldguide' | 'studio' | 'both';
  rating: number;
  headline: string;
  comment: string;
  verifiedBuyer: boolean;
  published: boolean;
  createdAt: string;
};

export const EMAIL_SEGMENTS: {
  key: EmailSegmentKey;
  label: string;
  shortLabel: string;
  description: string;
  automationHint: string;
}[] = [
  {
    key: 'registered_only',
    label: 'Only Registered Users',
    shortLabel: 'Registered Only',
    description: 'Users who created an account on your store but have not completed a $5 or $9 purchase yet.',
    automationHint: 'When Auto-Send is ON, newly registered non-buyers automatically receive the selected template when you open the dashboard with Gmail connected.'
  },
  {
    key: 'buyer_5',
    label: '$5 Fieldguide Buyers',
    shortLabel: '$5 Buyers',
    description: `Verified buyers who unlocked the $5 ${guide.name}. Great for onboarding tips and upgrading to the $9 Studio.`,
    automationHint: 'When Auto-Send is ON, every $5 Fieldguide buyer automatically receives the selected onboarding or Studio upgrade template once.'
  },
  {
    key: 'buyer_9',
    label: '$9 Launchpad Studio Buyers',
    shortLabel: '$9 Buyers',
    description: `Verified buyers who unlocked the $9 ${studio.name} 5-stage workspace.`,
    automationHint: 'When Auto-Send is ON, every $9 Launchpad Studio buyer automatically receives the selected workspace guide template once.'
  },
  {
    key: 'review_request',
    label: 'Collect Rating & Review',
    shortLabel: 'Rating & Review',
    description: 'Send a 1-click rating & review link to buyers so they can leave a 1–5 star rating and written testimonial.',
    automationHint: 'When Auto-Send is ON, verified buyers who have not submitted a review yet automatically receive the selected review request template.'
  }
];

export const TEMPLATE_VARIABLES = [
  { token: '{{name}}', label: 'Customer Name', example: 'Alex' },
  { token: '{{email}}', label: 'Customer Email', example: 'alex@example.com' },
  { token: '{{product_name}}', label: 'Product Name', example: 'Idea-to-Income Fieldguide ($5)' },
  { token: '{{review_url}}', label: '1-Click Review Link', example: 'https://buildhamza.com/review?email=...' },
  { token: '{{library_url}}', label: 'Personal Library URL', example: 'https://buildhamza.com/library' },
  { token: '{{store_url}}', label: 'Storefront URL', example: 'https://buildhamza.com' },
  { token: '{{fieldguide_url}}', label: '$5 Fieldguide URL', example: 'https://buildhamza.com/products/first-product-fieldguide' },
  { token: '{{studio_url}}', label: '$9 Studio URL', example: 'https://buildhamza.com/products/launchpad-studio' }
] as const;

const DEFAULT_TIMESTAMP = '2026-04-01T00:00:00.000Z';

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  // ============================================================================
  // SEGMENT 1: ONLY REGISTERED USERS (5 TEMPLATES)
  // ============================================================================
  {
    id: 'registered_only_1',
    segment: 'registered_only',
    slot: 1,
    title: 'Template 1 · Warm Welcome & First Small Step',
    badge: 'Welcome Note',
    subject: 'Welcome, {{name}} — your account is ready (+ where to begin)',
    body: `Hi {{name}},

Thanks for creating your account on Hamza Idrishi’s Launch Store ({{email}}).

Most first-time creators get stuck because they try to plan a massive product before checking if one specific problem matters.

If you want a calm, structured way to start this week:

1. Idea-to-Income Fieldguide ($5 one-time):
A practical 7-page guide with 5 customer validation questions, a worked example, 3 AI prompts, and a launch checklist.
Explore it here: {{fieldguide_url}}

2. Launchpad Studio ($9 one-time):
A private 5-stage online workspace with 30 editable post starters, an offer builder, and a scenario calculator.
Explore it here: {{studio_url}}

Your personal library is ready anytime at:
{{library_url}}

Reply directly to this email if you have any questions about which tool fits your current stage.

Best,
Hamza Idrishi`,
    updatedAt: DEFAULT_TIMESTAMP
  },
  {
    id: 'registered_only_2',
    segment: 'registered_only',
    slot: 2,
    title: 'Template 2 · Checkout Check-in & Quick Help',
    badge: 'Cart Recovery',
    subject: 'Quick check-in on your account, {{name}}',
    body: `Hi {{name}},

I noticed you signed up for an account at {{store_url}} but haven’t unlocked a tool in your library yet.

Did you run into any issue during checkout, or were you unsure whether to start with the $5 Fieldguide or the $9 Launchpad Studio?

Here is the quick difference:
• Start with the $5 Idea-to-Income Fieldguide if you are still choosing your audience and problem: {{fieldguide_url}}
• Start with the $9 Launchpad Studio if you already have an idea and want the 5-stage workspace + 30 post starters: {{studio_url}}

Both are one-time purchases (no subscription) and unlock immediately inside your library:
{{library_url}}

Just hit reply if I can help with anything!

Best,
Hamza Idrishi`,
    updatedAt: DEFAULT_TIMESTAMP
  },
  {
    id: 'registered_only_3',
    segment: 'registered_only',
    slot: 3,
    title: 'Template 3 · The 1-Problem Rule ($5 Fieldguide Invite)',
    badge: 'Value Framework',
    subject: 'The simplest way to validate your first $5–$19 digital product',
    body: `Hi {{name}},

Before you spend weeks building a digital product, ask yourself one question:
"Who is the specific person, and what recurring task is slowing them down every week?"

Inside the 7-page Idea-to-Income Fieldguide ($5), I break down:
• How to score a problem before building
• 5 non-leading questions to ask potential buyers
• 3 AI prompts to draft and pressure-test your first version
• A clean listing template and launch checklist

You can unlock the full Fieldguide in your account for a one-time $5 payment here:
{{fieldguide_url}}

Or open your library directly:
{{library_url}}

Keep the first version small,
Hamza Idrishi`,
    updatedAt: DEFAULT_TIMESTAMP
  },
  {
    id: 'registered_only_4',
    segment: 'registered_only',
    slot: 4,
    title: 'Template 4 · Inside Launchpad Studio ($9 Workspace Tour)',
    badge: 'Workspace Tour',
    subject: 'How to organise your product launch in 5 clear stages',
    body: `Hi {{name}},

Switching between scattered notes makes launching harder than it needs to be.

That’s why I built Launchpad Studio ($9) — a private browser workspace linked to your account ({{email}}).

Inside Launchpad Studio, you work through 5 stages:
01. Validate your audience, problem, and free/paid offer
02. Log real customer evidence & generate custom AI prompts
03. Customise 30 distinct Threads/X post starters
04. Draft your store listing copy & test realistic revenue scenarios
05. Track your 7-point launch checklist in the cloud

Take a look inside Launchpad Studio ($9 one-time):
{{studio_url}}

Best,
Hamza Idrishi`,
    updatedAt: DEFAULT_TIMESTAMP
  },
  {
    id: 'registered_only_5',
    segment: 'registered_only',
    slot: 5,
    title: 'Template 5 · Short Founder Note (What are you building?)',
    badge: 'Founder Note',
    subject: 'What are you working on right now, {{name}}?',
    body: `Hi {{name}},

Thanks again for joining via {{store_url}}.

I read every reply to these emails — what kind of digital product or side project are you thinking about making first?

Reply with a sentence or two and I’ll gladly point you toward the most useful first step (or you can jump straight into your library at {{library_url}}).

Cheers,
Hamza Idrishi`,
    updatedAt: DEFAULT_TIMESTAMP
  },

  // ============================================================================
  // SEGMENT 2: $5 FIELDGUIDE BUYERS (5 TEMPLATES)
  // ============================================================================
  {
    id: 'buyer_5_1',
    segment: 'buyer_5',
    slot: 1,
    title: 'Template 1 · Welcome to the $5 Fieldguide + Quick Start',
    badge: 'Buyer Onboarding',
    subject: 'Your Idea-to-Income Fieldguide ($5) is unlocked — how to start today',
    body: `Hi {{name}},

Thank you for picking up the Idea-to-Income Fieldguide! Your 7-page reader is unlocked and ready in your account ({{email}}).

Open your Fieldguide anytime here:
{{library_url}}

How to get the most value in the next 20 minutes:
1. Read Section 01 & 02 and pick ONE specific person + ONE recurring task.
2. Fill in the Idea Brief & Validation Scorecard before writing a single page of your product.
3. Use the 5 customer-research questions to talk to 3–5 real people this week.

If you ever need help or want to share the idea brief you drafted, just reply to this email.

Best,
Hamza Idrishi`,
    updatedAt: DEFAULT_TIMESTAMP
  },
  {
    id: 'buyer_5_2',
    segment: 'buyer_5',
    slot: 2,
    title: 'Template 2 · Customer Validation Scorecard Check-in',
    badge: 'Action Nudge',
    subject: 'Did you test your idea against the 5 validation questions yet?',
    body: `Hi {{name}},

Checking in on your progress with the Idea-to-Income Fieldguide!

A quick tip from Page 3 of your guide:
When you ask potential users the 5 research questions, don’t ask "Would you buy this?" Instead, ask how they solved the problem the last time it happened and what frustrated them about it.

You can revisit the validation scorecard in your library anytime:
{{library_url}}

Once you’ve enjoyed the Fieldguide, I’d also love to hear your honest rating & review here:
{{review_url}}

Keep going,
Hamza Idrishi`,
    updatedAt: DEFAULT_TIMESTAMP
  },
  {
    id: 'buyer_5_3',
    segment: 'buyer_5',
    slot: 3,
    title: 'Template 3 · Getting Better Results from the 3 AI Prompts',
    badge: 'Prompt Tips',
    subject: 'Tip for Page 4: Using the Fieldguide AI prompts with your own notes',
    body: `Hi {{name}},

When you reach the AI prompts in your Idea-to-Income Fieldguide, here is the secret to making your draft sound genuinely useful instead of generic:

Paste 2–3 real quotes or observations from your customer research directly into the prompt context, and tell the AI what NOT to exaggerate.

Open your Fieldguide reader to copy the prompts:
{{library_url}}

And if the guide has been helpful so far, you can leave a quick 30-second rating here:
{{review_url}}

Best,
Hamza Idrishi`,
    updatedAt: DEFAULT_TIMESTAMP
  },
  {
    id: 'buyer_5_4',
    segment: 'buyer_5',
    slot: 4,
    title: 'Template 4 · Next Step: Upgrade to Launchpad Studio ($9)',
    badge: 'Studio Upgrade',
    subject: 'Ready to turn your Fieldguide notes into a launch plan, {{name}}?',
    body: `Hi {{name}},

Now that you have the foundation in the Idea-to-Income Fieldguide, you might be ready to organise your actual product draft, listing copy, and launch posts in one place.

That’s exactly what Launchpad Studio ($9 one-time) is built for:
• Interactive 5-stage workspace saved to your account
• Custom AI prompt builder pre-filled with your audience & problem
• 30 distinct, editable social post starters for Threads & X
• Product listing builder + revenue scenario calculator

See everything inside Launchpad Studio ($9):
{{studio_url}}

Or jump back into your personal library:
{{library_url}}

Best,
Hamza Idrishi`,
    updatedAt: DEFAULT_TIMESTAMP
  },
  {
    id: 'buyer_5_5',
    segment: 'buyer_5',
    slot: 5,
    title: 'Template 5 · 7-Day Fieldguide Progress & Review Check-in',
    badge: 'Progress + Review',
    subject: 'How is your first product coming along, {{name}}?',
    body: `Hi {{name}},

It’s been a little while since you unlocked the $5 Idea-to-Income Fieldguide. Have you chosen your first small product topic yet?

1. If you’re still working through the 7 pages, your reader is always waiting at:
{{library_url}}

2. If you have 30 seconds, could you share a quick star rating and review of the Fieldguide? Every review helps other first-time creators know what to expect:
{{review_url}}

Thank you for building alongside me!
Hamza Idrishi`,
    updatedAt: DEFAULT_TIMESTAMP
  },

  // ============================================================================
  // SEGMENT 3: $9 LAUNCHPAD STUDIO BUYERS (5 TEMPLATES)
  // ============================================================================
  {
    id: 'buyer_9_1',
    segment: 'buyer_9',
    slot: 1,
    title: 'Template 1 · Welcome to Launchpad Studio ($9) + 5-Stage Guide',
    badge: 'Studio Onboarding',
    subject: 'Welcome to Launchpad Studio ($9) — your 5-stage workspace is live',
    body: `Hi {{name}},

Thank you for purchasing Launchpad Studio! Your private 5-stage workspace is now active in your account ({{email}}).

Open Launchpad Studio from your library here:
{{library_url}}

Here is the smoothest way to use the workspace today:
• Step 1 (Idea): Pick one of the 8 built-in starter niches or enter your own audience, problem, free resource, and paid offer.
• Step 2 (Evidence & Prompts): Log real observations from users, then copy the tailored AI prompts.
• Step 3 (30 Post Starters): Customise your announcement and build-in-public angles.
• Step 4 & 5 (Offer & Checklist): Draft your listing copy, model realistic scenarios, and check off all 7 launch tasks.

Your progress saves automatically to your account. Reply anytime if you have questions!

Best,
Hamza Idrishi`,
    updatedAt: DEFAULT_TIMESTAMP
  },
  {
    id: 'buyer_9_2',
    segment: 'buyer_9',
    slot: 2,
    title: 'Template 2 · Stage 1 & 2 Tip: Evidence Before Prompts',
    badge: 'Stage 1–2 Tip',
    subject: 'Launchpad Studio Tip: Fill in the 4 core fields + customer evidence first',
    body: `Hi {{name}},

A quick tip for getting the most out of Launchpad Studio:

Once you fill in the 4 core fields in Stage 1 (Audience, Problem, Free Title, and Paid Title), every AI prompt in Stage 2 and all 30 post starters in Stage 3 automatically adapt to your context!

Open your Studio workspace to save your Stage 1 & 2 notes:
{{library_url}}

Best,
Hamza Idrishi`,
    updatedAt: DEFAULT_TIMESTAMP
  },
  {
    id: 'buyer_9_3',
    segment: 'buyer_9',
    slot: 3,
    title: 'Template 3 · Stage 3 Tip: Using Your 30 Post Starters',
    badge: 'Content Plan',
    subject: 'How to turn Stage 3 into a calm 30-day Threads & X launch plan',
    body: `Hi {{name}},

Inside Stage 3 of Launchpad Studio, you have 30 distinct post starters grouped by angle (Problem discovery, Behind-the-scenes, Worked examples, Objection handling, and Direct launch).

You don’t need to write all 30 at once:
Pick 3 angles this week, replace the bracketed placeholders with one real detail from your work, and save your edits directly inside the workspace.

Open Stage 3 in your workspace:
{{library_url}}

And if you’re enjoying Launchpad Studio, I’d love to read your quick review here:
{{review_url}}

Best,
Hamza Idrishi`,
    updatedAt: DEFAULT_TIMESTAMP
  },
  {
    id: 'buyer_9_4',
    segment: 'buyer_9',
    slot: 4,
    title: 'Template 4 · Stage 4 & 5: Scenario Calculator & 7-Point Checklist',
    badge: 'Launch Prep',
    subject: 'Finishing strong: Your 7-point launch checklist in Launchpad Studio',
    body: `Hi {{name}},

When you reach Stage 4 and Stage 5 in Launchpad Studio:
• Use the Scenario Calculator to test realistic conversion numbers for a $5–$19 offer.
• Add your live checkout link and deliverables list so everything stays in one place.
• Walk through the 7-point Launch Checklist before publishing your link.

Continue your launch plan here:
{{library_url}}

Once you’ve tried the workspace, please share a quick rating & review:
{{review_url}}

Best,
Hamza Idrishi`,
    updatedAt: DEFAULT_TIMESTAMP
  },
  {
    id: 'buyer_9_5',
    segment: 'buyer_9',
    slot: 5,
    title: 'Template 5 · Complete the Set ($5 Fieldguide Companion + Check-in)',
    badge: 'Companion + Check-in',
    subject: 'Checking in on your Launchpad Studio workspace, {{name}}',
    body: `Hi {{name}},

How is your launch coming together inside Launchpad Studio?

If you also want the 7-page foundational monograph (with the worked example, fillable idea brief, and 5 customer validation questions), you can add the Idea-to-Income Fieldguide ($5) to your library anytime:
{{fieldguide_url}}

Or open your existing Studio workspace here:
{{library_url}}

And if you have 30 seconds to rate your experience with Launchpad Studio, here is your personal review link:
{{review_url}}

Best,
Hamza Idrishi`,
    updatedAt: DEFAULT_TIMESTAMP
  },

  // ============================================================================
  // SEGMENT 4: COLLECT RATING & REVIEW (5 TEMPLATES)
  // ============================================================================
  {
    id: 'review_request_1',
    segment: 'review_request',
    slot: 1,
    title: 'Template 1 · Quick 30-Second Rating & Review Request',
    badge: '1-Click Star Rating',
    subject: 'Quick question about {{product_name}}, {{name}} ⭐',
    body: `Hi {{name}},

Thank you again for picking up {{product_name}}!

Could you spare 30 seconds to leave an honest 1–5 star rating and a short note on how you’re using it?

Click here to rate & review (takes less than a minute):
{{review_url}}

Your feedback helps me improve the tools and helps other first-time creators know what to expect before they start.

Thank you so much,
Hamza Idrishi`,
    updatedAt: DEFAULT_TIMESTAMP
  },
  {
    id: 'review_request_2',
    segment: 'review_request',
    slot: 2,
    title: 'Template 2 · How Is Your First Launch Going? (Feedback + Review)',
    badge: 'Warm Check-in',
    subject: 'How is your project going with {{product_name}}, {{name}}?',
    body: `Hi {{name}},

I hope you’ve had a chance to explore {{product_name}} inside your library ({{library_url}}).

What part has been the most helpful for your workflow so far — and is there anything you wish were clearer?

You can submit a quick star rating and written review right here:
{{review_url}}

I read every single review personally.

Best,
Hamza Idrishi`,
    updatedAt: DEFAULT_TIMESTAMP
  },
  {
    id: 'review_request_3',
    segment: 'review_request',
    slot: 3,
    title: 'Template 3 · Idea-to-Income Fieldguide ($5) Reader Review',
    badge: 'Fieldguide Review',
    subject: 'Your thoughts on the 7-page Idea-to-Income Fieldguide?',
    body: `Hi {{name}},

Thanks for being one of the early readers of the Idea-to-Income Fieldguide ($5).

Did the 5 customer validation questions, worked example, and launch checklist help clarify your first product idea?

Share your rating (1–5 stars) and a short review here:
{{review_url}}

Need to reopen the Fieldguide first? Here is your library link:
{{library_url}}

Gratefully,
Hamza Idrishi`,
    updatedAt: DEFAULT_TIMESTAMP
  },
  {
    id: 'review_request_4',
    segment: 'review_request',
    slot: 4,
    title: 'Template 4 · Launchpad Studio ($9) Builder Testimonial Request',
    badge: 'Studio Testimonial',
    subject: 'Would love your feedback on Launchpad Studio, {{name}}',
    body: `Hi {{name}},

Thank you for building your launch plan inside Launchpad Studio ($9)!

Whether you used the 5-stage planner, the AI prompt builder, or the 30 post starters, I would love to feature your honest review on the storefront.

Leave your star rating and review in 30 seconds here:
{{review_url}}

Thank you for supporting independent tools!
Hamza Idrishi`,
    updatedAt: DEFAULT_TIMESTAMP
  },
  {
    id: 'review_request_5',
    segment: 'review_request',
    slot: 5,
    title: 'Template 5 · Ultra-Short Founder Note (2-Line Review Ask)',
    badge: 'Short & Direct',
    subject: 'Got 20 seconds to rate {{product_name}}?',
    body: `Hi {{name}},

If {{product_name}} helped you organise your next step, would you mind leaving a quick 1–5 star rating here?
{{review_url}}

Thank you — it means a lot!
Hamza Idrishi`,
    updatedAt: DEFAULT_TIMESTAMP
  }
];

export const DEFAULT_AUTOMATION_CONFIGS: Record<EmailSegmentKey, SegmentAutomationConfig> = {
  registered_only: {
    segment: 'registered_only',
    autoSendEnabled: false,
    activeTemplateSlot: 1,
    skipAlreadyEmailed: true,
    updatedAt: DEFAULT_TIMESTAMP
  },
  buyer_5: {
    segment: 'buyer_5',
    autoSendEnabled: false,
    activeTemplateSlot: 1,
    skipAlreadyEmailed: true,
    updatedAt: DEFAULT_TIMESTAMP
  },
  buyer_9: {
    segment: 'buyer_9',
    autoSendEnabled: false,
    activeTemplateSlot: 1,
    skipAlreadyEmailed: true,
    updatedAt: DEFAULT_TIMESTAMP
  },
  review_request: {
    segment: 'review_request',
    autoSendEnabled: false,
    activeTemplateSlot: 1,
    skipAlreadyEmailed: true,
    updatedAt: DEFAULT_TIMESTAMP
  }
};

export const INITIAL_PRODUCT_REVIEWS: ProductReview[] = [
  {
    id: 'rev_seed_1',
    email: 'arjun.builds@example.com',
    name: 'Arjun M.',
    role: 'First-Time Creator · Fieldguide PDF ($5, was $9)',
    productKey: 'fieldguide',
    rating: 5,
    headline: '“Saved me 3 weeks of building the wrong product—shipped my first PDF in 48 hours.”',
    comment:
      'I was overcomplicating a huge Notion course. The 15-point validation scorecard and 5 buyer discovery questions on Page 3 forced me to narrow down to one weekly checklist. Drafted and published my first paid guide in two evenings.',
    verifiedBuyer: true,
    published: true,
    createdAt: '2026-03-18T10:15:00.000Z'
  },
  {
    id: 'rev_seed_2',
    email: 'sara.notes@example.com',
    name: 'Sara K.',
    role: 'Indie Maker · Launchpad Studio HTML App ($9, was $19)',
    productKey: 'studio',
    rating: 5,
    headline: '“The standalone HTML app + 30 Threads post starters paid for itself on Day 1.”',
    comment:
      'Having an offline HTML app that opens right in my browser with zero login friction is a game-changer. I typed my niche once in Stage 1 and all 8 AI prompt modes and 30 Threads posts adapted to my offer automatically.',
    verifiedBuyer: true,
    published: true,
    createdAt: '2026-03-24T14:40:00.000Z'
  },
  {
    id: 'rev_seed_3',
    email: 'dev.dan@example.com',
    name: 'Daniel R.',
    role: 'Solo Builder · Complete Creator Bundle ($12, was $25)',
    productKey: 'both',
    rating: 5,
    headline: '“Best $12 I’ve spent—validated my idea with the PDF and planned my 30-day launch.”',
    comment:
      'Grabbed the $12 bundle for both files. Used the 7-page Fieldguide PDF to score my idea first, then opened Launchpad-Studio.html to write my sales page, swap Threads hooks, and export my full launch plan as Markdown.',
    verifiedBuyer: true,
    published: true,
    createdAt: '2026-03-29T09:20:00.000Z'
  }
];

export function friendlyNameFromEmail(email: string): string {
  if (!email || !email.includes('@')) return 'there';
  const local = email.split('@')[0] || '';
  const cleaned = local
    .replace(/[0-9_.-]+/g, ' ')
    .trim()
    .split(/\s+/)[0];
  if (!cleaned || cleaned.length < 2) return 'there';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
}

export function productNameForCustomer(ownsFieldguide: boolean, ownsStudio: boolean): string {
  if (ownsFieldguide && ownsStudio) return `${guide.name} & ${studio.name}`;
  if (ownsStudio) return `${studio.name} ($9)`;
  if (ownsFieldguide) return `${guide.name} ($5)`;
  return `${guide.name} ($5)`;
}

export function productKeyForCustomer(ownsFieldguide: boolean, ownsStudio: boolean): 'fieldguide' | 'studio' | 'both' {
  if (ownsFieldguide && ownsStudio) return 'both';
  if (ownsStudio) return 'studio';
  return 'fieldguide';
}

export function buildReviewUrl(origin: string, email: string, productKey: 'fieldguide' | 'studio' | 'both'): string {
  const base = (origin || 'https://buildhamza.com').replace(/\/$/, '');
  const params = new URLSearchParams();
  if (email && email.includes('@')) params.set('email', email);
  params.set('product', productKey);
  params.set('rating', '5');
  return `${base}/review?${params.toString()}`;
}

export function interpolateEmailTemplate(
  templateText: string,
  vars: {
    name: string;
    email: string;
    productName: string;
    storeOrigin: string;
    productKey?: 'fieldguide' | 'studio' | 'both';
  }
): string {
  const origin = (vars.storeOrigin || 'https://buildhamza.com').replace(/\/$/, '');
  const reviewUrl = buildReviewUrl(origin, vars.email, vars.productKey || 'fieldguide');
  const map: Record<string, string> = {
    '{{name}}': vars.name || friendlyNameFromEmail(vars.email),
    '{{email}}': vars.email || '',
    '{{product_name}}': vars.productName || guide.name,
    '{{review_url}}': reviewUrl,
    '{{library_url}}': `${origin}/library`,
    '{{store_url}}': origin,
    '{{fieldguide_url}}': `${origin}${guide.href}`,
    '{{studio_url}}': `${origin}${studio.href}`
  };
  let out = templateText;
  for (const [token, value] of Object.entries(map)) {
    out = out.split(token).join(value);
  }
  return out;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function linkifyHtml(escapedText: string): string {
  return escapedText.replace(
    /(https?:\/\/[^\s<]+)/g,
    (url) => `<a href="${url}" style="color:#173b31;font-weight:600;text-decoration:underline;">${url}</a>`
  );
}

export function buildEmailHtml(params: {
  subject: string;
  bodyText: string;
  reviewUrl?: string;
  includeReviewCard?: boolean;
  storeOrigin: string;
}): string {
  const paragraphs = params.bodyText
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block
        .split('\n')
        .map((line) => linkifyHtml(escapeHtml(line)))
        .join('<br/>');
      return `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#1d2925;">${lines}</p>`;
    })
    .join('');

  const reviewCtaHtml =
    params.includeReviewCard && params.reviewUrl
      ? `<div style="margin:24px 0;padding:18px 20px;background:#f4f7f1;border:1px solid #cfe0c7;border-radius:12px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;color:#284739;text-transform:uppercase;margin-bottom:6px;">SHARE YOUR EXPERIENCE · 30 SECONDS</div>
          <div style="font-size:16px;font-weight:700;color:#173b31;margin-bottom:10px;">How would you rate your experience so far?</div>
          <div style="margin-bottom:12px;font-size:20px;letter-spacing:4px;">⭐⭐⭐⭐⭐</div>
          <a href="${escapeHtml(params.reviewUrl)}" style="display:inline-block;background:#173b31;color:#f6f5e9;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:13px;font-weight:600;">Leave a quick rating &amp; review →</a>
        </div>`
      : '';

  const origin = (params.storeOrigin || 'https://buildhamza.com').replace(/\/$/, '');

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:24px 12px;background:#f6f7f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1d2925;">
  <div style="max-width:580px;margin:0 auto;background:#ffffff;border:1px solid #e4e8e1;border-radius:14px;padding:28px 26px;">
    <div style="padding-bottom:16px;margin-bottom:20px;border-bottom:1px solid #edf0eb;display:flex;align-items:center;justify-content:space-between;">
      <span style="font-size:12px;font-weight:700;letter-spacing:0.12em;color:#173b31;text-transform:uppercase;">HAMZA IDRISHI · LAUNCH STORE</span>
    </div>
    ${paragraphs}
    ${reviewCtaHtml}
    <div style="margin-top:26px;padding-top:16px;border-top:1px solid #edf0eb;font-size:12px;color:#79847d;line-height:1.5;">
      Sent from Hamza Idrishi Launch Store · <a href="${escapeHtml(origin)}/library" style="color:#284739;text-decoration:underline;">Open your library</a> · <a href="${escapeHtml(origin)}/review" style="color:#284739;text-decoration:underline;">Rate &amp; Review</a>
    </div>
  </div>
</body>
</html>`;
}

export function buildRfc2822Base64Url(params: {
  to: string;
  subject: string;
  bodyText: string;
  htmlBody: string;
}): string {
  const cleanSubject = params.subject.replace(/[\r\n]+/g, ' ').trim();
  const encodedSubject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(cleanSubject)))}?=`;
  const boundary = `boundary_hamza_${Date.now().toString(36)}`;

  const mime = [
    `To: ${params.to.trim()}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    params.bodyText,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    params.htmlBody,
    '',
    `--${boundary}--`
  ].join('\r\n');

  const base64 = btoa(unescape(encodeURIComponent(mime)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
