'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Pencil,
  Trash2,
  Copy,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Upload,
  RotateCcw,
  Save,
  X,
  Package,
  DollarSign,
  Image as ImageIcon,
  FileText,
  Layers,
  KeyRound,
  Eye
} from 'lucide-react';
import type { ManagedProduct } from '@/lib/product-store';
import styles from './sales.module.css';

export type EnrichedManagedProduct = ManagedProduct & {
  resolvedDodo: {
    configured: boolean;
    source: 'admin_ui' | 'env_var' | 'missing';
    envVarName: string;
    maskedId: string;
  };
};

const PRESET_COVERS = [
  {
    label: 'Fieldguide Cover (Light)',
    url: '/images/idea-to-income-fieldguide-cover.svg',
    ogUrl: '/images/idea-to-income-fieldguide-og.png',
    theme: 'light' as const
  },
  {
    label: 'Launchpad Studio Cover (Dark)',
    url: '/images/launchpad-studio-cover.svg',
    ogUrl: '/images/launchpad-studio-og.png',
    theme: 'dark' as const
  },
  {
    label: 'Studio Step 1 Preview',
    url: '/images/studio-step-1-validate.svg',
    ogUrl: '/images/launchpad-studio-og.png',
    theme: 'dark' as const
  },
  {
    label: 'Studio Step 4 Offer Preview',
    url: '/images/studio-step-4-offer.svg',
    ogUrl: '/images/launchpad-studio-og.png',
    theme: 'dark' as const
  }
];

function createBlankProduct(nextNumber: number): ManagedProduct {
  const numStr = String(nextNumber).padStart(2, '0');
  return {
    key: '',
    slug: '',
    name: '',
    price: 15,
    compareAtPrice: null,
    currency: 'USD',
    status: 'active',
    featured: true,
    sortOrder: nextNumber,
    dodoProductId: '',
    dodoEnvVar: '',
    eyebrow: 'CREATOR RESOURCE',
    headline: 'A practical system to execute your next step.',
    badge: '$15 · NEW RELEASE',
    badgeTheme: 'green',
    cardTag: `${numStr} / DIGITAL RESOURCE`,
    ctaLabel: '',
    formatNote: 'Instant account access · One-time purchase · Taxes shown at checkout',
    shortDescription:
      'A focused digital guide and template kit to help you move from idea to execution.',
    description:
      'A complete, structured digital resource with worked examples, templates, and checklists you can put to work immediately inside your account library.',
    shareTitle: '',
    shareDescription: '',
    image: '/images/idea-to-income-fieldguide-cover.svg',
    ogImage: '/images/idea-to-income-fieldguide-og.png',
    imageAlt: 'Digital product cover',
    imageLabel: `EDITION ${numStr} · COVER SHOWCASE`,
    coverTheme: 'light',
    galleryImages: [],
    cardBullets: [
      'Step-by-step framework and fillable templates',
      'Real worked examples and prompts',
      'Instant access inside your personal library'
    ],
    includes: [
      'Complete digital guide and actionable framework',
      'Copy-ready prompts and checklists',
      'Worked examples you can customize for your niche',
      'Permanent access through your Hamza Idrishi account library'
    ],
    sections: [
      {
        title: 'Start with a clear structure',
        body: 'Skip the blank page and use a proven structure designed for solo creators.'
      },
      {
        title: 'Adapt the templates to your audience',
        body: 'Fill in the prompts and worksheets with your own context and verified examples.'
      },
      {
        title: 'Launch and iterate with confidence',
        body: 'Open your resource anytime from your account library on desktop or mobile.'
      }
    ],
    access:
      'Private access in your Hamza Idrishi account. One-time payment in USD. Open anytime through your library.',
    limitation:
      'Provides structured templates and frameworks; it does not guarantee sales or run AI models automatically.',
    nextStep:
      'Want our full 5-stage workspace to organize your launch? Explore Launchpad Studio ($9).',
    nextHref: '/products/launchpad-studio',
    deliveryType: 'hosted_reader',
    readerHref: '',
    externalAccessUrl: '',
    hostedContent:
      'Welcome to your unlocked resource!\n\n1. Read through the core framework below.\n2. Open any attached template link above.\n3. Apply each step to your current project.',
    updatedAt: new Date().toISOString()
  };
}

export default function ProductManagerAdmin({
  initialProducts,
  dodoEnvironment,
  hasDodoApiKey
}: {
  initialProducts: EnrichedManagedProduct[];
  dodoEnvironment: string;
  hasDodoApiKey: boolean;
}) {
  const router = useRouter();
  const [products, setProducts] = useState<EnrichedManagedProduct[]>(initialProducts);
  const [editingProduct, setEditingProduct] = useState<ManagedProduct | null>(null);
  const [originalKey, setOriginalKey] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [showDodoGuide, setShowDodoGuide] = useState(true);
  const [busy, setBusy] = useState(false);
  const [deleteConfirmKey, setDeleteConfirmKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Textarea helpers for newline-separated lists while editing
  const [cardBulletsText, setCardBulletsText] = useState('');
  const [includesText, setIncludesText] = useState('');
  const [galleryText, setGalleryText] = useState('');

  function openCreateModal() {
    const blank = createBlankProduct(products.length + 1);
    setEditingProduct(blank);
    setOriginalKey('');
    setIsCreatingNew(true);
    setCardBulletsText(blank.cardBullets.join('\n'));
    setIncludesText(blank.includes.join('\n'));
    setGalleryText(blank.galleryImages.join('\n'));
    setFeedback(null);
  }

  function openEditModal(prod: ManagedProduct) {
    const clone: ManagedProduct = JSON.parse(JSON.stringify(prod));
    while (clone.sections.length < 3) {
      clone.sections.push({ title: '', body: '' });
    }
    setEditingProduct(clone);
    setOriginalKey(prod.key);
    setIsCreatingNew(false);
    setCardBulletsText(clone.cardBullets.join('\n'));
    setIncludesText(clone.includes.join('\n'));
    setGalleryText((clone.galleryImages || []).join('\n'));
    setFeedback(null);
  }

  function openDuplicateModal(prod: ManagedProduct) {
    const clone: ManagedProduct = JSON.parse(JSON.stringify(prod));
    const nextNum = products.length + 1;
    clone.key = `${prod.key}-copy`;
    clone.slug = `${prod.slug}-copy`;
    clone.name = `${prod.name} (Copy)`;
    clone.sortOrder = nextNum;
    clone.dodoProductId = '';
    clone.dodoEnvVar = '';
    clone.deliveryType = 'hosted_reader';
    clone.readerHref = `/products/${clone.slug}/access`;
    setEditingProduct(clone);
    setOriginalKey('');
    setIsCreatingNew(true);
    setCardBulletsText(clone.cardBullets.join('\n'));
    setIncludesText(clone.includes.join('\n'));
    setGalleryText((clone.galleryImages || []).join('\n'));
    setFeedback(null);
  }

  function handleImageUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editingProduct) return;
    if (file.size > 750 * 1024) {
      setFeedback({
        type: 'err',
        text: 'Image file is larger than 750KB. Please use a compressed SVG/PNG/WebP/JPG or paste an image URL.'
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setEditingProduct((prev) =>
          prev ? { ...prev, image: reader.result as string } : prev
        );
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleSaveProduct(e: FormEvent) {
    e.preventDefault();
    if (!editingProduct) return;
    setBusy(true);
    setFeedback(null);

    const parsedCardBullets = cardBulletsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const parsedIncludes = includesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const parsedGallery = galleryText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const payloadProduct: ManagedProduct = {
      ...editingProduct,
      cardBullets: parsedCardBullets,
      includes: parsedIncludes,
      galleryImages: parsedGallery
    };

    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert_product',
          originalKey,
          product: payloadProduct
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({ type: 'err', text: data.error || 'Failed to save product.' });
      } else {
        setProducts(data.products || []);
        setEditingProduct(null);
        setFeedback({
          type: 'ok',
          text: isCreatingNew
            ? `Created "${payloadProduct.name}"! It is now live across your Storefront, Product Page, Checkout, and Library.`
            : `Saved changes to "${payloadProduct.name}". Storefront and Checkout are updated immediately.`
        });
        router.refresh();
      }
    } catch {
      setFeedback({ type: 'err', text: 'Network error while saving product.' });
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteProduct(key: string, name: string) {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_product', key })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({ type: 'err', text: data.error || 'Could not delete product.' });
      } else {
        setProducts(data.products || []);
        setDeleteConfirmKey(null);
        if (editingProduct?.key === key) setEditingProduct(null);
        setFeedback({ type: 'ok', text: `Deleted "${name}" from catalog.` });
        router.refresh();
      }
    } catch {
      setFeedback({ type: 'err', text: 'Network error while deleting product.' });
    } finally {
      setBusy(false);
    }
  }

  async function handleQuickToggleStatus(prod: EnrichedManagedProduct) {
    const nextStatus = prod.status === 'active' ? 'draft' : 'active';
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert_product',
          originalKey: prod.key,
          product: { ...prod, status: nextStatus }
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.products) {
        setProducts(data.products);
        setFeedback({
          type: 'ok',
          text: `"${prod.name}" is now ${nextStatus === 'active' ? 'Active (visible on storefront)' : 'Draft (hidden from storefront)'}.`
        });
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleRestoreDefaults() {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore_defaults' })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.products) {
        setProducts(data.products);
        setFeedback({
          type: 'ok',
          text: 'Restored default Idea-to-Income Fieldguide ($5) and Launchpad Studio ($9) products.'
        });
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header & Actions */}
      <section className={styles.cohortSection}>
        <div className={styles.sectionTitle}>
          <div>
            <div className={styles.eyebrow}>STORE CATALOG &amp; DODO CHECKOUT MANAGER</div>
            <h2>Manage products, pricing, images, copy &amp; Dodo Product IDs</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setShowDodoGuide((prev) => !prev)}
              className={styles.trackedLinkBtn}
            >
              <HelpCircle size={14} /> {showDodoGuide ? 'Hide Dodo ID Guide' : 'Where to add Dodo Product ID?'}
            </button>
            <button
              type="button"
              onClick={handleRestoreDefaults}
              disabled={busy}
              className={styles.trackedLinkBtn}
              title="Reset built-in $5 Fieldguide & $9 Studio to defaults (keeps custom products)"
            >
              <RotateCcw size={14} /> Restore Default 2 Products
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className={styles.copyButton}
            >
              <Plus size={15} /> Add New Product
            </button>
          </div>
        </div>

        {feedback && (
          <div
            style={{
              padding: '12px 15px',
              borderRadius: '10px',
              marginBottom: '14px',
              fontSize: '13px',
              fontWeight: 600,
              background: feedback.type === 'ok' ? '#e7f3ea' : '#fce9e6',
              color: feedback.type === 'ok' ? '#234d32' : '#9b4239',
              border: `1px solid ${feedback.type === 'ok' ? '#cfe0c7' : '#f0cfc9'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px'
            }}
          >
            <span>{feedback.text}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'inherit' }}
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* Dodo Product ID Step-by-Step Guide Banner */}
        {showDodoGuide && (
          <div
            style={{
              background: '#f8faf6',
              border: '1px solid #cfe0c7',
              borderRadius: '12px',
              padding: '18px 20px',
              marginBottom: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#173b31', fontWeight: 700, fontSize: '14px' }}>
                <KeyRound size={17} />
                <span>How &amp; Where to Add Your Dodo Product ID When Adding or Editing a Product</span>
              </div>
              <span className={`${styles.badge} ${dodoEnvironment === 'live_mode' && hasDodoApiKey ? styles.active : styles.pending}`}>
                Gateway: {dodoEnvironment === 'live_mode' ? 'LIVE MODE' : 'TEST MODE'} · API Key: {hasDodoApiKey ? 'Connected' : 'Missing'}
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '12px',
                fontSize: '12.5px',
                lineHeight: 1.55,
                color: '#2c3a33'
              }}
            >
              <div style={{ background: '#fff', border: '1px solid #dce3d6', borderRadius: '10px', padding: '13px' }}>
                <strong style={{ display: 'block', color: '#173b31', marginBottom: '4px' }}>
                  Option 1: Paste Directly in This Admin Dashboard (Recommended)
                </strong>
                You <strong>do NOT need to touch any code or redeploy Vercel</strong> when adding a new product!
                <ol style={{ margin: '6px 0 0', paddingLeft: '18px' }}>
                  <li>Create your One-Time USD product in your <strong>Dodo Payments Dashboard</strong> (make sure the USD price in Dodo matches the price you set here).</li>
                  <li>Copy the Dodo Product ID (starts with <code>pdt_...</code>).</li>
                  <li>Click <strong>Edit</strong> or <strong>Add New Product</strong> below and paste <code>pdt_...</code> into the <strong>Dodo Product ID</strong> field.</li>
                </ol>
              </div>

              <div style={{ background: '#fff', border: '1px solid #dce3d6', borderRadius: '10px', padding: '13px' }}>
                <strong style={{ display: 'block', color: '#173b31', marginBottom: '4px' }}>
                  Option 2: Using Environment Variables (Optional Fallback)
                </strong>
                If you prefer storing IDs in Vercel Environment Variables (<code>.env</code>):
                <ul style={{ margin: '6px 0 0', paddingLeft: '18px' }}>
                  <li><code>DODO_FIELDGUIDE_PRODUCT_ID</code> — used automatically for the $5 Fieldguide if the Admin UI field is left blank.</li>
                  <li><code>DODO_STUDIO_PRODUCT_ID</code> — used automatically for the $9 Launchpad Studio if the Admin UI field is left blank.</li>
                  <li>For a 3rd product, you can either paste <code>pdt_...</code> directly in the UI <em>or</em> specify a custom env var name like <code>DODO_BUNDLE_PRODUCT_ID</code>.</li>
                </ul>
              </div>

              <div style={{ background: '#fff', border: '1px solid #dce3d6', borderRadius: '10px', padding: '13px' }}>
                <strong style={{ display: 'block', color: '#173b31', marginBottom: '4px' }}>
                  Important Price Matching Rule
                </strong>
                For security, our checkout server verifies that your Dodo product is a <strong>One-Time purchase</strong> and that the base USD price in Dodo matches the price set on the product card (for example, if you set <strong>$15</strong> here, set <strong>$15.00 USD</strong> in Dodo Payments).
              </div>

              <div style={{ background: '#fff', border: '1px solid #dce3d6', borderRadius: '10px', padding: '13px' }}>
                <strong style={{ display: 'block', color: '#173b31', marginBottom: '4px' }}>
                  Dodo Auto Currency Converter (Multi-Currency)
                </strong>
                Your storefront automatically detects each visitor’s country/currency (e.g., <code>INR ₹</code>, <code>EUR €</code>, <code>GBP £</code>, <code>CAD</code>, <code>AUD</code>), previews live converted prices via Dodo’s <code>checkoutSessions.preview</code> API, and passes <code>billing_currency</code> + <code>billing_address.country</code> into Dodo Checkout. To let Dodo charge in local currency at checkout, make sure <strong>Adaptive Currency / Pricing</strong> is toggled ON in your <strong>Dodo Dashboard → Settings → Business</strong>.
              </div>
            </div>
          </div>
        )}

        {/* Product Catalog Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '16px'
          }}
        >
          {products.map((prod) => {
            const isBuiltin = prod.key === 'fieldguide' || prod.key === 'studio';
            return (
              <article
                key={prod.key}
                style={{
                  background: '#fff',
                  border: '1px solid #e4e8e1',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 6px 22px rgba(32,60,41,0.05)'
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    aspectRatio: '16 / 10',
                    background: prod.coverTheme === 'dark' ? '#122921' : '#eef2ea',
                    borderBottom: '1px solid #e4e8e1',
                    overflow: 'hidden'
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={prod.image}
                    alt={prod.imageAlt}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      right: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '8px',
                      flexWrap: 'wrap'
                    }}
                  >
                    <span
                      style={{
                        background: prod.status === 'active' ? '#173b31' : '#68736d',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '4px 9px',
                        borderRadius: '999px',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase'
                      }}
                    >
                      {prod.status}
                    </span>
                    <span
                      style={{
                        background: 'rgba(255,255,255,0.94)',
                        color: '#173b31',
                        fontSize: '12px',
                        fontWeight: 800,
                        padding: '4px 10px',
                        borderRadius: '999px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
                      }}
                    >
                      {prod.compareAtPrice && prod.compareAtPrice > prod.price ? (
                        <s style={{ color: '#8a948d', marginRight: '5px', fontWeight: 500 }}>
                          ${prod.compareAtPrice}
                        </s>
                      ) : null}
                      ${prod.price} USD
                    </span>
                  </div>
                </div>

                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#68736d', letterSpacing: '0.06em' }}>
                      {prod.cardTag}
                    </span>
                    <code style={{ fontSize: '11px', background: '#f2f5ee', padding: '2px 6px', borderRadius: '5px', color: '#284739' }}>
                      /products/{prod.slug}
                    </code>
                  </div>

                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: '18px', color: '#173b31' }}>{prod.name}</h3>
                    <p style={{ margin: 0, fontSize: '12.5px', color: '#5c6861', lineHeight: 1.45 }}>
                      {prod.shortDescription || prod.description}
                    </p>
                  </div>

                  {/* Dodo Product ID Status Box */}
                  <div
                    style={{
                      background: prod.resolvedDodo.configured ? '#f4f8f2' : '#fff8eb',
                      border: `1px solid ${prod.resolvedDodo.configured ? '#cfe0c7' : '#f2d9a0'}`,
                      borderRadius: '9px',
                      padding: '9px 11px',
                      fontSize: '11.5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                      {prod.resolvedDodo.configured ? (
                        <CheckCircle2 size={14} style={{ color: '#285934', flexShrink: 0 }} />
                      ) : (
                        <AlertTriangle size={14} style={{ color: '#9a6700', flexShrink: 0 }} />
                      )}
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <strong>Dodo ID: </strong>
                        {prod.resolvedDodo.configured ? (
                          <span>
                            <code>{prod.resolvedDodo.maskedId}</code>{' '}
                            <span style={{ color: '#68736d' }}>
                              ({prod.resolvedDodo.source === 'admin_ui' ? 'Saved in Admin UI' : `via ${prod.resolvedDodo.envVarName}`})
                            </span>
                          </span>
                        ) : (
                          <span style={{ color: '#9a6700' }}>
                            Not set — click Edit to paste <code>pdt_...</code>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '11.5px', color: '#68736d', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    <span>• {prod.cardBullets.length} card bullets</span>
                    <span>• {prod.includes.length} deliverables</span>
                    <span>• {isBuiltin ? 'Built-in interactive app' : 'Hosted library delivery'}</span>
                  </div>

                  <div
                    style={{
                      marginTop: 'auto',
                      paddingTop: '12px',
                      borderTop: '1px solid #edf0eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      flexWrap: 'wrap'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => openEditModal(prod)}
                        className={styles.copyButton}
                        style={{ padding: '7px 12px', fontSize: '12px' }}
                      >
                        <Pencil size={13} /> Edit Product
                      </button>
                      <button
                        type="button"
                        onClick={() => openDuplicateModal(prod)}
                        className={styles.trackedLinkBtn}
                        title="Duplicate this product as a template"
                      >
                        <Copy size={13} /> Duplicate
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickToggleStatus(prod)}
                        disabled={busy}
                        className={styles.trackedLinkBtn}
                      >
                        {prod.status === 'active' ? 'Set Draft' : 'Publish'}
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <a
                        href={`/products/${prod.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.trackedLinkBtn}
                        title="View live product page"
                      >
                        <Eye size={13} /> View <ExternalLink size={11} />
                      </a>
                      {deleteConfirmKey === prod.key ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(prod.key, prod.name)}
                            disabled={busy}
                            className={styles.actionRevoke}
                          >
                            Confirm Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmKey(null)}
                            className={styles.trackedLinkBtn}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmKey(prod.key)}
                          className={styles.actionRevoke}
                          title="Delete product"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Full Product Add / Edit Drawer / Form */}
      {editingProduct && (
        <section
          style={{
            background: '#fff',
            border: '2px solid #173b31',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 14px 44px rgba(23,59,49,0.12)'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              paddingBottom: '16px',
              marginBottom: '20px',
              borderBottom: '1px solid #e4e8e1',
              flexWrap: 'wrap'
            }}
          >
            <div>
              <div className={styles.eyebrow}>
                {isCreatingNew ? 'CREATE NEW PRODUCT' : `EDITING PRODUCT · ${editingProduct.key.toUpperCase()}`}
              </div>
              <h2 style={{ margin: '4px 0 0', fontSize: '22px', color: '#173b31' }}>
                {isCreatingNew ? 'Add New Product to Storefront & Library' : `Edit ${editingProduct.name}`}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setEditingProduct(null)}
              className={styles.trackedLinkBtn}
            >
              <X size={15} /> Close Editor
            </button>
          </div>

          <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* 1. Basic Info & Status */}
            <div style={{ background: '#f8f9f5', border: '1px solid #e4e8e1', borderRadius: '12px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontWeight: 700, fontSize: '14px', color: '#173b31', marginBottom: '14px' }}>
                <Package size={16} /> 1. Product Title, URL Slug &amp; Visibility Status
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px', fontWeight: 600 }}>
                  <span>Product Title *</span>
                  <input
                    type="text"
                    required
                    value={editingProduct.name}
                    onChange={(e) => {
                      const nextName = e.target.value;
                      setEditingProduct((prev) => {
                        if (!prev) return prev;
                        const autoSlug =
                          isCreatingNew && (!prev.slug || prev.slug === prev.key)
                            ? nextName
                                .toLowerCase()
                                .replace(/[^a-z0-9]+/g, '-')
                                .replace(/^-|-$/g, '')
                            : prev.slug;
                        return {
                          ...prev,
                          name: nextName,
                          slug: autoSlug,
                          key: isCreatingNew ? autoSlug : prev.key
                        };
                      });
                    }}
                    placeholder="e.g. Creator Launch Template Pack"
                    className={styles.grantInput}
                    style={{ maxWidth: '100%' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px', fontWeight: 600 }}>
                  <span>URL Slug (/products/[slug]) *</span>
                  <input
                    type="text"
                    required
                    value={editingProduct.slug}
                    onChange={(e) =>
                      setEditingProduct((prev) =>
                        prev
                          ? {
                              ...prev,
                              slug: e.target.value.toLowerCase().replace(/[^a-z0-9-_]+/g, '-'),
                              key:
                                isCreatingNew && prev.key !== 'fieldguide' && prev.key !== 'studio'
                                  ? e.target.value.toLowerCase().replace(/[^a-z0-9-_]+/g, '-')
                                  : prev.key
                            }
                          : prev
                      )
                    }
                    placeholder="e.g. creator-launch-pack"
                    className={styles.grantInput}
                    style={{ maxWidth: '100%' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px', fontWeight: 600 }}>
                  <span>Visibility Status</span>
                  <select
                    value={editingProduct.status}
                    onChange={(e) =>
                      setEditingProduct((prev) =>
                        prev
                          ? { ...prev, status: e.target.value as ManagedProduct['status'] }
                          : prev
                      )
                    }
                    className={styles.grantSelect}
                  >
                    <option value="active">Active (Live on Storefront &amp; Library)</option>
                    <option value="draft">Draft (Hidden from Storefront)</option>
                    <option value="archived">Archived (Disabled)</option>
                  </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px', fontWeight: 600 }}>
                  <span>Display Order (1 = First)</span>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={editingProduct.sortOrder}
                    onChange={(e) =>
                      setEditingProduct((prev) =>
                        prev ? { ...prev, sortOrder: Number(e.target.value) || 1 } : prev
                      )
                    }
                    className={styles.grantInput}
                    style={{ maxWidth: '100%' }}
                  />
                </label>
              </div>
            </div>

            {/* 2. Pricing & Dodo Payments Integration */}
            <div style={{ background: '#f4f8f2', border: '1px solid #cfe0c7', borderRadius: '12px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontWeight: 700, fontSize: '14px', color: '#173b31', marginBottom: '6px' }}>
                <DollarSign size={16} /> 2. Pricing &amp; Dodo Payments Product ID
              </div>
              <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#4a5851' }}>
                Paste your Dodo Product ID (<code>pdt_...</code>) right below so checkout works immediately without editing code or redeploying.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px', fontWeight: 600 }}>
                  <span>Price (USD $) *</span>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    required
                    value={editingProduct.price}
                    onChange={(e) => {
                      const nextPrice = Number(e.target.value);
                      setEditingProduct((prev) =>
                        prev
                          ? {
                              ...prev,
                              price: nextPrice,
                              ctaLabel: `Get ${prev.name || 'Access'} · $${nextPrice}`
                            }
                          : prev
                      );
                    }}
                    className={styles.grantInput}
                    style={{ maxWidth: '100%' }}
                  />
                  <small style={{ fontSize: '11px', color: '#5c6861', fontWeight: 400 }}>
                    Must match your Dodo product price ({Math.round((editingProduct.price || 0) * 100)} cents).
                  </small>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px', fontWeight: 600 }}>
                  <span>Compare-At / Strikethrough Price ($ Optional)</span>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={editingProduct.compareAtPrice ?? ''}
                    onChange={(e) =>
                      setEditingProduct((prev) =>
                        prev
                          ? {
                              ...prev,
                              compareAtPrice: e.target.value ? Number(e.target.value) : null
                            }
                          : prev
                      )
                    }
                    placeholder="e.g. 29 (optional)"
                    className={styles.grantInput}
                    style={{ maxWidth: '100%' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px', fontWeight: 600 }}>
                  <span>Dodo Product ID (Direct — Recommended)</span>
                  <input
                    type="text"
                    value={editingProduct.dodoProductId}
                    onChange={(e) =>
                      setEditingProduct((prev) =>
                        prev ? { ...prev, dodoProductId: e.target.value.trim() } : prev
                      )
                    }
                    placeholder="pdt_0N..."
                    className={styles.grantInput}
                    style={{ maxWidth: '100%', background: '#fff' }}
                  />
                  <small style={{ fontSize: '11px', color: '#285934', fontWeight: 400 }}>
                    Paste <code>pdt_...</code> from Dodo Dashboard → Products. Overrides <code>.env</code> if filled.
                  </small>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px', fontWeight: 600 }}>
                  <span>Fallback .env Variable Name (Optional)</span>
                  <input
                    type="text"
                    value={editingProduct.dodoEnvVar}
                    onChange={(e) =>
                      setEditingProduct((prev) =>
                        prev ? { ...prev, dodoEnvVar: e.target.value.trim() } : prev
                      )
                    }
                    placeholder="e.g. DODO_FIELDGUIDE_PRODUCT_ID"
                    className={styles.grantInput}
                    style={{ maxWidth: '100%', background: '#fff' }}
                  />
                  <small style={{ fontSize: '11px', color: '#5c6861', fontWeight: 400 }}>
                    Used if Dodo Product ID box to the left is left empty.
                  </small>
                </label>
              </div>
            </div>

            {/* 3. Images & Visual Theme */}
            <div style={{ background: '#f8f9f5', border: '1px solid #e4e8e1', borderRadius: '12px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontWeight: 700, fontSize: '14px', color: '#173b31' }}>
                  <ImageIcon size={16} /> 3. Product Cover Image, Upload &amp; Gallery
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: '#68736d', fontWeight: 600 }}>Quick Presets:</span>
                  {PRESET_COVERS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() =>
                        setEditingProduct((prev) =>
                          prev
                            ? {
                                ...prev,
                                image: preset.url,
                                ogImage: preset.ogUrl,
                                coverTheme: preset.theme
                              }
                            : prev
                        )
                      }
                      className={styles.trackedLinkBtn}
                      style={{ fontSize: '11px', padding: '4px 8px' }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '220px minmax(0, 1fr)', gap: '16px', alignItems: 'start' }}>
                <div
                  style={{
                    borderRadius: '10px',
                    overflow: 'hidden',
                    border: '1px solid #d5ddd2',
                    background: editingProduct.coverTheme === 'dark' ? '#122921' : '#eef2ea'
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={editingProduct.image || '/images/idea-to-income-fieldguide-cover.svg'}
                    alt="Cover preview"
                    style={{ width: '100%', aspectRatio: '16/11', objectFit: 'cover', display: 'block' }}
                  />
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px',
                      background: '#173b31',
                      color: '#fff',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <Upload size={13} /> Upload Image File
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px', fontWeight: 600 }}>
                    <span>Primary Cover Image URL (or Data URL) *</span>
                    <input
                      type="text"
                      required
                      value={editingProduct.image}
                      onChange={(e) =>
                        setEditingProduct((prev) =>
                          prev ? { ...prev, image: e.target.value } : prev
                        )
                      }
                      placeholder="/images/idea-to-income-fieldguide-cover.svg or https://..."
                      className={styles.grantInput}
                      style={{ maxWidth: '100%' }}
                    />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px', fontWeight: 600 }}>
                    <span>Social Share (OpenGraph) Image URL</span>
                    <input
                      type="text"
                      value={editingProduct.ogImage}
                      onChange={(e) =>
                        setEditingProduct((prev) =>
                          prev ? { ...prev, ogImage: e.target.value } : prev
                        )
                      }
                      placeholder="/images/idea-to-income-fieldguide-og.png"
                      className={styles.grantInput}
                      style={{ maxWidth: '100%' }}
                    />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px', fontWeight: 600 }}>
                    <span>Cover Card Background Theme</span>
                    <select
                      value={editingProduct.coverTheme}
                      onChange={(e) =>
                        setEditingProduct((prev) =>
                          prev
                            ? { ...prev, coverTheme: e.target.value as 'light' | 'dark' }
                            : prev
                        )
                      }
                      className={styles.grantSelect}
                    >
                      <option value="light">Light Editorial Frame</option>
                      <option value="dark">Dark Forest Showcase Frame</option>
                    </select>
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px', fontWeight: 600 }}>
                    <span>Cover Caption Label</span>
                    <input
                      type="text"
                      value={editingProduct.imageLabel}
                      onChange={(e) =>
                        setEditingProduct((prev) =>
                          prev ? { ...prev, imageLabel: e.target.value } : prev
                        )
                      }
                      placeholder="EDITION 01 · FIELDGUIDE COVER"
                      className={styles.grantInput}
                      style={{ maxWidth: '100%' }}
                    />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px', fontWeight: 600, gridColumn: '1 / -1' }}>
                    <span>Additional Gallery Preview Image URLs (one URL per line, optional)</span>
                    <textarea
                      rows={2}
                      value={galleryText}
                      onChange={(e) => setGalleryText(e.target.value)}
                      placeholder="/images/studio-step-1-validate.svg&#10;/images/studio-step-2-prompts.svg"
                      className={styles.grantInput}
                      style={{ maxWidth: '100%', fontFamily: 'inherit' }}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* 4. Headlines, Descriptions & Badges */}
            <div style={{ background: '#f8f9f5', border: '1px solid #e4e8e1', borderRadius: '12px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontWeight: 700, fontSize: '14px', color: '#173b31', marginBottom: '14px' }}>
                <FileText size={16} /> 4. Storefront Copy, Headlines &amp; Badges
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px', fontWeight: 600 }}>
                  <span>Card Number Tag</span>
                  <input
                    type="text"
                    value={editingProduct.cardTag}
                    onChange={(e) =>
                      setEditingProduct((prev) =>
                        prev ? { ...prev, cardTag: e.target.value } : prev
                      )
                    }
                    placeholder="01 / THE FOUNDATION"
                    className={styles.grantInput}
                    style={{ maxWidth: '100%' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px', fontWeight: 600 }}>
                  <span>Cover Badge Pill Text</span>
                  <input
                    type="text"
                    value={editingProduct.badge}
                    onChange={(e) =>
                      setEditingProduct((prev) =>
                        prev ? { ...prev, badge: e.target.value } : prev
                      )
                    }
                    placeholder="$5 · START HERE"
                    className={styles.grantInput}
                    style={{ maxWidth: '100%' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px', fontWeight: 600 }}>
                  <span>Badge Style</span>
                  <select
                    value={editingProduct.badgeTheme}
                    onChange={(e) =>
                      setEditingProduct((prev) =>
                        prev
                          ? {
                              ...prev,
                              badgeTheme: e.target.value as ManagedProduct['badgeTheme']
                            }
                          : prev
                      )
                    }
                    className={styles.grantSelect}
                  >
                    <option value="default">Default Light Badge</option>
                    <option value="green">Forest Green Badge</option>
                    <option value="amber">Amber Highlight Badge</option>
                  </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px', fontWeight: 600 }}>
                  <span>Checkout Button CTA Label</span>
                  <input
                    type="text"
                    value={editingProduct.ctaLabel}
                    onChange={(e) =>
                      setEditingProduct((prev) =>
                        prev ? { ...prev, ctaLabel: e.target.value } : prev
                      )
                    }
                    placeholder={`Get ${editingProduct.name || 'Access'} · $${editingProduct.price}`}
                    className={styles.grantInput}
                    style={{ maxWidth: '100%' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px', fontWeight: 600 }}>
                  <span>Detail Page Eyebrow</span>
                  <input
                    type="text"
                    value={editingProduct.eyebrow}
                    onChange={(e) =>
                      setEditingProduct((prev) =>
                        prev ? { ...prev, eyebrow: e.target.value } : prev
                      )
                    }
                    placeholder="THE FIRST STEP"
                    className={styles.grantInput}
                    style={{ maxWidth: '100%' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px', fontWeight: 600 }}>
                  <span>Format Sub-note (under Buy button)</span>
                  <input
                    type="text"
                    value={editingProduct.formatNote}
                    onChange={(e) =>
                      setEditingProduct((prev) =>
                        prev ? { ...prev, formatNote: e.target.value } : prev
                      )
                    }
                    placeholder="Instant access · Login required · Taxes shown at checkout"
                    className={styles.grantInput}
                    style={{ maxWidth: '100%' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px', fontWeight: 600, gridColumn: '1 / -1' }}>
                  <span>Product Page Italic Headline *</span>
                  <input
                    type="text"
                    required
                    value={editingProduct.headline}
                    onChange={(e) =>
                      setEditingProduct((prev) =>
                        prev ? { ...prev, headline: e.target.value } : prev
                      )
                    }
                    placeholder="Turn one useful problem into a clear first launch."
                    className={styles.grantInput}
                    style={{ maxWidth: '100%' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px', fontWeight: 600, gridColumn: '1 / -1' }}>
                  <span>Storefront &amp; Library Card Summary (Short Description) *</span>
                  <textarea
                    rows={2}
                    required
                    value={editingProduct.shortDescription}
                    onChange={(e) =>
                      setEditingProduct((prev) =>
                        prev ? { ...prev, shortDescription: e.target.value } : prev
                      )
                    }
                    className={styles.grantInput}
                    style={{ maxWidth: '100%', fontFamily: 'inherit' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px', fontWeight: 600, gridColumn: '1 / -1' }}>
                  <span>Full Product Detail Page Description *</span>
                  <textarea
                    rows={3}
                    required
                    value={editingProduct.description}
                    onChange={(e) =>
                      setEditingProduct((prev) =>
                        prev ? { ...prev, description: e.target.value } : prev
                      )
                    }
                    className={styles.grantInput}
                    style={{ maxWidth: '100%', fontFamily: 'inherit' }}
                  />
                </label>
              </div>
            </div>

            {/* 5. Bullets, Deliverables & 3-Step Breakdown */}
            <div style={{ background: '#f8f9f5', border: '1px solid #e4e8e1', borderRadius: '12px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontWeight: 700, fontSize: '14px', color: '#173b31', marginBottom: '14px' }}>
                <Layers size={16} /> 5. Included Features, Bullets &amp; 3-Step Breakdown
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px', fontWeight: 600 }}>
                  <span>Storefront Card Bullets (one bullet per line)</span>
                  <textarea
                    rows={4}
                    value={cardBulletsText}
                    onChange={(e) => setCardBulletsText(e.target.value)}
                    className={styles.grantInput}
                    style={{ maxWidth: '100%', fontFamily: 'inherit' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px', fontWeight: 600 }}>
                  <span>Product Detail &ldquo;What You Get&rdquo; List (one item per line)</span>
                  <textarea
                    rows={4}
                    value={includesText}
                    onChange={(e) => setIncludesText(e.target.value)}
                    className={styles.grantInput}
                    style={{ maxWidth: '100%', fontFamily: 'inherit' }}
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                {editingProduct.sections.slice(0, 3).map((sec, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#fff',
                      border: '1px solid #dce3d6',
                      borderRadius: '10px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#173b31' }}>
                      STEP 0{idx + 1} CARD
                    </span>
                    <input
                      type="text"
                      value={sec.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditingProduct((prev) => {
                          if (!prev) return prev;
                          const nextSecs = [...prev.sections];
                          nextSecs[idx] = { ...nextSecs[idx], title: val };
                          return { ...prev, sections: nextSecs };
                        });
                      }}
                      placeholder={`Step ${idx + 1} title`}
                      className={styles.grantInput}
                      style={{ maxWidth: '100%' }}
                    />
                    <textarea
                      rows={3}
                      value={sec.body}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditingProduct((prev) => {
                          if (!prev) return prev;
                          const nextSecs = [...prev.sections];
                          nextSecs[idx] = { ...nextSecs[idx], body: val };
                          return { ...prev, sections: nextSecs };
                        });
                      }}
                      placeholder={`Step ${idx + 1} description`}
                      className={styles.grantInput}
                      style={{ maxWidth: '100%', fontFamily: 'inherit' }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px', fontWeight: 600 }}>
                  <span>Access Summary Note</span>
                  <input
                    type="text"
                    value={editingProduct.access}
                    onChange={(e) =>
                      setEditingProduct((prev) =>
                        prev ? { ...prev, access: e.target.value } : prev
                      )
                    }
                    className={styles.grantInput}
                    style={{ maxWidth: '100%' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px', fontWeight: 600 }}>
                  <span>Honest Expectations / Limitation Note</span>
                  <input
                    type="text"
                    value={editingProduct.limitation}
                    onChange={(e) =>
                      setEditingProduct((prev) =>
                        prev ? { ...prev, limitation: e.target.value } : prev
                      )
                    }
                    className={styles.grantInput}
                    style={{ maxWidth: '100%' }}
                  />
                </label>
              </div>
            </div>

            {/* 6. Buyer Delivery & Library Access */}
            <div style={{ background: '#f8f9f5', border: '1px solid #e4e8e1', borderRadius: '12px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontWeight: 700, fontSize: '14px', color: '#173b31', marginBottom: '6px' }}>
                <KeyRound size={16} /> 6. Buyer Delivery &amp; Post-Purchase Library Access
              </div>
              <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#5c6861' }}>
                {editingProduct.key === 'fieldguide'
                  ? 'This product unlocks the interactive 7-page Fieldguide Reader (/fieldguide) in the customer library.'
                  : editingProduct.key === 'studio'
                    ? 'This product unlocks the interactive 5-stage Launchpad Studio Workspace (/studio) in the customer library.'
                    : 'When a customer buys this product, they unlock its dedicated Buyer Access page (/products/' +
                      (editingProduct.slug || 'slug') +
                      '/access) in their personal library with the link and content below.'}
              </p>

              {editingProduct.key !== 'fieldguide' && editingProduct.key !== 'studio' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px', fontWeight: 600 }}>
                    <span>External Resource / Download / Notion / Drive Link for Buyers (Optional)</span>
                    <input
                      type="url"
                      value={editingProduct.externalAccessUrl || ''}
                      onChange={(e) =>
                        setEditingProduct((prev) =>
                          prev ? { ...prev, externalAccessUrl: e.target.value } : prev
                        )
                      }
                      placeholder="https://... (e.g. Notion template, Google Drive folder, Figma, or file download link)"
                      className={styles.grantInput}
                      style={{ maxWidth: '100%' }}
                    />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px', fontWeight: 600 }}>
                    <span>Hosted Buyer Reader Content / Instructions (Shown inside /products/{editingProduct.slug || 'slug'}/access)</span>
                    <textarea
                      rows={5}
                      value={editingProduct.hostedContent || ''}
                      onChange={(e) =>
                        setEditingProduct((prev) =>
                          prev ? { ...prev, hostedContent: e.target.value } : prev
                        )
                      }
                      placeholder="Write your full guide, prompts, instructions, or access notes here for verified buyers..."
                      className={styles.grantInput}
                      style={{ maxWidth: '100%', fontFamily: 'inherit' }}
                    />
                  </label>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className={styles.trackedLinkBtn}
                style={{ padding: '10px 16px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className={styles.copyButton}
                style={{ padding: '10px 20px', fontSize: '13px' }}
              >
                <Save size={15} />
                {busy
                  ? 'Saving Product…'
                  : isCreatingNew
                    ? 'Create & Publish Product'
                    : 'Save Product Changes'}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
