import { redirect } from 'next/navigation'

export default function DashboardAlertsRedirectPage() {
  redirect('/admin/alerts')
}
