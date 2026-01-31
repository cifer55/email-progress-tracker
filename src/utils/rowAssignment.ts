/**
 * Row assignment algorithm for Gantt chart rendering
 * Assigns non-overlapping rows to items that overlap in time
 */

export interface ItemWithDates {
  id: string;
  startDate: Date;
  endDate: Date;
  parentId?: string; // Optional parent ID for hierarchical layout
  type?: 'theme' | 'product' | 'feature'; // Item type for hierarchical grouping
}

export interface RowAssignment {
  itemId: string;
  row: number;
}

/**
 * Check if two date ranges overlap
 * Two ranges overlap if one starts before the other ends
 */
export function dateRangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 <= end2 && start2 <= end1;
}

/**
 * Assign rows to items such that no two items in the same row have overlapping date ranges
 * Uses a greedy algorithm that assigns each item to the first available row
 * 
 * @param items - Array of items with start and end dates
 * @returns Array of row assignments
 */
export function assignRows(items: ItemWithDates[]): RowAssignment[] {
  if (items.length === 0) {
    return [];
  }
  
  // Sort items by start date, then by end date
  const sortedItems = [...items].sort((a, b) => {
    const startDiff = a.startDate.getTime() - b.startDate.getTime();
    if (startDiff !== 0) return startDiff;
    return a.endDate.getTime() - b.endDate.getTime();
  });
  
  const assignments: RowAssignment[] = [];
  const rowEndDates: Date[] = []; // Track the end date of the last item in each row
  
  for (const item of sortedItems) {
    // Find the first row where this item doesn't overlap with the last item in that row
    let assignedRow = -1;
    
    for (let row = 0; row < rowEndDates.length; row++) {
      // Check if this item can fit in this row (starts after the last item in the row ends)
      if (item.startDate > rowEndDates[row]) {
        assignedRow = row;
        rowEndDates[row] = item.endDate;
        break;
      }
    }
    
    // If no suitable row found, create a new row
    if (assignedRow === -1) {
      assignedRow = rowEndDates.length;
      rowEndDates.push(item.endDate);
    }
    
    assignments.push({
      itemId: item.id,
      row: assignedRow
    });
  }
  
  return assignments;
}

/**
 * Assign rows to features grouped by product
 * Each product gets its own section with its features
 * Features within a product can share rows if they don't overlap
 * 
 * @param items - Array of features with parent product IDs
 * @param roadmap - Full roadmap for product/theme lookup
 * @returns Array of row assignments
 */
export function assignRowsByProduct(
  items: ItemWithDates[],
  roadmap: { themes: Array<{ id: string; products: Array<{ id: string; features: Array<{ id: string }> }> }> }
): RowAssignment[] {
  if (items.length === 0) {
    return [];
  }
  
  console.log('assignRowsByProduct: Input', {
    itemCount: items.length,
    items: items.map(i => ({ id: i.id, parentId: i.parentId }))
  });
  
  const assignments: RowAssignment[] = [];
  let currentRow = 0;
  
  // Group features by product
  const featuresByProduct = new Map<string, ItemWithDates[]>();
  for (const item of items) {
    if (item.parentId) {
      if (!featuresByProduct.has(item.parentId)) {
        featuresByProduct.set(item.parentId, []);
      }
      featuresByProduct.get(item.parentId)!.push(item);
    }
  }
  
  console.log('assignRowsByProduct: Features by product', {
    productCount: featuresByProduct.size,
    products: Array.from(featuresByProduct.keys())
  });
  
  // Get all products in order (by theme, then by product start date)
  const orderedProducts: string[] = [];
  for (const theme of roadmap.themes) {
    const sortedProducts = [...theme.products].sort((a, b) => 
      a.startDate.getTime() - b.startDate.getTime()
    );
    for (const product of sortedProducts) {
      if (featuresByProduct.has(product.id)) {
        orderedProducts.push(product.id);
      }
    }
  }
  
  console.log('assignRowsByProduct: Ordered products', orderedProducts);
  
  // Process each product's features
  for (const productId of orderedProducts) {
    const features = featuresByProduct.get(productId) || [];
    
    // Sort features by start date
    const sortedFeatures = [...features].sort((a, b) => 
      a.startDate.getTime() - b.startDate.getTime()
    );
    
    // Assign rows to features (they can share rows if they don't overlap)
    const productRowStart = currentRow;
    const rowEndDates: Date[] = [];
    
    for (const feature of sortedFeatures) {
      // Find the first row where this feature doesn't overlap
      let assignedRow = -1;
      
      for (let i = 0; i < rowEndDates.length; i++) {
        if (feature.startDate > rowEndDates[i]) {
          assignedRow = productRowStart + i;
          rowEndDates[i] = feature.endDate;
          break;
        }
      }
      
      // If no suitable row found, create a new row
      if (assignedRow === -1) {
        assignedRow = productRowStart + rowEndDates.length;
        rowEndDates.push(feature.endDate);
      }
      
      assignments.push({
        itemId: feature.id,
        row: assignedRow
      });
    }
    
    // Move to next product section
    if (rowEndDates.length > 0) {
      currentRow = productRowStart + rowEndDates.length;
    } else {
      currentRow++;
    }
  }
  
  return assignments;
}

/**
 * Get the row assignment for a specific item
 */
export function getRowForItem(
  itemId: string,
  assignments: RowAssignment[]
): number {
  const assignment = assignments.find(a => a.itemId === itemId);
  return assignment ? assignment.row : 0;
}

/**
 * Calculate the total number of rows needed
 */
export function getTotalRows(assignments: RowAssignment[]): number {
  if (assignments.length === 0) return 0;
  return Math.max(...assignments.map(a => a.row)) + 1;
}

/**
 * Group items by their assigned row
 */
export function groupItemsByRow(
  items: ItemWithDates[],
  assignments: RowAssignment[]
): Map<number, ItemWithDates[]> {
  const rowMap = new Map<number, ItemWithDates[]>();
  
  for (const assignment of assignments) {
    const item = items.find(i => i.id === assignment.itemId);
    if (item) {
      if (!rowMap.has(assignment.row)) {
        rowMap.set(assignment.row, []);
      }
      rowMap.get(assignment.row)!.push(item);
    }
  }
  
  return rowMap;
}
