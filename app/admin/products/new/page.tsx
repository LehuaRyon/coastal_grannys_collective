import ProductForm from '../ProductForm';

export default function NewProductPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-stone-900">New Product</h1>
        <p className="text-sm text-stone-500 mt-1">Add a new coffee, subscription, or merch item.</p>
      </div>
      <ProductForm />
    </div>
  );
}
