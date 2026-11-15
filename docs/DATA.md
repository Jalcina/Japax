# Data used by JaPax

Every number on the site traces back to one of these NASA investigations, cited with its PSI ID and DOI. This file is generated from `data/investigations.v2.json` and `data/psi-size-total.json`.

- **19 investigations** from NASA Physical Sciences Informatics (PSI), https://psi.nasa.gov
- **12,146 public files** catalogued
- **12.71 TB** (decimal, 1 TB = 10^12 bytes) of raw data declared by PSI, queried 2026-11-15

> **Files** is what PSI enumerates one by one; **Declared size** is the total PSI declares for the investigation, which can include files it does not enumerate (for example PSI-20: 2 enumerated files, 2036 GB declared). The site explains both totals on the home page.

| PSI ID | Name | Phase | DOI | Files | Declared size |
|---|---|---|---|---:|---:|
| PSI-10 | ACME Flame Design | gas | [10.60555/w4zy-bt45](https://doi.org/10.60555/w4zy-bt45) | 3,809 | 2180 GB |
| PSI-20 | ACME BRE | gas (emulates solids) | [10.60555/vb93-3y72](https://doi.org/10.60555/vb93-3y72) | 2 | 2036 GB |
| PSI-21 | ACME CLD Flame | gas | [10.60555/23e1-9950](https://doi.org/10.60555/23e1-9950) | 2 | 2006 GB |
| PSI-22 | ACME E-FIELD | gas | [10.60555/se5a-8c73](https://doi.org/10.60555/se5a-8c73) | 1 | 950 GB |
| PSI-25 | BASS-II | solid | [10.60555/4qc4-de67](https://doi.org/10.60555/4qc4-de67) | 695 | 275 GB |
| PSI-26 | BASS | solid | [10.60555/58h4-dy80](https://doi.org/10.60555/58h4-dy80) | 212 | 164 GB |
| PSI-39 | CFI | liquid (droplets) | [10.60555/m6pj-a914](https://doi.org/10.60555/m6pj-a914) | 2,832 | 719 GB |
| PSI-47 | DAFT / DAFT-2 | aerosol (dust) | [10.60555/ztgj-d202](https://doi.org/10.60555/ztgj-d202) | 33 | 0.0 GB |
| PSI-60 | SPICE data analysis | gas | [10.60555/mzjm-yv57](https://doi.org/10.60555/mzjm-yv57) | 1 | 0.0 GB |
| PSI-68 | FLEX-2 | liquid (droplets) | [10.60555/byp8-h018](https://doi.org/10.60555/byp8-h018) | 1 | 1225 GB |
| PSI-69 | FLEX | liquid (droplets) | [10.60555/mbq8-0451](https://doi.org/10.60555/mbq8-0451) | 1 | 924 GB |
| PSI-98 | Saffire-I | solid (spacecraft material) | [10.60555/0t15-1z43](https://doi.org/10.60555/0t15-1z43) | 75 | 12 GB |
| PSI-99 | Saffire-II | solid (spacecraft material) | [10.60555/2chp-m469](https://doi.org/10.60555/2chp-m469) | 1 | 17 GB |
| PSI-100 | Saffire-III | solid (spacecraft material) | [10.60555/040q-4h36](https://doi.org/10.60555/040q-4h36) | 86 | 35 GB |
| PSI-101 | SAME-R | aerosol (smoke) | [10.60555/2np7-jv14](https://doi.org/10.60555/2np7-jv14) | 343 | 6.3 GB |
| PSI-102 | SAME | aerosol (smoke) | [10.60555/gd4k-8h62](https://doi.org/10.60555/gd4k-8h62) | 105 | 0.7 GB |
| PSI-106 | SLICE | gas | [10.60555/pm12-rg61](https://doi.org/10.60555/pm12-rg61) | 2 | 73 GB |
| PSI-107 | SPICE | gas | [10.60555/9kbh-e962](https://doi.org/10.60555/9kbh-e962) | 187 | 6.9 GB |
| PSI-159 | ACME CFI-G | gas | [10.60555/cyt1-kh64](https://doi.org/10.60555/cyt1-kh64) | 3,758 | 2086 GB |

## Where each file comes from

| File | What it is | How it is produced |
|---|---|---|
| `data/psi/PSI-*.json` | Raw metadata and file inventory of each investigation | `node scripts/fetch-psi.mjs` (public PSI API, no key) |
| `data/curated.json` | Hand-curated facts, each with its source | Edited by hand; every fact cites PSI, NTRS or a NASA fact sheet |
| `data/ntrs.json`, `pubdois.json`, `pubntrs.json` | NASA Technical Reports Server records and publication DOIs | `scripts/fetch-ntrs.mjs`, `resolve-dois.mjs`, `resolve-ntrs.mjs` |
| `data/investigations.v2.json` | What the app reads | `node scripts/build-data.mjs` |
| `data/lab.json` | Experiment tables (CSV rows) used by the simulator | `node scripts/build-lab-data.mjs` (needs the raw CSVs from `scripts/fetch-psi-files.mjs`, not stored here because they are large) |
| `data/components/*.json` | Component catalogues of the spacesuit, ISS, lunar module and environments | Edited by hand; every fact has a tag and a source, checked by `npm run test:lab` |
| `data/psi-size-total.json` | Total declared size of the 19 investigations, with date and per-investigation sizes | Sum of `totalFileSize` from the PSI API |
| `data/data.es.json` | Spanish translation of the investigation texts | Edited by hand |

## Four kinds of number

Measured (recorded in a PSI dataset), reported (stated in a paper or NTRS report), estimated (an assumption with no experimental source) and simulated (output of the JaPax model). See the **Method** page of the site.

## Known gaps

- PSI has no combustion data at lunar gravity (0.166 g). LUCI (NTRS 20250010653) and FM2 are the first.
- The BASS-II table has no pressure column; 1 atm is assumed and labelled so.
- FLEX burned fuel droplets, not fabric, plastic or cables.
