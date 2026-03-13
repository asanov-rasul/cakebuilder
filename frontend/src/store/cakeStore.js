import { create } from 'zustand';

const useCakeStore = create((set, get) => ({
  // Current step (1-6 = builder, 7 = order form)
  step: 1,
  totalSteps: 7,

  // Selections
  shape: null,
  size: null,
  filling: null,
  cream: null,
  decorations: [],
  cakeText: '',

  // Shop config
  shopConfig: null,

  setShopConfig: (config) => set({ shopConfig: config }),

  setShape: (shape) => set({ shape }),
  setSize: (size) => set({ size }),
  setFilling: (filling) => set({ filling }),
  setCream: (cream) => set({ cream }),
  toggleDecoration: (decoration) => {
    const { decorations } = get();
    const exists = decorations.find((d) => d.id === decoration.id);
    if (exists) {
      set({ decorations: decorations.filter((d) => d.id !== decoration.id) });
    } else {
      set({ decorations: [...decorations, decoration] });
    }
  },
  setCakeText: (text) => set({ cakeText: text }),

  nextStep: () => set((s) => ({ step: Math.min(s.step + 1, s.totalSteps) })),
  prevStep: () => set((s) => ({ step: Math.max(s.step - 1, 1) })),
  goToStep: (step) => set({ step }),

  // Price calculation
  calculatePrice: () => {
    const { shape, size, filling, cream, decorations, shopConfig } = get();
    if (!shopConfig || !size) return 0;

    const basePrice = parseFloat(shopConfig.shop.price_per_kg_base) || 15;
    const sizeMultiplier = parseFloat(size.price_multiplier) || 1;
    let price = basePrice * parseFloat(size.weight_kg) * sizeMultiplier;

    if (shape) price += parseFloat(shape.price_modifier) || 0;
    if (filling) price += parseFloat(filling.price_modifier) || 0;
    if (cream) price += parseFloat(cream.price_modifier) || 0;
    decorations.forEach((d) => { price += parseFloat(d.price) || 0; });

    return Math.round(price * 100) / 100;
  },

  getCakeConfig: () => {
    const { shape, size, filling, cream, decorations, cakeText } = get();
    return {
      shape: shape?.name,
      size_kg: size?.weight_kg,
      filling: filling?.name,
      cream: cream?.name,
      decorations: decorations.map((d) => d.name),
      text: cakeText,
    };
  },

  reset: () => set({
    step: 1,
    shape: null, size: null, filling: null,
    cream: null, decorations: [], cakeText: '',
  }),

  isStepComplete: (step) => {
    const { shape, size, filling, cream } = get();
    switch (step) {
      case 1: return !!shape;
      case 2: return !!size;
      case 3: return !!filling;
      case 4: return !!cream;
      case 5: return true; // decorations optional
      case 6: return true; // text optional
      default: return false;
    }
  },
}));

export default useCakeStore;
