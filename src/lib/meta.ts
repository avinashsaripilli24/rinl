/** Static facts from the RFP (NLMC/Legal/Auction/RFP-2026 dated 31.08.2026) and the Main List header. */

export const RFP = {
  number: 'NLMC/Legal/Auction/RFP-2026',
  dated: '31.08.2026',
  location: 'HB Colony-Maddilapalem and Auto Nagar-Gajuwaka, Visakhapatnam',
  totalPlots: 459,
}

export const SCHEDULE = [
  { date: '31.08.2026', label: 'Advertisement released; RFP downloadable; site inspection opens (office hours)' },
  { date: '23.09.2026', label: 'Last day to email pre-bid queries (2 days before the meeting)' },
  { date: '25.09.2026', label: 'Pre-bid meeting, 11:00 (RINL HQ, with video-conference option)' },
  { date: '06.10.2026', label: 'Mock e-auction available from 11:00 (contact the RailTel helpdesk)' },
  { date: '08.10.2026', label: 'Day 1 plots: last date for registration & EMD, 17:00' },
  { date: '12.10.2026', label: 'Day 1 e-auction, 11:00 to 19:00 plus auto-extensions' },
  { date: '14.10.2026', label: 'Day 2 plots: last date for registration & EMD, 17:00' },
  { date: '16.10.2026', label: 'Day 2 e-auction, 11:00 to 19:00 plus auto-extensions' },
]

/** Plain-language walkthrough of the e-auction, for first-time bidders. */
export const PROCESS: { title: string; body: string }[] = [
  { title: 'Register and pay the EMD', body: 'Sign up on eauction.enivida.com and pay the ₹2 lakh EMD online by 17:00 on the last date for your plot’s day. Without it you cannot bid.' },
  { title: 'Practise on the mock auction', body: 'From 06.10.2026 the portal runs a mock e-auction. Use it to learn the bid screen, and to see exactly what it shows you about other bids.' },
  { title: 'The auction opens at 11:00', body: 'Each plot starts at its reserve rate per sq.yd. Your first bid must be at least one step (₹1,000) above the reserve.' },
  { title: 'Bids go up in ₹1,000 steps', body: 'Every new bid must beat the current highest rate. Whoever has the highest rate at that moment is H-1; the next is H-2, and so on.' },
  { title: 'Closing at 19:00, unless someone bids late', body: 'A bid in the last 10 minutes pushes closing out by 10 minutes. This repeats until 10 minutes pass with no new bid, so the real end time can be well after 19:00.' },
  { title: 'Whoever is H-1 at the close wins', body: 'Your price is your final rate × the plot area. The EMD of everyone else is refunded within 7 working days.' },
  { title: 'Paperwork and fees (within 7 days)', body: 'Email Annex V–VIII, then post hard copies within 15 days. Pay the 0.1% processing fee + 18% GST within 7 working days of being H-1, or the EMD may be forfeited.' },
  { title: 'Letter of Acceptance, then pay', body: 'RINL issues the LoA. Pay 10% within 7 days of it and the balance within 45 days (75 with 12% interest). Then comes the sale deed, and possession after that.' },
]

export const GLOSSARY: { term: string; meaning: string; example: string }[] = [
  { term: 'H-1', meaning: 'Highest bidder: the person with the top bid on a plot right now. The one who is H-1 when bidding closes wins the plot.', example: 'A bids ₹1,05,000, B ₹1,04,000, C ₹1,02,000 → A is H-1.' },
  { term: 'H-2, H-3…', meaning: 'Second highest, third highest and so on. They win nothing, and their EMD is refunded.', example: 'In the same bids, B is H-2 and C is H-3. If B now bids ₹1,06,000, B becomes H-1 and A drops to H-2.' },
  { term: 'Reserve rate', meaning: 'RINL’s minimum rate per sq.yd. Bidding starts from here and can only go up.', example: 'Reserve ₹1,00,000/sq.yd → no bid below ₹1,01,000 is accepted.' },
  { term: 'Bid step', meaning: 'The minimum increase: ₹1,000 per sq.yd. You can jump by several steps at once.', example: 'H-1 is ₹1,04,000 → you may bid ₹1,05,000 or jump to ₹1,10,000, but not ₹1,04,500.' },
  { term: 'Bid value', meaning: 'Your rate per sq.yd × the plot area. Fees and instalments are worked out from this.', example: '₹1,05,000 × 250 sq.yd = ₹2.625 crore. One extra step on this plot adds ₹2.5 lakh.' },
  { term: 'EMD', meaning: 'Earnest Money Deposit, ₹2 lakh. It lets you bid, counts towards the price if you win, and is refunded if you lose. One EMD = H-1 on one plot at a time.', example: 'Win a ₹2.06 crore plot → you owe ₹2.04 crore more. Lose → the ₹2 lakh comes back within 7 working days.' },
  { term: 'Auto-extension', meaning: 'A bid in the final 10 minutes adds 10 more minutes, so nobody can snipe the plot at 18:59.', example: 'Bid at 18:58 → closing moves to 19:08. Another bid at 19:06 → 19:16, and so on.' },
  { term: 'LoA', meaning: 'Letter of Acceptance: RINL’s formal confirmation to the H-1 bidder. The payment deadlines count from its date.', example: 'LoA on 1 Nov → 10% due by about 8 Nov, the balance about 45 days later (Sundays/holidays excluded).' },
]

/** More what-if scenarios, shown after the main worked example. */
export const SCENARIOS: { title: string; steps: { time: string; text: string }[]; result: string }[] = [
  {
    title: 'You get outbid and stop',
    steps: [
      { time: '11:10', text: 'You bid ₹1,01,000 on a 150 sq.yd plot (reserve ₹1,00,000). You are H-1.' },
      { time: '16:40', text: 'Someone bids ₹1,08,000. That is above your budget, so you stop. You are now H-2.' },
      { time: '19:00', text: 'No bids in the last 10 minutes, so the auction closes on time.' },
    ],
    result: 'The other bidder wins. You pay nothing, and your ₹2 lakh EMD is refunded within 7 working days.',
  },
  {
    title: 'One EMD, two plots you like',
    steps: [
      { time: '11:00', text: 'You paid one EMD (₹2 lakh). You bid on Plot A and become H-1.' },
      { time: '12:00', text: 'You try to bid on Plot B. The portal blocks it: with one EMD you can be H-1 on only one plot.' },
      { time: '15:20', text: 'Someone outbids you on Plot A. You are free again, and you bid on Plot B and become H-1 there.' },
    ],
    result: 'To stay H-1 on both plots at once, you need two EMDs (₹4 lakh) before the deadline.',
  },
  {
    title: 'A bidding war runs past 19:00',
    steps: [
      { time: '18:52', text: 'You bid ₹1,10,000. Closing moves from 19:00 to 19:02.' },
      { time: '19:01', text: 'The rival bids ₹1,11,000. Closing moves to 19:11.' },
      { time: '19:09', text: 'You bid ₹1,12,000. Closing moves to 19:19.' },
      { time: '19:19', text: 'The rival does not bid again.' },
    ],
    result: 'You win at ₹1,12,000/sq.yd. Decide your top rate before the day, because a war like this can go on for a long time.',
  },
]

export const RULES: { title: string; body: string }[] = [
  { title: 'Bidding is per sq.yd', body: 'You bid a rate per sq.yd above the reserve rate, in steps of ₹1,000 (e.g. reserve ₹1,00,000 → ₹1,01,000, ₹1,02,000…). No decimals.' },
  { title: 'Auto-extension', body: 'Any bid in the last 10 minutes extends closing by 10 minutes, repeating until 10 minutes pass with no new bid.' },
  { title: 'EMD ₹2 lakh per plot you want to win', body: 'One EMD lets you bid on every plot, but you can be H-1 on only as many plots as EMDs paid. Once you are H-1 on one plot with a single EMD, you cannot keep bidding elsewhere until you are outbid. Paid online only on eauction.enivida.com.' },
  { title: 'After you are H-1', body: 'Within 7 days email the Power of Attorney (Annex V, if applicable), Authorization (Annex VI), Consortium Agreement (Annex VII) and Affidavit (Annex VIII) to rinl_landm1/landm2@vizagsteel.com; post hard copies within 15 days. Pay the 0.1% processing fee + GST within 7 working days or the EMD may be forfeited.' },
  { title: 'Payment schedule', body: '10% within 7 days of the Letter of Acceptance; balance within 45 days; 30 more days allowed at 12% p.a. interest from the LoA date. Miss that and the LoA is cancelled and all money is forfeited.' },
  { title: 'Paying with a bank loan', body: 'Clause 5.6 bars any mortgage or charge on the plot until the sale deed is registered, but 100% of the price is due within 45 days of the LoA (75 with 12% interest). The EMD and the 10% instalment must come from your own money. Before you bid, ask RINL and your bank whether the bank can pay RINL directly on an NOC/tripartite basis. If not, arrange a bridge for the balance and take the plot loan after the deed.' },
  { title: 'Sale deed & possession', body: 'RINL intends to register the sale deed within ~90 days of full payment and hand over possession within ~15 days of the deed. Delay in taking possession: holding charges ₹100/sq.yd/month.' },
  { title: 'Area variance', body: 'Areas come from 1980s VUDA/APHB/APIIC deeds and are indicative. You may survey at your cost before the final instalment; price is re-worked at your bid rate. If the area differs by more than 25% you may withdraw with a refund (no interest).' },
  { title: 'Before registration', body: 'No construction, clearing, fencing, resale, lease or mortgage until the sale deed is executed and possession handed over.' },
  { title: 'As-is, where-is', body: 'Caveat emptor. Utilities (power, water, drainage) and any shifting of lines passing through the plot are the buyer’s job and cost. Stamp duty, registration, betterment charges and property tax are extra.' },
  { title: 'Who can bid', body: 'Individuals (incl. NRIs, paying in INR), firms, LLPs, companies, trusts, societies, govt bodies. Consortium: max 3 members, each ≥20%, lead ≥41%; must form an SPV before the sale deed. No minors; no real-estate agents as representatives.' },
]

export type Contact = { org: string; name: string; role?: string; phones: string[]; emails: string[] }
export const CONTACTS: Contact[] = [
  { org: 'RINL (site inspection)', name: 'N. Sundaram', role: 'DGM (TA) Land & Estate', phones: ['8555066168'], emails: ['rinl_landm1@vizagsteel.com', 'rinl_landm2@vizagsteel.com'] },
  { org: 'RINL', name: 'Pradeep Kumar', role: 'Sr. Manager (Admn.)', phones: ['9650453592'], emails: [] },
  { org: 'RINL', name: 'S. Balaraju', role: 'Manager (Admn.)', phones: ['9392907320'], emails: [] },
  { org: 'RINL (property owner desk)', name: 'Main List header', phones: ['9849091798', '9392907320'], emails: ['rinl_landm1@vizagsteel.com', 'rinl_landm2@vizagsteel.com', 'balu54108@vizagsteel.com'] },
  { org: 'RailTel e-auction helpdesk', name: 'Gagan', phones: ['8448288987', '01149606060'], emails: ['eprochelpdesk.01@gmail.com'] },
  { org: 'RailTel e-auction helpdesk', name: 'Nitin', phones: ['8448288986'], emails: ['eprochelpdesk.44@gmail.com'] },
  { org: 'RailTel e-auction helpdesk', name: 'Chaitanya', phones: ['8448288985'], emails: ['eprochelpdesk.03@gmail.com'] },
  { org: 'Quikr (transaction consultant)', name: 'Winnie Manoj', phones: ['9321575329'], emails: ['auctions@quikr.com', 'winnie.manoj@quikr.com'] },
  { org: 'Quikr (transaction consultant)', name: 'Amrish', phones: ['9930504931'], emails: ['amrishv@quikr.com'] },
  { org: 'NLMC (project facilitator)', name: 'Lolark Shukla', phones: ['9420479930'], emails: [] },
  { org: 'NLMC (project facilitator)', name: 'Chetan Choudhary', phones: ['9999109046'], emails: [] },
  { org: 'NLMC', name: 'Email (pre-bid queries)', phones: [], emails: ['agm-finance-nlmc@gov.in', 'am-nlmc@gov.in'] },
  { org: 'Union Bank of India (banking partner)', name: 'Steel Plant Township branch', phones: ['7979848314'], emails: ['ubin0809551@unionbankofindia.bank.in'] },
]

export const BANK = {
  bank: 'Union Bank of India',
  branch: 'Steel Plant Township Branch, Sector 5, Ukkunagaram, Visakhapatnam 530032',
  ifsc: 'UBIN0809551',
  micr: '530026060',
  swift: 'UBININBBVIS',
  pan: 'AABCR0435L',
  type: 'Current Account',
  accounts: [
    { for: 'Annexure I plots (12 Oct auction)', name: 'ESCROW-RINL-VSP-PHASE-1', number: '095511010000083' },
    { for: 'Annexure II plots (16 Oct auction)', name: 'ESCROW-RINL-VSP-PHASE-2', number: '095511010000084' },
  ],
  note: 'All payments except EMD and the processing fee go here by RTGS/NEFT. EMD and fee are paid on eauction.enivida.com.',
}

export const LINKS = [
  { label: 'RailTel e-auction portal (register, EMD, bid)', url: 'https://eauction.enivida.com' },
  { label: 'Quikr auctions', url: 'https://auctions.quikr.com' },
  { label: 'Vizag Steel (RINL)', url: 'https://www.vizagsteel.com' },
  { label: 'NLMC', url: 'https://www.nlmc.dpe.gov.in' },
]

export const DATA_NOTES = [
  'Plot dimensions are not published; sizes shown as "est." assume a ~1 : 1.47 frontage-to-depth ratio with the frontage on the facing road.',
  'Facing is derived from the road side(s) given in the RFP. Corner plots take the best vastu combination of their road sides.',
  'Where the Main List and RFP disagree, the Main List is used and the plot shows a ⚠ note.',
  'Stamp duty/registration (~7.5%) is an Andhra Pradesh estimate, not an RFP figure. Confirm with the Sub-Registrar.',
]
