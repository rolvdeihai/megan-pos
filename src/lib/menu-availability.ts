type InventoryRelation =
  | {
      name?: string | null;
      current_stock?: number | null;
    }
  | Array<{
      name?: string | null;
      current_stock?: number | null;
    }>
  | null
  | undefined;

type RecipeRow = {
  menu_item_id: string;
  quantity?: number | null;
  quantity_required?: number | null;
  inventory?: InventoryRelation;
};

type MenuItemLike = {
  id: string;
  is_available: boolean;
};

export type MenuAvailabilityFields = {
  effective_is_available: boolean;
  sold_out_reason: string | null;
  ingredient_stock_issue: boolean;
};

const getInventory = (inventory: InventoryRelation) => {
  if (Array.isArray(inventory)) {
    return inventory[0] || null;
  }

  return inventory || null;
};

export function applyIngredientAvailability<T extends MenuItemLike>(
  menuItems: T[],
  recipeRows: RecipeRow[]
): Array<T & MenuAvailabilityFields> {
  const recipeMap = new Map<string, RecipeRow[]>();

  for (const recipe of recipeRows) {
    const existing = recipeMap.get(recipe.menu_item_id) || [];
    existing.push(recipe);
    recipeMap.set(recipe.menu_item_id, existing);
  }

  return menuItems.map((item) => {
    if (!item.is_available) {
      return {
        ...item,
        effective_is_available: false,
        sold_out_reason: 'Menu sedang tidak tersedia',
        ingredient_stock_issue: false,
      };
    }

    const recipes = recipeMap.get(item.id) || [];

    const blockedRecipe = recipes.find((recipe) => {
      const inventory = getInventory(recipe.inventory);
      const currentStock = Number(inventory?.current_stock) || 0;
      const requiredQuantity = Number(recipe.quantity ?? recipe.quantity_required) || 0;

      return requiredQuantity > 0 && currentStock < requiredQuantity;
    });

    if (!blockedRecipe) {
      return {
        ...item,
        effective_is_available: true,
        sold_out_reason: null,
        ingredient_stock_issue: false,
      };
    }

    const inventory = getInventory(blockedRecipe.inventory);
    const ingredientName = inventory?.name || 'bahan baku';

    return {
      ...item,
      effective_is_available: false,
      sold_out_reason: `Habis karena bahan ${ingredientName} kosong`,
      ingredient_stock_issue: true,
    };
  });
}
