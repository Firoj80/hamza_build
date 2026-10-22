import SiteHeader from '../site-header';
import SiteFooter from '../site-footer';
import ReviewForm from './review-form';
import { currentUser } from '@/lib/supabase/server';
import { loadEmailStudioState } from '@/lib/email-reviews-store';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Rate & Review — Hamza Idrishi Launch Store',
  description: 'Share your rating and review for the Idea-to-Income Fieldguide ($5) and Launchpad Studio ($9).'
};

export default async function ReviewPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await currentUser().catch(() => null);
  const params = searchParams ? await searchParams : {};
  const state = await loadEmailStudioState();

  const queryEmail = typeof params?.email === 'string' ? params.email.trim() : '';
  const initialEmail = queryEmail || user?.email || '';

  const rawProd = typeof params?.product === 'string' ? params.product : '';
  const initialProduct: 'fieldguide' | 'studio' | 'both' =
    rawProd === 'studio' || rawProd === 'both' ? rawProd : 'fieldguide';

  const rawRating = Number(params?.rating);
  const initialRating = Number.isFinite(rawRating) && rawRating >= 1 && rawRating <= 5 ? Math.round(rawRating) : 5;

  const publishedReviews = state.reviews.filter((r) => r.published);

  return (
    <div className="page-shell">
      <SiteHeader backHref="/" backLabel="Back to store" />
      <main className="wrap section-space" id="main">
        <ReviewForm
          initialEmail={initialEmail}
          initialProduct={initialProduct}
          initialRating={initialRating}
          initialReviews={publishedReviews}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
