# trmnl-AB-parasha
TRMNL plugin source for Parasha

## Reading-title normalization

`src/transform.js` accepts Hebcal English and Ashkenazi titles, original titles,
and memo fallbacks. Holiday readings use the same normalizer as weekly portions.
It preserves this plugin's established spellings (including Succos, Shemini,
Bereishis, Acharei Mos, and Nasso) and applies whole-word aliases in one pass so
already-normalized names remain stable.

`tests/hebcal-titles.json` contains 181 distinct title groups extracted from the
sibling Torah-data repository's immutable Parquet corpus, covering both Israel
and Diaspora across Hebrew years 1-6000:

- `data/hebcal/corpus-v1/block=*/core_event_occurrence.parquet`: distinct
  `event_description`, `title_en`, and `title_ashkenazi`, with trailing numeric
  years removed; excludes Molad announcements and Omer counts.
- `data/hebcal/corpus-v1/block=*/core_parasha_occurrence.parquet`: distinct
  `basename`, `title_en`, and `title_ashkenazi`.

Expected values come from the Ashkenazi column with the established display
spellings above and ASCII apostrophes. The curated `powerbi-static-v1` holiday
and parashiyos tables were also reviewed; their alternative spellings are not
used to rename existing display conventions. The corpus remains unchanged.

Run `node --test tests/transform.test.js` here, or `npm test` in `trmnl-AB`.
Tests exercise every catalog input through all three title fields, verify
idempotence, and cover the Shemini Atzeres regression and composite titles.

To publish, push this repository, inspect the live **Hebcal - Parasha**
integration and its current transform/merge variables, write only `transform_js`
through TRMNL MCP, refresh, verify the returned title, and inspect a quadrant
screenshot. Read back the transform before updating the parent gitlinks. TRMNL
may create an automatic source commit; fetch and reconcile that before pinning.
