# Price comparison: site data vs `2027_summer_program_dates_prices.xlsx`

Site = `data/programs.normalized.json`. Excel = `dates_prices` + `provider_status` sheets (status as of 30 Sep 2026).

## Summary

| Provider | Result |
|---|---|
| InvestIN | Match (2,290 / 3,865 · 3,685 / 6,995 · 4,620 / 7,930 GBP). One site record at £5,495 is not in Excel. |
| Oxford Royale (Oxford, Cambridge) | Prices match (£6,995 res / £4,995 non-res). **Dates differ by one day** (see below). |
| Sportech (Milan, Parma, university-level) | Match (€5,050 / €2,950; Parma €5,500; university €4,000). |
| MPW | Match: dates equal, no current price on either side (site labels 2026 fees as historical). |
| Immerse | £5,995 matches Excel non-residential. **Residential £7,495 is missing on site.** |
| Summer Discovery | Bryn Mawr / Fairfield match. **UCLA range differs**, Anderson has no price on site. |
| Constructor University | **Mismatch**: site shows €4,600, Excel says price and dates TBA. |
| Sportech Indianapolis | **Possible mismatch**: site $5,000 (esports in motorsport) vs Excel $7,000 (Driver & Race Engineer). |
| Oxford Royale Yale | Site shows £6,995 (6 records); Excel says Yale page is stale 2026 content, not a final 2027 price. |
| Edconic | Same numbers ($6,195 / $7,695 NYC), but Excel says these are not final 2027 (2026 dates alongside). |
| St Clare's | Site shows package fees (£1,395–£5,670); Excel found no official 2027 tariff or bookable dates. |
| Bucksmore | Only Intensive English £2,195/week is in Excel (2026 reference). Site's £3,095 / £2,595 prices have no Excel counterpart. |

## Details

### Differences worth fixing
1. **Constructor University**: site €4,600, dates 25 Jul – 5 Aug (9 records). Excel: official 2027 page says price and dates TBA. Probably 2026 data; consider showing "TBA".
2. **Immerse**: site has one tier (£5,995). Excel: £5,995 non-residential, £7,495 residential (includes accommodation, meals, extracurriculars). Add the residential tier (Toronto's £4,495 is not covered by Excel).
3. **Oxford Royale dates** (Oxford and Cambridge): Excel 4–17 Jul, 18–31 Jul, 1–14 Aug 2027 (Sundays). Site 5–18 Jul, 19 Jul–1 Aug, 2–15 Aug (Mondays). Check which is the arrival/start day.
4. **Summer Discovery UCLA**: site campus range $2,499–$16,999 across 57 records; Excel UCLA residential $7,499–$14,899, commuter $4,499–$7,499. Anderson (6 records) has no site price; Excel residential $7,799–$15,999, commuter $4,799–$8,699. Excel caveat: prices are at 2026 tuition level, valid for bookings through 30 Sep 2026.
5. **Sportech Indianapolis**: site $5,000 residential, 14–21 Mar 2027; Excel $7,000, 14–20 Mar 2027, 1 week, includes six nights, full board, simulator sessions. Confirm these are the same programme.
6. **Yale (Oxford Royale) and Edconic Sotheby's NYC**: Excel says not accepted as final 2027 prices. Site still displays them.

### Only in Excel, not on site
- Summer Discovery **Cornell University**: residential $8,499, commuter $4,999 (3 weeks). There is no Cornell campus in the site data.
- Summer Discovery Bryn Mawr / Fairfield gifted: half-day $2,399, full-day $3,999 (the site range 2,399–3,999 covers these).

### Only on site, not in Excel
- Oxford Royale London (£6,495 / £4,495), New York (£3,995), Oxford premium programmes (£9,995 / £7,995), Yale £9,995.
- Sportech: Milan Medicine and Rome Aerospace €5,250; football 1-/2-week tiers; Business (university) €3,000.
- Summer Discovery Dartmouth, Georgetown, UC Berkeley, Michigan, Texas, Yale.
- St Clare's and Bucksmore price lists (see summary).

### Matching detail
- MPW: 27 Jun–10 Jul, 11–24 Jul, 25 Jul–7 Aug 2027 on both sides.
- Sportech Milan/Parma/university-level and InvestIN tiers are identical.
