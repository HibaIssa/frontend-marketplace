import { redirect } from 'next/navigation'

/** Legacy path — DSR overview now lives under `/admin`. */
export default function DashboardProductsRedirectPage() {
  redirect('/admin')
}
