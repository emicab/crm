
import CategoryForm from '@/components/categorias/CategoryForm';

export default function NuevaCategoriaPage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground">Agregar Nueva Categoría</h1>
        <p className="mt-1 text-foreground-muted">
          Completa el nombre de la nueva categoría.
        </p>
      </div>
      
      <CategoryForm /> 
    </>
  );
}