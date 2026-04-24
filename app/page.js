import { headers } from "next/headers";
import FundDashboard from "../components/fund-dashboard";
import { resolveRequestLanguage } from "../lib/i18n";

export default async function Page() {
  const requestHeaders = await headers();
  const language = resolveRequestLanguage(requestHeaders.get("accept-language"));

  return <FundDashboard language={language} />;
}
