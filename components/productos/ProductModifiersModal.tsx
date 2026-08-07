import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { X, Plus, Trash2, CheckCircle, Tag, Sliders, Palette } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface IngredientOption {
  id: number;
  name: string;
  unitType?: string | null;
}

interface ModifierOptionState {
  uid: string;
  id?: number;
  name: string;
  priceExtra: string;
  colorHex?: string;
  ingredientId?: string;
  ingredientQty?: string;
}

interface ModifierGroupState {
  uid: string;
  id?: number;
  name: string;
  type: 'SINGLE_SELECT' | 'MULTI_SELECT' | 'SIZE_COLOR';
  isRequired: boolean;
  minSelect: string;
  maxSelect: string;
  options: ModifierOptionState[];
}

interface ProductModifiersModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: number;
  productName: string;
  businessSector?: string;
  onSuccess?: () => void;
}

const newUid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const ProductModifiersModal: React.FC<ProductModifiersModalProps> = ({
  isOpen,
  onClose,
  productId,
  productName,
  businessSector = 'GASTRONOMIA',
  onSuccess,
}) => {
  const [groups, setGroups] = useState<ModifierGroupState[]>([]);
  const [ingredients, setIngredients] = useState<IngredientOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const uidCounter = useRef(1);

  const nextUid = () => newUid() + (uidCounter.current++);

  useEffect(() => {
    if (!isOpen || !productId) return;

    setLoading(true);
    Promise.all([
      fetch(`/api/products/${productId}/modifiers`).then(r => r.ok ? r.json() : []),
      fetch('/api/products?isIngredient=true').then(r => r.ok ? r.json() : []),
    ])
      .then(([modsData, ingData]) => {
        if (Array.isArray(ingData)) setIngredients(ingData);
        if (Array.isArray(modsData) && modsData.length > 0) {
          setGroups(
            modsData.map((g: any) => ({
              uid: nextUid(),
              id: g.id,
              name: g.name,
              type: g.type || 'MULTI_SELECT',
              isRequired: Boolean(g.isRequired),
              minSelect: String(g.minSelect ?? 0),
              maxSelect: g.maxSelect !== null && g.maxSelect !== undefined ? String(g.maxSelect) : '',
              options: (g.options || []).map((o: any) => ({
                uid: nextUid(),
                id: o.id,
                name: o.name,
                priceExtra: o.priceExtra ? String(o.priceExtra) : '0',
                colorHex: o.colorHex || '#000000',
                ingredientId: o.ingredientId ? String(o.ingredientId) : '',
                ingredientQty: o.ingredientQty !== null && o.ingredientQty !== undefined ? String(o.ingredientQty) : '1',
              })),
            }))
          );
        } else {
          setGroups(getPresetsForSector(businessSector));
        }
      })
      .catch(err => console.error("Error al cargar modificadores:", err))
      .finally(() => setLoading(false));
  }, [isOpen, productId, businessSector]);

  if (!isOpen) return null;

  function getPresetsForSector(sector: string): ModifierGroupState[] {
    if (sector === 'INDUMENTARIA') {
      return [
        {
          uid: nextUid(),
          name: 'Color',
          type: 'SIZE_COLOR',
          isRequired: true,
          minSelect: '1',
          maxSelect: '1',
          options: [
            { uid: nextUid(), name: 'Negro', priceExtra: '0', colorHex: '#000000' },
            { uid: nextUid(), name: 'Blanco', priceExtra: '0', colorHex: '#FFFFFF' },
            { uid: nextUid(), name: 'Azul', priceExtra: '0', colorHex: '#2563EB' },
          ]
        },
        {
          uid: nextUid(),
          name: 'Talle',
          type: 'SINGLE_SELECT',
          isRequired: true,
          minSelect: '1',
          maxSelect: '1',
          options: [
            { uid: nextUid(), name: 'S', priceExtra: '0' },
            { uid: nextUid(), name: 'M', priceExtra: '0' },
            { uid: nextUid(), name: 'L', priceExtra: '0' },
            { uid: nextUid(), name: 'XL', priceExtra: '0' },
          ]
        }
      ];
    }
    return [
      {
        uid: nextUid(),
        name: 'Punto de Cocción',
        type: 'SINGLE_SELECT',
        isRequired: true,
        minSelect: '1',
        maxSelect: '1',
        options: [
          { uid: nextUid(), name: 'Jugoso', priceExtra: '0' },
          { uid: nextUid(), name: 'A punto', priceExtra: '0' },
          { uid: nextUid(), name: 'Bien Cocido', priceExtra: '0' },
        ]
      },
      {
        uid: nextUid(),
        name: 'Agregados / Extras',
        type: 'MULTI_SELECT',
        isRequired: false,
        minSelect: '0',
        maxSelect: '',
        options: [
          { uid: nextUid(), name: 'Extra Queso Cheddar', priceExtra: '500' },
          { uid: nextUid(), name: 'Extra Bacon', priceExtra: '600' },
        ]
      }
    ];
  }

  const updateGroup = (gUid: string, patch: Partial<ModifierGroupState>) => {
    setGroups(prev => prev.map(g => (g.uid === gUid ? { ...g, ...patch } : g)));
  };

  const updateOption = (gUid: string, oUid: string, patch: Partial<ModifierOptionState>) => {
    setGroups(prev => prev.map(g =>
      g.uid === gUid
        ? { ...g, options: g.options.map(o => (o.uid === oUid ? { ...o, ...patch } : o)) }
        : g
    ));
  };

  const handleAddGroup = () => {
    setGroups(prev => [
      ...prev,
      {
        uid: nextUid(),
        name: '',
        type: 'MULTI_SELECT',
        isRequired: false,
        minSelect: '0',
        maxSelect: '',
        options: [{ uid: nextUid(), name: '', priceExtra: '0' }]
      }
    ]);
  };

  const handleRemoveGroup = (gUid: string) => {
    setGroups(prev => prev.filter(g => g.uid !== gUid));
  };

  const handleAddOption = (gUid: string) => {
    setGroups(prev => prev.map(g =>
      g.uid === gUid
        ? { ...g, options: [...g.options, { uid: nextUid(), name: '', priceExtra: '0' }] }
        : g
    ));
  };

  const handleRemoveOption = (gUid: string, oUid: string) => {
    setGroups(prev => prev.map(g =>
      g.uid === gUid
        ? { ...g, options: g.options.filter(o => o.uid !== oUid) }
        : g
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const res = await fetch(`/api/products/${productId}/modifiers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groups })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error al guardar variantes.');
      }

      toast.success('Opciones y variantes guardadas correctamente.');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        className="bg-background text-foreground border border-border w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/60">
          <div className="flex items-center gap-2 font-bold text-base">
            <Sliders size={20} className="text-primary" />
            <span>Personalizar Variantes & Modificadores</span>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium ml-2">
              {productName}
            </span>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-foreground-muted hover:bg-muted hover:text-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden p-5 space-y-4">
          {loading ? (
            <div className="py-12 text-center text-foreground-muted animate-pulse">Cargando opciones...</div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-1 space-y-6">
              {groups.length === 0 ? (
                <div className="text-center py-10 bg-muted/30 border border-dashed border-border rounded-xl space-y-3">
                  <Tag size={40} className="mx-auto text-foreground-muted" />
                  <p className="font-semibold text-foreground">Sin grupos de opciones configurados.</p>
                  <p className="text-xs text-foreground-muted max-w-sm mx-auto">
                    Agregá grupos como "Término de la carne", "Agregados extras", "Talles S/M/L" o "Colores".
                  </p>
                  <Button type="button" variant="outline" onClick={handleAddGroup} className="mt-2">
                    <Plus size={16} className="mr-1.5" /> Agregar primer grupo
                  </Button>
                </div>
              ) : (
                groups.map((grp) => (
                  <div key={grp.uid} className="bg-muted/30 border border-border rounded-2xl p-4 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input
                          label="Nombre del Grupo (*)"
                          placeholder="Ej: Punto de Cocción, Talles, Agregados"
                          value={grp.name}
                          onChange={e => updateGroup(grp.uid, { name: e.target.value })}
                          required
                        />

                        <div>
                          <label className="block text-xs font-bold text-foreground mb-1">Tipo de Selección</label>
                          <select
                            className="w-full p-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/50"
                            value={grp.type}
                            onChange={e => updateGroup(grp.uid, { type: e.target.value as any })}
                          >
                            <option value="MULTI_SELECT">Selección Múltiple (Checkboxes / Extras)</option>
                            <option value="SINGLE_SELECT">Selección Única (Radio Buttons / Término)</option>
                            <option value="SIZE_COLOR">Muestras de Color & Talles (Indumentaria)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-foreground mb-1">Mínimo a elegir</label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0"
                            className="w-full p-2 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/50"
                            value={grp.minSelect}
                            onChange={e => updateGroup(grp.uid, { minSelect: e.target.value })}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-foreground mb-1">Máximo a elegir (vacío = sin límite)</label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            placeholder="Sin límite"
                            className="w-full p-2 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/50"
                            value={grp.maxSelect}
                            onChange={e => updateGroup(grp.uid, { maxSelect: e.target.value })}
                          />
                        </div>

                        <div className="flex items-center gap-3 md:col-span-2">
                          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={grp.isRequired}
                              onChange={e => updateGroup(grp.uid, { isRequired: e.target.checked })}
                              className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary"
                            />
                            Selección Obligatoria
                          </label>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveGroup(grp.uid)}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded-xl transition-colors shrink-0"
                        title="Eliminar grupo"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    {/* Opciones dentro del grupo */}
                    <div className="space-y-2 pt-2 border-t border-border/60">
                      <div className="flex items-center justify-between text-xs font-bold text-foreground-muted px-1">
                        <span>Opciones / Variantes del grupo</span>
                        <span>Precio Extra ($)</span>
                      </div>

                      {grp.options.map((opt) => (
                        <div key={opt.uid} className="flex items-center gap-3">
                          <input
                            type="text"
                            placeholder="Ej: Extra Bacon, A punto, Talle L"
                            className="flex-1 p-2 rounded-xl border border-border bg-background text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/50"
                            value={opt.name}
                            onChange={e => updateOption(grp.uid, opt.uid, { name: e.target.value })}
                            required
                          />

                          {grp.type === 'SIZE_COLOR' && (
                            <div className="flex items-center gap-1.5 shrink-0 bg-background border border-border px-2 py-1 rounded-xl">
                              <Palette size={16} className="text-foreground-muted" />
                              <input
                                type="color"
                                value={opt.colorHex || '#000000'}
                                onChange={e => updateOption(grp.uid, opt.uid, { colorHex: e.target.value })}
                                className="w-6 h-6 border-0 bg-transparent cursor-pointer"
                                title="Color de la muestra"
                              />
                            </div>
                          )}

                          <div className="w-28 shrink-0">
                            <input
                              type="number"
                              placeholder="0"
                              min="0"
                              step="0.01"
                              className="w-full p-2 rounded-xl border border-border bg-background text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/50 text-right"
                              value={opt.priceExtra}
                              onChange={e => updateOption(grp.uid, opt.uid, { priceExtra: e.target.value })}
                            />
                          </div>

                          {/* Vinculación opcional con ingrediente del Recetario */}
                          {ingredients.length > 0 && (
                            <select
                              className="w-36 p-2 rounded-xl border border-border bg-background text-xs text-foreground outline-none shrink-0"
                              value={opt.ingredientId || ''}
                              onChange={e => updateOption(grp.uid, opt.uid, { ingredientId: e.target.value })}
                              title="Ingrediente a descontar del Recetario al vender este extra"
                            >
                              <option value="">-- Sin ingrediente --</option>
                              {ingredients.map(ing => (
                                <option key={ing.id} value={ing.id}>
                                  {ing.name}
                                </option>
                              ))}
                            </select>
                          )}

                          {/* Cantidad a descontar del ingrediente vinculado */}
                          {opt.ingredientId && (
                            <div className="w-20 shrink-0">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="Cantidad a descontar"
                                title="Cantidad a descontar del ingrediente al vender este extra"
                                className="w-full p-2 rounded-xl border border-border bg-background text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/50 text-center"
                                value={opt.ingredientQty}
                                onChange={e => updateOption(grp.uid, opt.uid, { ingredientQty: e.target.value })}
                              />
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoveOption(grp.uid, opt.uid)}
                            className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors shrink-0"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}

                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => handleAddOption(grp.uid)}
                        className="text-xs text-primary hover:bg-primary/10 mt-1"
                      >
                        <Plus size={14} className="mr-1" /> Agregar Opción
                      </Button>
                    </div>
                  </div>
                ))
              )}

              {groups.length > 0 && (
                <Button type="button" variant="outline" onClick={handleAddGroup} className="w-full">
                  <Plus size={16} className="mr-1.5" /> Agregar Nuevo Grupo de Opciones
                </Button>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border shrink-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isProcessing} className="flex items-center gap-2">
              <CheckCircle size={18} />
              Guardar Modificadores
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductModifiersModal;
