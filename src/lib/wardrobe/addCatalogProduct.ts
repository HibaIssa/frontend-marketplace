import type { Product } from '@/types/product'
import type { WardrobeItemDto } from '@/types/wardrobeItem'
import { resolvePrimaryImageUrl } from '@/lib/productImage'
import { postWardrobeItemForm } from '@/lib/wardrobe/postWardrobeItem'

/** POST /api/wardrobe/items without a file — links a catalog product (source `linked`). Returns the created item. */
export async function addCatalogProductToWardrobe(product: Product): Promise<WardrobeItemDto> {
  const fd = new FormData()
  fd.append('source', 'linked')
  fd.append('product_id', String(product.id))
  fd.append('name', product.title)
  if (product.brand) fd.append('brand', product.brand)
  const img = resolvePrimaryImageUrl(product)
  if (img) fd.append('image_url', img)
  const res = await postWardrobeItemForm<WardrobeItemDto>(fd)
  const r = res as { success?: boolean; data?: WardrobeItemDto; error?: { message?: string } }
  if (r.success === false) throw new Error(r.error?.message ?? 'Could not add to wardrobe')
  if (!r.data) throw new Error('No data returned from wardrobe add')
  return r.data
}
