# Search visibility across India — short design

**Why:** livegridAV's office is in Delhi, but the team travels to any city for
events. The owner wants the site found by people searching in Delhi, Mumbai,
Hyderabad, Bangalore and Kolkata. Today the site names Delhi once and never
names India or the other cities.

**Owner decisions**
- No visible "Cities we serve" list or section anywhere on the site.
- Every city should still find the site on Google.
- Nothing goes live without the owner's OK.

## Approaches

- **One page per city (chosen).** Five full pages Google treats as real content.
- **City × service pages.** About 50 near-identical pages. Google treats these
  as doorway pages and can demote the whole site. Rejected.
- **Only mention cities in existing copy.** Too weak to rank for "… in Mumbai".
  Rejected.

## Design

1. **City pages** at `/locations/<city>`: delhi (Delhi NCR: Delhi, Gurugram,
   Noida), mumbai, hyderabad, bangalore, kolkata.
   - Same design language as the LED type pages.
   - Each page covers the services offered there and the city's event venues.
     Venues are named as places events happen, never as past clients.
   - Each page explains how a trip from Delhi works, and has a short FAQ and a
     contact call to action.
   - The pages are not linked from the menu or footer. Google finds them through
     the sitemap and one FAQ answer.
2. **Structured data:** one shared Organization / ProfessionalService record.
   - The Delhi office is the only address.
   - `areaServed` is India plus the five cities.
   - It is used by the home, service, contact and city pages.
3. **Positioning copy:** the home page eyebrow and the root/home titles and
   descriptions read "Delhi-based, working across India".
4. **One FAQ answer**, "Do you work outside Delhi?", on the LED Display
   Solutions service. It names the cities in a sentence and links to their
   pages.
5. **Brand spelling:** "livegridAV" everywhere in copy and metadata, replacing
   LiveGridAV and LivegridAV.
6. **Share image:** `app/opengraph-image.jpg` and `twitter-image.jpg` at
   1200×630, built from the brand lockup. The Twitter card becomes
   `summary_large_image`.
7. **AI search:** `public/llms.txt` gives a plain summary, the services, the
   service area and contact details.

## Guardrails

- No hidden text and no keyword stuffing.
- No invented clients, events, years or office addresses. The site's existing
  rule is no fabricated case studies.

## Left to the builder

City copy wording, venue choice per city and FAQ wording, all within the
guardrails above.

## Off-site (owner)

- Google Search Console: verify the site and submit the sitemap.
- Google Business Profile for the Delhi office, plus client reviews.
- Consistent listings on JustDial, IndiaMART and Sulekha.
- Links from partners.
