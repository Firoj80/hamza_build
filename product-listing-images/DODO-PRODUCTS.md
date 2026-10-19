# Dodo product setup

Create two separate fixed-price, one-time USD products. Use the same mode for products, API key and webhook (test mode first).

| Name | Price | Image | Environment variable |
| --- | --- | --- | --- |
| First Product Fieldguide | $5 | first-product-fieldguide.png | DODO_FIELDGUIDE_PRODUCT_ID |
| Launchpad Studio | $19 | launchpad-studio-dodo.jpg | DODO_STUDIO_PRODUCT_ID |

## First Product Fieldguide

A 7-page guide to validate your product idea, research customer needs and plan your first launch. Includes worksheets, AI prompts and a launch checklist. One-time purchase with account access. Studio sold separately.

The image is a concept cover mockup. This is account access to a digital guide, not a physical book.

## Launchpad Studio

An online workspace to validate ideas, prepare AI prompts, edit 30 post starters and plan your launch. Includes listing drafts, a scenario calculator and cloud-saved progress. One-time purchase. No built-in AI or app downloads.

The image is an actual screenshot of the current Studio interface, showing example content.

## Access delivery

Do not attach PDF, ZIP or HTML downloads. The platform grants account access after verifying payment. Keep pay-what-you-want disabled and use the fixed prices above. Copy each product ID into its environment variable in `launch-store/.env.local`; never put API secrets in chat. Configure the webhook and deployment according to `launch-store/PLATFORM-SETUP.md`.
