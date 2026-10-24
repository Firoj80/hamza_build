'use client';
import { useState } from 'react';
import { CheckCircle2, Loader2, ShieldCheck, Star } from 'lucide-react';
import { friendlyNameFromEmail, type ProductReview } from '@/lib/email-campaigns';
import { LocalizedCtaText } from '@/app/currency-context';

export default function ReviewForm({
  initialEmail,
  initialProduct,
  initialRating,
  initialReviews
}: {
  initialEmail: string;
  initialProduct: 'fieldguide' | 'studio' | 'both';
  initialRating: number;
  initialReviews: ProductReview[];
}) {
  const [email, setEmail] = useState(initialEmail);
  const [name, setName] = useState(initialEmail ? friendlyNameFromEmail(initialEmail) : '');
  const [productKey, setProductKey] = useState<'fieldguide' | 'studio' | 'both'>(initialProduct);
  const [rating, setRating] = useState<number>(initialRating || 5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [headline, setHeadline] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedReview, setSubmittedReview] = useState<ProductReview | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ProductReview[]>(initialReviews);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          productKey,
          rating,
          headline,
          comment
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.error || 'Could not submit your review. Please try again.');
      } else if (data.review) {
        setSubmittedReview(data.review);
        setReviews((prev) => [data.review, ...prev]);
      }
    } catch {
      setErrorMsg('Network error while saving your review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : '5.0';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '28px', alignItems: 'start' }}>
      <section className="order-box" style={{ background: '#fff', border: '1.5px solid #141311', borderRadius: '10px', padding: '28px', marginTop: 0 }}>
        <div className="eyebrow" style={{ marginBottom: '8px' }}><span /> SHARE YOUR EXPERIENCE</div>
        <h1 style={{ fontSize: 'clamp(24px, 2.8vw, 32px)', margin: '0 0 10px', letterSpacing: '-0.03em' }}>
          Rate your tool &amp; leave a review
        </h1>
        <p style={{ margin: '0 0 22px', color: '#5c6861', fontSize: '14.5px', lineHeight: 1.6 }}>
          <LocalizedCtaText
            label="Your honest feedback helps improve the Idea-to-Income Fieldguide ($5, was $9), Launchpad Studio ($9, was $19), and Complete Creator Bundle ($12, was $25)."
            usdPrice={12}
            productKey="bundle"
          />
        </p>

        {submittedReview ? (
          <div style={{ background: '#f2f7ef', border: '1px solid #c5d9bd', borderRadius: '12px', padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#215232', fontWeight: 700, fontSize: '15px', marginBottom: '8px' }}>
              <CheckCircle2 size={20} /> Thank you for sharing your review, {submittedReview.name}!
            </div>
            <p style={{ margin: '0 0 12px', fontSize: '14px', color: '#394a40', lineHeight: 1.5 }}>
              Your {submittedReview.rating}-star rating and feedback have been recorded and added to the community wall.
            </p>
            <button
              type="button"
              className="button outline"
              onClick={() => {
                setSubmittedReview(null);
                setHeadline('');
                setComment('');
              }}
            >
              Submit another note
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#46534d', marginBottom: '8px' }}>
                1. Your overall rating
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = (hoverRating || rating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      aria-label={`Rate ${star} out of 5 stars`}
                      style={{
                        background: active ? '#173b31' : '#f4f6f1',
                        color: active ? '#f5d962' : '#9aa69e',
                        border: '1px solid #d5ddd2',
                        borderRadius: '10px',
                        width: '44px',
                        height: '44px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'transform 0.12s, background 0.12s'
                      }}
                    >
                      <Star size={20} fill={active ? '#f5d962' : 'none'} />
                    </button>
                  );
                })}
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#173b31', marginLeft: '6px' }}>
                  {rating} / 5 stars
                </span>
              </div>
            </div>

            <div>
              <label htmlFor="review-product" style={{ display: 'block', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#46534d', marginBottom: '6px' }}>
                2. Which product are you reviewing?
              </label>
              <select
                id="review-product"
                value={productKey}
                onChange={(e) => setProductKey(e.target.value as 'fieldguide' | 'studio' | 'both')}
                style={{ width: '100%', padding: '11px 13px', borderRadius: '9px', border: '1px solid #cfd8cc', background: '#fafbf8', fontSize: '14px', color: '#1d2925' }}
              >
                <option value="fieldguide">Idea-to-Income Fieldguide PDF ($5, was $9)</option>
                <option value="studio">Launchpad Studio HTML App ($9, was $19)</option>
                <option value="both">Complete Creator Launch Bundle ($12, was $25)</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div>
                <label htmlFor="review-name" style={{ display: 'block', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#46534d', marginBottom: '6px' }}>
                  Your display name
                </label>
                <input
                  id="review-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex M."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '9px', border: '1px solid #cfd8cc', background: '#fafbf8', fontSize: '14px', color: '#1d2925' }}
                />
              </div>
              <div>
                <label htmlFor="review-email" style={{ display: 'block', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#46534d', marginBottom: '6px' }}>
                  Checkout email (verifies purchase)
                </label>
                <input
                  id="review-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '9px', border: '1px solid #cfd8cc', background: '#fafbf8', fontSize: '14px', color: '#1d2925' }}
                />
              </div>
            </div>

            <div>
              <label htmlFor="review-headline" style={{ display: 'block', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#46534d', marginBottom: '6px' }}>
                3. Short headline
              </label>
              <input
                id="review-headline"
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Helped me narrow down my first product in one evening"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '9px', border: '1px solid #cfd8cc', background: '#fafbf8', fontSize: '14px', color: '#1d2925' }}
              />
            </div>

            <div>
              <label htmlFor="review-comment" style={{ display: 'block', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#46534d', marginBottom: '6px' }}>
                4. Your honest review
              </label>
              <textarea
                id="review-comment"
                required
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What part of the Fieldguide or Launchpad Studio helped you most?"
                style={{ width: '100%', padding: '11px 12px', borderRadius: '9px', border: '1px solid #cfd8cc', background: '#fafbf8', fontSize: '14px', color: '#1d2925', fontFamily: 'inherit', resize: 'vertical' }}
              />
            </div>

            {errorMsg && (
              <p style={{ margin: 0, padding: '10px 12px', background: '#fce9e6', color: '#9b4239', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
                {errorMsg}
              </p>
            )}

            <button type="submit" disabled={submitting} className="button dark" style={{ width: '100%', justifyContent: 'center' }}>
              {submitting ? <Loader2 size={16} className="spin" /> : <Star size={16} />}
              <span>{submitting ? 'Submitting your review...' : 'Submit rating & review'}</span>
            </button>
          </form>
        )}
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ background: '#173b31', color: '#f6f5e9', borderRadius: '12px', padding: '22px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', border: '1.5px solid #141311' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', color: '#dae5a3', textTransform: 'uppercase' }}>
              VERIFIED CREATOR FEEDBACK
            </div>
            <div style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.03em', marginTop: '4px' }}>
              {avgRating} / 5.0 average
            </div>
            <div style={{ fontSize: '13px', color: '#c8d6c7', marginTop: '2px' }}>
              Based on {reviews.length} customer review{reviews.length === 1 ? '' : 's'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '4px', color: '#f5d962' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} size={20} fill="#f5d962" />
            ))}
          </div>
        </div>

        {reviews.map((rev) => (
          <article key={rev.id} className="review-card">
            <div className="review-card-top">
              <div className="review-stars">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star key={idx} size={15} fill={idx < rev.rating ? '#d49b00' : 'none'} />
                ))}
              </div>
              {rev.verifiedBuyer && (
                <span className="review-verified-badge">
                  <ShieldCheck size={12} style={{ verticalAlign: 'text-bottom', marginRight: '3px' }} />
                  Verified Buyer
                </span>
              )}
            </div>
            <h3 className="review-headline">
              <LocalizedCtaText
                label={rev.headline}
                usdPrice={rev.productKey === 'both' ? 12 : rev.productKey === 'studio' ? 9 : 5}
                productKey={rev.productKey === 'both' ? 'bundle' : rev.productKey}
              />
            </h3>
            <p className="review-comment">
              <LocalizedCtaText
                label={rev.comment}
                usdPrice={rev.productKey === 'both' ? 12 : rev.productKey === 'studio' ? 9 : 5}
                productKey={rev.productKey === 'both' ? 'bundle' : rev.productKey}
              />
            </p>
            <div className="review-author-footer" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span>
                <strong>{rev.name}</strong> ·{' '}
                <LocalizedCtaText
                  label={rev.role}
                  usdPrice={rev.productKey === 'both' ? 12 : rev.productKey === 'studio' ? 9 : 5}
                  productKey={rev.productKey === 'both' ? 'bundle' : rev.productKey}
                />
              </span>
              <span>{new Date(rev.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
