import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { currentUser, authClient } from '@/lib/supabase/server';
import { ownedProducts } from '@/lib/access';
import { hasGuestProductAccess } from '@/lib/delivery-token';
import { isSalesAdmin } from '@/lib/platform-policy.mjs';
import { cleanWorkspace } from '@/lib/platform-policy.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function buildStandaloneStudioHtml(rawHtml: string, initialState: unknown): string {
  const safeInitial = JSON.stringify(initialState).replace(/</g, '\\u003c');
  const offlineRuntimeScript = `<script>
const PLATFORM_INITIAL_STATE = (function(){
  const serverSeed = ${safeInitial};
  try {
    const saved = window.localStorage.getItem('launchpad_studio_offline_v3');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') return Object.assign({}, serverSeed, parsed);
    }
  } catch (e) {}
  return serverSeed;
})();
window.__STUDIO_OFFLINE_SAVE__ = function(state, tell) {
  try {
    window.localStorage.setItem('launchpad_studio_offline_v3', JSON.stringify(state));
    if (tell) tell('✓ Saved locally in your browser (works 100% offline anytime).');
  } catch (e) {
    if (tell) tell('Could not write to local browser storage.');
  }
};
window.__STUDIO_OFFLINE_INIT__ = function(api) {
  const badge = document.getElementById('mode-badge');
  if (badge) badge.textContent = 'STANDALONE HTML APP · WORKS OFFLINE ANYTIME';
  const footerNote = document.getElementById('footer-persistence-note');
  if (footerNote) footerNote.innerHTML = 'Standalone Offline HTML Edition · Auto-saves in your browser<br>Keep this .html file on your device to use anytime.';

  function triggerDownload(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const topBar = document.getElementById('top-actions-bar');
  if (topBar) {
    const dlMdBtn = document.createElement('button');
    dlMdBtn.type = 'button';
    dlMdBtn.className = 'secondary';
    dlMdBtn.textContent = '↓ Download .MD Plan';
    dlMdBtn.onclick = function() {
      triggerDownload('Launchpad-Plan.md', api.buildPlanText(), 'text/markdown;charset=utf-8');
      api.tell('Downloaded Launchpad-Plan.md to your device.');
    };

    const dlJsonBtn = document.createElement('button');
    dlJsonBtn.type = 'button';
    dlJsonBtn.className = 'secondary';
    dlJsonBtn.textContent = '↓ Backup .JSON';
    dlJsonBtn.onclick = function() {
      triggerDownload('Launchpad-Backup.json', JSON.stringify(api.getState(), null, 2), 'application/json;charset=utf-8');
      api.tell('Downloaded Launchpad-Backup.json project file.');
    };

    const importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.accept = '.json,application/json';
    importInput.style.display = 'none';
    importInput.onchange = function(ev) {
      const file = ev.target && ev.target.files && ev.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function() {
        try {
          const parsed = JSON.parse(String(reader.result || '{}'));
          if (parsed && typeof parsed === 'object') {
            api.setState(parsed);
            window.localStorage.setItem('launchpad_studio_offline_v3', JSON.stringify(api.getState()));
            api.tell('✓ Restored workspace from backup file.');
          }
        } catch (err) {
          api.tell('Invalid JSON backup file.');
        }
      };
      reader.readAsText(file);
    };

    const importBtn = document.createElement('button');
    importBtn.type = 'button';
    importBtn.className = 'secondary';
    importBtn.textContent = '↑ Load .JSON';
    importBtn.onclick = function() { importInput.click(); };

    topBar.append(dlMdBtn, dlJsonBtn, importBtn, importInput);
  }

  const bottomBar = document.getElementById('bottom-export-actions');
  if (bottomBar) {
    const dlMdBottom = document.createElement('button');
    dlMdBottom.type = 'button';
    dlMdBottom.className = 'secondary';
    dlMdBottom.textContent = '↓ Download Launch Plan (.md)';
    dlMdBottom.onclick = function() {
      triggerDownload('Launchpad-Plan.md', api.buildPlanText(), 'text/markdown;charset=utf-8');
      api.tell('Downloaded Launchpad-Plan.md to your device.');
    };
    bottomBar.append(dlMdBottom);
  }
};`;

  return rawHtml.replace('<script>', offlineRuntimeScript);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawProduct = (searchParams.get('product') || 'fieldguide').trim().toLowerCase();
  const productKey =
    rawProduct === 'studio' || rawProduct === 'launchpad-studio'
      ? 'studio'
      : 'fieldguide';
  const tokenParam = searchParams.get('token');
  const inlineMode = searchParams.get('inline') === '1';

  const [user, cookieStore] = await Promise.all([
    currentUser().catch(() => null),
    cookies()
  ]);

  // 1. Check signed guest delivery token (URL param or cookie)
  const guestAccess = hasGuestProductAccess(productKey, {
    tokenParam,
    cookieStore
  });

  let authorized = guestAccess.allowed;

  // 2. Or check signed-in account ownership / admin
  if (!authorized && user) {
    const isAdmin = Boolean(
      user.email && isSalesAdmin(user.email, process.env.SALES_DASHBOARD_ADMIN_EMAIL)
    );
    if (isAdmin) {
      authorized = true;
    } else {
      const { products } = await ownedProducts(user);
      authorized = products.includes(productKey);
    }
  }

  if (!authorized) {
    return NextResponse.json(
      { error: 'Purchase required to download this file.' },
      { status: 403 }
    );
  }

  if (productKey === 'fieldguide') {
    const pdfBytes = await readFile(
      path.join(process.cwd(), 'private/first-product-fieldguide.pdf')
    );
    const disposition = inlineMode
      ? 'inline; filename="Idea-to-Income-Fieldguide.pdf"'
      : 'attachment; filename="Idea-to-Income-Fieldguide.pdf"';

    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': disposition,
        'Cache-Control': 'private, no-store'
      }
    });
  }

  // Deliver Launchpad Studio standalone offline-ready HTML file
  let initialState: unknown = {};
  if (user) {
    try {
      const db = await authClient();
      const { data: workspace } = await db
        .from('platform_workspace')
        .select('state')
        .eq('user_id', user.id)
        .maybeSingle();
      if (workspace?.state) {
        initialState = cleanWorkspace(workspace.state);
      }
    } catch {
      initialState = {};
    }
  }

  const rawHtml = await readFile(
    path.join(process.cwd(), 'private/Launchpad_Platform.html'),
    'utf8'
  );
  const standaloneHtml = buildStandaloneStudioHtml(rawHtml, initialState);

  return new NextResponse(standaloneHtml, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': 'attachment; filename="Launchpad-Studio.html"',
      'Cache-Control': 'private, no-store'
    }
  });
}
