import { redirect } from 'next/navigation'
import { getAdminCatalogPageUrl, hostedCatalogNavEnabled } from '@/lib/admin/adminApiOrigin'

/** Admin UI is catalog-only; landing sends admins straight to the database overview. */
export default function AdminRootPage() {
  if (hostedCatalogNavEnabled()) {
    redirect(getAdminCatalogPageUrl())
  }
  redirect('/admin/catalog')
}
