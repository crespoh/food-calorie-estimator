# Food Estimator — Share Card v2 (Minimalist)

This document freezes the new Open Graph/Twitter share-card design. Use these exact SVGs and specs to implement later. Do not regenerate unless requested.

## Canonical assets in repo
- With photo (OG 1200×630): `previews/og/with_photo_1200x630.svg`
- No photo (Light, OG 1200×630): `previews/og/no_photo_light_1200x630.svg`
- No photo (Dark, OG 1200×630): `previews/og/no_photo_dark_1200x630.svg`
- Preview page: `previews/og/index.html`

## Implementation outline (no code yet)
- Output: 1200×630 PNG/JPEG for `og:image` and `twitter:image` (≤2 MB). JPEG 85–90% if photo; PNG for no-photo.
- Endpoint: `/og/food/:id.png?variant=photo|light|dark`.
- Inputs: `dishName`, `caloriesKcal`, `servingLabel`, `proteinG`, `carbsG`, `fatG`, `confidencePct`, `imageUrl?`, `brandAccent`, `brandDomain`, `brandLogoUrl?`, `locale`.
- Layout: 48px safe area; 2-line headline max with downscale/ellipsis; bottom gradient on photos; macro pills; optional confidence chip.
- Fallbacks: if `imageUrl` missing/fails, use no-photo light/dark variant.
- Caching: cache by content hash; CDN; long `Cache-Control`.
- OG/Twitter tags on public result page: include `og:image:width/height` and `twitter:card=summary_large_image`.
- Accessibility: set `og:image:alt`/`twitter:image:alt` with concise description.

## Canonical SVGs (embed)

### with_photo_1200x630.svg
```xml
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <!-- Background gradient -->
    <linearGradient id="bgPhoto" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#F4C77E"/>
      <stop offset="100%" stop-color="#D96A6B"/>
    </linearGradient>
    <!-- Vignette and bottom gradient for legibility -->
    <linearGradient id="legibility" x1="0" y1="0" x2="0" y2="1">
      <stop offset="55%" stop-color="#00000000"/>
      <stop offset="100%" stop-color="#000000B3"/>
    </linearGradient>
    <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
      <stop offset="60%" stop-color="#00000000"/>
      <stop offset="100%" stop-color="#00000066"/>
    </radialGradient>
    <style><![CDATA[
      .font-sans { font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", "DejaVu Sans", sans-serif; }
      .headline { fill: #FFFFFF; font-weight: 800; font-size: 72px; letter-spacing: -0.5px; }
      .subhead { fill: #FFFFFF; opacity: 0.9; font-weight: 600; font-size: 38px; }
      .pillText { fill: #FFFFFF; font-weight: 700; font-size: 26px; letter-spacing: 0.2px; }
      .pillBg { fill: #FFFFFF; opacity: 0.14; }
      .pillStroke { fill: none; stroke: #FFFFFF; stroke-opacity: 0.12; }
      .brand { fill: #FFFFFF; opacity: 0.92; font-weight: 700; font-size: 24px; letter-spacing: 0.2px; }
      .accent { fill: #5B8CFF; }
    ]]></style>
  </defs>

  <!-- Simulated photo background with stylized food shapes -->
  <rect x="0" y="0" width="1200" height="630" fill="url(#bgPhoto)"/>

  <!-- Abstract food illustration (circles, leaves, highlights) -->
  <g opacity="0.6">
    <circle cx="330" cy="260" r="140" fill="#FFF2CC"/>
    <circle cx="520" cy="300" r="110" fill="#FFD6A5"/>
    <circle cx="690" cy="210" r="90" fill="#FFE5B4"/>
    <circle cx="880" cy="310" r="130" fill="#FFB3B3"/>
    <ellipse cx="420" cy="220" rx="180" ry="60" fill="#77D68B" opacity="0.6"/>
    <ellipse cx="760" cy="260" rx="160" ry="50" fill="#6ECF90" opacity="0.6"/>
    <circle cx="600" cy="180" r="18" fill="#FFFFFF" opacity="0.35"/>
    <circle cx="950" cy="240" r="14" fill="#FFFFFF" opacity="0.35"/>
  </g>

  <!-- Vignette -->
  <rect x="0" y="0" width="1200" height="630" fill="url(#vignette)"/>
  <!-- Bottom legibility gradient overlay -->
  <rect x="0" y="0" width="1200" height="630" fill="url(#legibility)"/>

  <!-- Accent keyline at top -->
  <rect x="0" y="0" width="1200" height="6" class="accent"/>

  <!-- Safe area: 48px all around -->
  <g id="safe" transform="translate(48,48)">
    <!-- Text block positioned near bottom-left -->
    <g transform="translate(0,390)">
      <text class="font-sans headline" x="0" y="0">Chicken Caesar Salad</text>
      <text class="font-sans subhead" x="0" y="56">520 kcal · per bowl</text>

      <!-- Confidence chip -->
      <g transform="translate(0,90)">
        <rect x="0" y="0" width="104" height="42" rx="10" class="pillBg"/>
        <rect x="0.5" y="0.5" width="103" height="41" rx="9.5" class="pillStroke"/>
        <text class="font-sans pillText" x="20" y="28">±7%</text>
      </g>

      <!-- Macro pills row -->
      <g transform="translate(120,90)">
        <!-- P -->
        <g>
          <rect x="0" y="0" width="112" height="42" rx="10" class="pillBg"/>
          <rect x="0.5" y="0.5" width="111" height="41" rx="9.5" class="pillStroke"/>
          <text class="font-sans pillText" x="16" y="28">P 38g</text>
        </g>
        <!-- C -->
        <g transform="translate(128,0)">
          <rect x="0" y="0" width="112" height="42" rx="10" class="pillBg"/>
          <rect x="0.5" y="0.5" width="111" height="41" rx="9.5" class="pillStroke"/>
          <text class="font-sans pillText" x="16" y="28">C 22g</text>
        </g>
        <!-- F -->
        <g transform="translate(256,0)">
          <rect x="0" y="0" width="112" height="42" rx="10" class="pillBg"/>
          <rect x="0.5" y="0.5" width="111" height="41" rx="9.5" class="pillStroke"/>
          <text class="font-sans pillText" x="16" y="28">F 28g</text>
        </g>
      </g>

      <!-- Brand footer -->
      <g transform="translate(0,150)">
        <circle cx="14" cy="14" r="10" fill="#FFFFFF" opacity="0.92"/>
        <text class="font-sans brand" x="36" y="22">food.app</text>
      </g>
    </g>
  </g>
</svg>
```

### no_photo_light_1200x630.svg
```xml
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="bgLight" cx="50%" cy="40%" r="80%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#EEF1F6"/>
    </radialGradient>
    <linearGradient id="legibilityLight" x1="0" y1="0" x2="0" y2="1">
      <stop offset="55%" stop-color="#FFFFFF00"/>
      <stop offset="100%" stop-color="#FFFFFFCC"/>
    </linearGradient>
    <style><![CDATA[
      .font-sans { font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", "DejaVu Sans", sans-serif; }
      .headline { fill: #0B0C10; font-weight: 800; font-size: 72px; letter-spacing: -0.5px; }
      .subhead { fill: #30343B; opacity: 0.9; font-weight: 600; font-size: 38px; }
      .pillText { fill: #0B0C10; font-weight: 700; font-size: 26px; letter-spacing: 0.2px; }
      .pillBg { fill: #0B0C10; opacity: 0.06; }
      .pillStroke { fill: none; stroke: #0B0C10; stroke-opacity: 0.10; }
      .brand { fill: #30343B; opacity: 0.92; font-weight: 700; font-size: 24px; letter-spacing: 0.2px; }
      .accent { fill: #5B8CFF; }
      .plateRim { fill: none; stroke: #D6DBE4; stroke-width: 10; }
      .plateFill { fill: #FFFFFF; }
      .glyph { fill: #D6DBE4; }
    ]]></style>
  </defs>

  <rect x="0" y="0" width="1200" height="630" fill="url(#bgLight)"/>

  <!-- Simple plate glyph as thumbprint -->
  <g transform="translate(800,140)">
    <circle cx="180" cy="180" r="160" class="plateFill"/>
    <circle cx="180" cy="180" r="160" class="plateRim"/>
    <circle cx="180" cy="180" r="26" class="glyph" opacity="0.6"/>
  </g>

  <!-- Bottom legibility area for text (light) -->
  <rect x="0" y="0" width="1200" height="630" fill="url(#legibilityLight)"/>

  <!-- Accent keyline at top -->
  <rect x="0" y="0" width="1200" height="6" class="accent"/>

  <g id="safe" transform="translate(48,48)">
    <g transform="translate(0,390)">
      <text class="font-sans headline" x="0" y="0">Chicken Caesar Salad</text>
      <text class="font-sans subhead" x="0" y="56">520 kcal · per bowl</text>

      <!-- Confidence chip -->
      <g transform="translate(0,90)">
        <rect x="0" y="0" width="104" height="42" rx="10" class="pillBg"/>
        <rect x="0.5" y="0.5" width="103" height="41" rx="9.5" class="pillStroke"/>
        <text class="font-sans pillText" x="20" y="28">±7%</text>
      </g>

      <!-- Macro pills row -->
      <g transform="translate(120,90)">
        <g>
          <rect x="0" y="0" width="112" height="42" rx="10" class="pillBg"/>
          <rect x="0.5" y="0.5" width="111" height="41" rx="9.5" class="pillStroke"/>
          <text class="font-sans pillText" x="16" y="28">P 38g</text>
        </g>
        <g transform="translate(128,0)">
          <rect x="0" y="0" width="112" height="42" rx="10" class="pillBg"/>
          <rect x="0.5" y="0.5" width="111" height="41" rx="9.5" class="pillStroke"/>
          <text class="font-sans pillText" x="16" y="28">C 22g</text>
        </g>
        <g transform="translate(256,0)">
          <rect x="0" y="0" width="112" height="42" rx="10" class="pillBg"/>
          <rect x="0.5" y="0.5" width="111" height="41" rx="9.5" class="pillStroke"/>
          <text class="font-sans pillText" x="16" y="28">F 28g</text>
        </g>
      </g>

      <!-- Brand footer -->
      <g transform="translate(0,150)">
        <circle cx="14" cy="14" r="10" fill="#0B0C10" opacity="0.92"/>
        <text class="font-sans brand" x="36" y="22">food.app</text>
      </g>
    </g>
  </g>
</svg>
```

### no_photo_dark_1200x630.svg
```xml
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="bgDark" cx="50%" cy="40%" r="80%">
      <stop offset="0%" stop-color="#0E0F12"/>
      <stop offset="100%" stop-color="#0A0B0E"/>
    </radialGradient>
    <linearGradient id="legibilityDark" x1="0" y1="0" x2="0" y2="1">
      <stop offset="55%" stop-color="#00000000"/>
      <stop offset="100%" stop-color="#000000B3"/>
    </linearGradient>
    <style><![CDATA[
      .font-sans { font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", "DejaVu Sans", sans-serif; }
      .headline { fill: #FFFFFF; font-weight: 800; font-size: 72px; letter-spacing: -0.5px; }
      .subhead { fill: #FFFFFF; opacity: 0.9; font-weight: 600; font-size: 38px; }
      .pillText { fill: #FFFFFF; font-weight: 700; font-size: 26px; letter-spacing: 0.2px; }
      .pillBg { fill: #FFFFFF; opacity: 0.12; }
      .pillStroke { fill: none; stroke: #FFFFFF; stroke-opacity: 0.10; }
      .brand { fill: #FFFFFF; opacity: 0.92; font-weight: 700; font-size: 24px; letter-spacing: 0.2px; }
      .accent { fill: #5B8CFF; }
      .plateRim { fill: none; stroke: #2A2F3A; stroke-width: 10; }
      .plateFill { fill: #0F1115; }
      .glyph { fill: #2A2F3A; }
    ]]></style>
  </defs>

  <rect x="0" y="0" width="1200" height="630" fill="url(#bgDark)"/>

  <!-- Simple plate glyph as thumbprint -->
  <g transform="translate(800,140)">
    <circle cx="180" cy="180" r="160" class="plateFill"/>
    <circle cx="180" cy="180" r="160" class="plateRim"/>
    <circle cx="180" cy="180" r="26" class="glyph" opacity="0.7"/>
  </g>

  <!-- Bottom legibility area for text (dark) -->
  <rect x="0" y="0" width="1200" height="630" fill="url(#legibilityDark)"/>

  <!-- Accent keyline at top -->
  <rect x="0" y="0" width="1200" height="6" class="accent"/>

  <g id="safe" transform="translate(48,48)">
    <g transform="translate(0,390)">
      <text class="font-sans headline" x="0" y="0">Chicken Caesar Salad</text>
      <text class="font-sans subhead" x="0" y="56">520 kcal · per bowl</text>

      <!-- Confidence chip -->
      <g transform="translate(0,90)">
        <rect x="0" y="0" width="104" height="42" rx="10" class="pillBg"/>
        <rect x="0.5" y="0.5" width="103" height="41" rx="9.5" class="pillStroke"/>
        <text class="font-sans pillText" x="20" y="28">±7%</text>
      </g>

      <!-- Macro pills row -->
      <g transform="translate(120,90)">
        <g>
          <rect x="0" y="0" width="112" height="42" rx="10" class="pillBg"/>
          <rect x="0.5" y="0.5" width="111" height="41" rx="9.5" class="pillStroke"/>
          <text class="font-sans pillText" x="16" y="28">P 38g</text>
        </g>
        <g transform="translate(128,0)">
          <rect x="0" y="0" width="112" height="42" rx="10" class="pillBg"/>
          <rect x="0.5" y="0.5" width="111" height="41" rx="9.5" class="pillStroke"/>
          <text class="font-sans pillText" x="16" y="28">C 22g</text>
        </g>
        <g transform="translate(256,0)">
          <rect x="0" y="0" width="112" height="42" rx="10" class="pillBg"/>
          <rect x="0.5" y="0.5" width="111" height="41" rx="9.5" class="pillStroke"/>
          <text class="font-sans pillText" x="16" y="28">F 28g</text>
        </g>
      </g>

      <!-- Brand footer -->
      <g transform="translate(0,150)">
        <circle cx="14" cy="14" r="10" fill="#FFFFFF" opacity="0.92"/>
        <text class="font-sans brand" x="36" y="22">food.app</text>
      </g>
    </g>
  </g>
</svg>
```

---
These are the frozen v2 designs. When back at desktop, follow the checklist in this doc to implement.