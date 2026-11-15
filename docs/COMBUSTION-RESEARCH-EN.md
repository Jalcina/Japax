# How Does Fire Burn? Oxygen, Other Oxidizers and Partial Gravity

*Supporting research for JaPax. Section A uses only the NASA Physical Sciences Informatics (PSI) data in this repo. Sections B–D use NASA Technical Reports Server (NTRS) documents; **they are not PSI data** and are marked as such. Nothing below is invented: items we could not confirm are listed in Section E.*

## A. What the PSI data shows (measured)
- Fire needs fuel, an oxidizer and heat. In all 19 PSI investigations reviewed, the oxidizer is oxygen (O2), mixed with N2, He or CO2 as diluent. No PSI experiment uses another oxidizer.
- Fuels vary widely: methane, ethylene, ethane, propane, butane, methanol, heptane, dodecane, PMMA, SIBAL fabric, silicone, Kapton, Teflon.
- N2, He and CO2 do not feed the flame; they dilute it. CO2 was used in 123 of 274 FLEX tests (PSI-69); helium in 50.
- Oxygen range tested: about 12–40% in FLEX and CFI-G normal flames, up to 70% in inverse flames (PSI-159).
- "Cool flames" burn at about 500–1000 K but still need fuel and O2 (PSI-159, PSI-39).
- In ACME CFI-G normal flames, 132 of 179 tests reached hot ignition (counts are our own tallies of the PSI CSV tables).

## B. Combustion without oxygen (NASA documents, not PSI)
- **Metal + CO2:** magnesium burns in CO2 (Mg + CO2 → MgO + CO), ignitable around 1,000 K. In microgravity burning takes about twice as long as in normal gravity and about five times longer than in O2 [1][2].
- **Nitrogen and CO2 are not always inert:** in simulated Mars/Venus atmospheres, lithium, beryllium, calcium, titanium, zirconium, thorium and cerium ignite; magnesium did not ignite in the Mars mixture or in pure N2 up to about 1,071 °C [3].
- **Halogen oxidizers:** chlorine trifluoride reacts hypergolically with most solid propellants and cannot ignite below about 2–3 psia [4]. Fluorine is "the strongest oxidizing agent" known [5].
- **Hydrogen peroxide** does not burn itself but "vigorously supports combustion" by releasing oxygen; foam and CO2 do not extinguish it [5].
- **Oxidizer inside the fuel:** on Mir (1997) a solid-fuel oxygen generator (lithium perchlorate) burned with a flame of about three feet lasting several minutes; the most likely cause was latex glove material in the canister [6].
- **Lithium-ion batteries:** some cathodes release oxygen under overvoltage and can vent with flames [7]. In a NASA ISS-battery test, one cell entered thermal runaway with no cell-to-cell propagation observed [8].

## C. Metals in oxygen-enriched atmospheres (NASA, not PSI)
- Titanium samples all ignited by friction in liquid oxygen; aluminum foil did not in the same test [9]. NASA standards forbid titanium with LOX and with gaseous oxygen above 207 kPa [10].
- Materials generally become easier to ignite as oxygen pressure or concentration rises [11].

## D. Partial gravity: the data are very limited
- PSI contains no partial-gravity flame data.
- **LUCI** flew on 4 Feb 2025 (Blue Origin New Shepard, lunar gravity simulated by rotation at 11 RPM): SIBAL fabric flame-tip spread 1.1 mm/s; PMMA rod 1.5 mm/s versus about 3.95 mm/s in 1 g. One burn per sample; Coriolis force adds uncertainty [12][13].
- **FM2** will burn samples on the Moon; launch planned for late 2026 (NASA date, unconfirmed) [14].
- Hypothesis, not yet demonstrated: some materials may be more flammable at lunar gravity than at 1 g, so the standard 1-g screening test (NASA-STD-6001B) may not be conservative enough [14].

## E. What we could not confirm
- Magnesium burning in nitrogen to form a nitride (NASA data say it does not ignite up to ~1,071 °C).
- Chlorine trifluoride burning sand or concrete (no NASA source found).
- That PVC/PTFE wire insulation smoldering is a common spacecraft fire concern (claim from NTRS 20230004106, which could not be downloaded). NASA's research-needs report (NTRS 20030053425) does list smoldering and overheated components as priorities.
- Most cited reports date from 1949–2009; LUCI was read from slides, not the full paper.

## References
1. Combustion of Metals in Carbon Dioxide and Reduced-Gravity Environments, NASA NTRS 20010074061. https://ntrs.nasa.gov/citations/20010074061
2. Powdered Magnesium–Carbon Dioxide, NASA/TP-2007-215077. https://ntrs.nasa.gov/api/citations/20080002287/downloads/20080002287.pdf
3. Rhein, R. A., The Utilization of Powdered Metals as Fuels in the Atmospheres of Venus, Earth, and Mars, JPL TR 32-1073 (1967). https://ntrs.nasa.gov/api/citations/19670010840/downloads/19670010840.pdf
4. NASA SP-8051, Solid Rocket Motor Igniters (Space Vehicle Design Criteria, Chemical Propulsion), 1971. https://ntrs.nasa.gov/api/citations/19710020870/downloads/19710020870.pdf
5. NASA SP-4-44, Liquid Propellants Safety Handbook. https://ntrs.nasa.gov/api/citations/19650018358/downloads/19650018358.pdf
6. NASA History, "25 Years Ago: Fire Aboard Space Station Mir". https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/
7. Guidelines on Lithium-ion Battery Use in Space Applications, NASA NTRS 20090023862. https://ntrs.nasa.gov/api/citations/20090023862/downloads/20090023862.pdf
8. Assessment of ISS Lithium-Ion Batteries, NASA NTRS 20170003873. https://ntrs.nasa.gov/api/citations/20170003873/downloads/20170003873.pdf
9. Liquid Oxygen Rotating Friction Ignition Testing of Aluminum and Titanium, NASA NTRS 20090006758. https://ntrs.nasa.gov/citations/20090006758
10. NSS 1740.15, NASA Safety Standard for Oxygen and Oxygen Systems. https://ntrs.nasa.gov/api/citations/19960021046/downloads/19960021046.pdf
11. NASA/TM-2007-213740, Guide for Oxygen Compatibility Assessments. https://ntrs.nasa.gov/api/citations/20070016582/downloads/20070016582.pdf
12. Ferkul, P. et al., Lunar Combustion Investigation: Flammability Results from a Rotating Sounding Rocket, NASA NTRS 20250010653. https://ntrs.nasa.gov/citations/20250010653
13. LUCI presentation, ASGSR 2025. https://ntrs.nasa.gov/api/citations/20250010653/downloads/ASGSR%202025-LUCI-Ferkul-Presentation-v2-20250010653.pdf
14. Ferkul, P., Kralik, N., Liao, Y.-T., Material Flammability at Lunar and Martian Gravity, LPSC 2026, NASA NTRS 20260000646. https://ntrs.nasa.gov/api/citations/20260000646/downloads/Ferkul-Lunar%20and%20Planetary%20Science%20Conference%202026.pdf
15. NASA PSI investigations PSI-39, 69, 159 (CFI, FLEX, ACME CFI-G); DOIs in `data/pubdois.json`.
