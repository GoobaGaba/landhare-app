
import { redirect } from 'next/navigation';

// This page is obsolete and has been replaced by /transactions.
// This component permanently redirects any traffic from the old URL.
export default function DeprecatedEarningsPage() {
  redirect('/transactions');
}
