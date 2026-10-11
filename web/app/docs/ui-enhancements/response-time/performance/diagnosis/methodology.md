# Retained baseline CPU diagnosis

The original one-repetition report and seven CPU profiles are copied byte for byte from the local diagnostic capture. They remain separate from the later unprofiled ten-repetition comparison. The recorded source is `131bd0d74ebdef897e31e962377f295f758ce927`.

[analysis.json](analysis.json) retains SHA256 hashes, a local-only URL inventory, exact bundle coordinates, weighted sample indices, native-leaf ancestor chains and the derivation method. Published coordinates are one-based; CDP coordinates are zero-based. Sample i receives timeDeltas[i]/1000 milliseconds. Self time matches the leaf; inclusive time matches an ancestor once per sample. Native getters have no bundle position, so their ancestor chain establishes the mapping.

Verified estimates: Saved Home 135.197ms self time; stage collision check 110.049ms self time; manual receipt descendant getBoundingClientRect 36.721ms; Coach resize descendant viewport-height getter 53.292ms. These are sampled-stack estimates under 4× CPU throttle over the entire profiler window, not exact function wall durations or costs proven to delay feedback.

Two raw intervals are negative: manual profile sample 134 is −459µs and Saved sample 233 is −13µs. Their cause is unconfirmed. The raw files and signed sums are preserved; alternate sums excluding negative intervals are included. All four selected estimates are unchanged by that alternate calculation.

The executed harness was dirty and predated hash/profile-directory metadata. Its exact bytes are unavailable; no later harness hash is assigned retroactively. CPU profiles retain bundle URLs but no original served-byte hashes. Bundle excerpts and hashes in the analysis come from the later exact-revision comparison build and provide mapping context.

Profiling adds overhead and these timings are excluded from acceptance comparisons. The fixture hides overlay art after hooks run, leaving geometry effects active. It does not establish visible-Momo cost or a completely unmounted-mascot result. Browser work and Playwright polling also appear. One baseline repetition per action supports investigation only: no causal attribution, comparative improvement or stable performance claim.
