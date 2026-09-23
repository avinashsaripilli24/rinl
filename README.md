# RINL Plot Explorer

A mobile-first app for exploring the 456 RINL plots in HB Colony in the Visakhapatnam e-auction (12 and 16 Oct 2026). The data comes from `../Main List.pdf` and `../extra details.pdf` (the RFP).

## Run

```bash
npm install
npm run dev        # http://localhost:5173 (also on your LAN, so you can open it on your phone)
npm run build      # static site in dist/ (relative paths, deployable anywhere)
```

## Data

- `npm run extract` rebuilds `src/data/plots.json` from the two PDFs. It needs `pip install pdfplumber`, and it fails if the plot counts, prices or surroundings don't check out.
- `npx tsx scripts/check.ts` sanity-checks derived fields (facing, corners, roads), search and the money maths.
- `scripts/overrides.json` holds hand corrections, keyed `"UNIT|dayTable"`. Use `rfp_N`/`rfp_S`/`rfp_E`/`rfp_W`/`rfp_approach` to fix a cell, or `conflicts` to add a note.

## How the derived fields work

- **Facing:** from the road sides in the RFP surroundings. Adjacent road sides make a corner (N+E = NE, N+W = NW…). Vastu order: NE › E › N › NW › SE › W › S › SW.
- **Dimensions:** not published. The app shows an estimate that assumes a frontage-to-depth ratio of about 1 : 1.47.
- **Costs:** EMD, the 10% and balance instalments, the 0.1% processing fee + 18% GST, and optional 12% grace interest come from the RFP. Stamp, transfer and registration (7.5%) is an Andhra Pradesh estimate you can edit.
- **Conflicts:** where the PDFs disagree, the Main List wins and the plot shows a ⚠ note. This covers the Block 9 map pin, Block 11A vs 11B, the Block 42 day split, and the approach vs neighbours direction in Block 41.
