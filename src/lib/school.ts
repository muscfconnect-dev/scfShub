/* The university's own published details, shown on the official links page.
   Re-check these against https://madukauniversity.edu.ng and update the date when you do. */
export const SCHOOL_SITE = "https://madukauniversity.edu.ng";
export const OFFICIAL_CHECKED_ON = "16 October 2026";
export const SCHOOL_CONTACT = {
  generalEmail: "info@madukauniversity.edu.ng",
  admissionsEmail: "admissions@madukauniversity.edu.ng",
  phones: ["08055091802", "09157893107"],
  address: "Along Nsukka–Enugu New Road, Ekwegbe, Enugu State, Nigeria",
};
export const toTel = (n: string) => `tel:+234${n.replace(/^0/, "")}`;
