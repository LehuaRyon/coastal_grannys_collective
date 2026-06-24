import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import ProductForm from '../ProductForm';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) notFound();
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-stone-900">Edit Product</h1>
        <p className="text-sm text-stone-500 mt-1">{product.name}</p>
      </div>
      <ProductForm product={product} />
    </div>
  );
}
