import { redirect } from "next/navigation";

// Qarz endi Moliya ichidagi tab. Eski havolalar /moliya'ga yo'naltiriladi.
export default function QarzPage() {
  redirect("/moliya");
}
