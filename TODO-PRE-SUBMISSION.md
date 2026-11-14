# Pending before submission (do when everything else is at 100%)

Deadline: Sunday 15 Nov 2026, 23:59 local time.

## Third-party licenses and attribution audit

Source: 2026 NASA Space Apps Participant Terms (updated 7 Aug 2026), https://www.spaceappschallenge.org/legal sections "Use of Third-Party Materials", "Warranties" and "Media Release".

The rules require that:
- Every source used is cited, even if open source or freely available. NASA can remove awards from teams that do not.
- The licenses of all non-NASA materials are identified in the documentation we submit. Otherwise the solution is not accepted.
- Our original content is freely available or under an OSI license (done: Apache 2.0, see `LICENSE`).

Audit each asset below: find its origin and license, then add it to `/references` (`app/references/page.tsx`) and to the References field of the submission form.

- [ ] **Soundtrack** of the About-page intro video (EN/ES versions). Confirm it is original or royalty-free and note the license.
- [ ] **3D models** (simulator, lab, immersive). Origin and license of each.
- [ ] **Fonts** and **icons**. Origin and license.
- [ ] **npm dependencies**: list main libraries with their licenses (`npx license-checker --summary`).
- [ ] **Video content**: our original work, no third-party infringement (audio included).
- [ ] **People on screen** (video, About page): adults only, and they agree to NASA using their name and likeness. No recognizable minors.
- [ ] `/references` shows the license next to each item, not only the source.
- [ ] Re-read the terms at spaceappschallenge.org/legal on submission day in case they changed.

Already done: copyright notice in footer, `LICENSE` (Apache 2.0), License section in `README.md`, "not affiliated with NASA" disclaimer.
