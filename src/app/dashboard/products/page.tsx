import { redirect } from 'next/navigation'

/** Legacy path — main overview lists products by risk at `/dashboard`. */
export default function DashboardProductsRedirectPage() {
  redirect('/dashboard')
}
