import { TreeData, ItemId, TreeSourcePosition, TreeDestinationPosition, TreeItem } from "@atlaskit/tree";
import { Collection } from "@linkwarden/prisma/client";
import { CollectionIncludingMembersAndLinkCount } from "@linkwarden/types/global";

export interface ExtendedTreeItem extends TreeItem {
  data: Collection;
}

export function buildCollectionTree(
  collections: CollectionIncludingMembersAndLinkCount[],
  activeCollectionId?: number,
  tree?: TreeData,
  order?: number[]
): TreeData {
  if (order) {
    collections.sort((a: any, b: any) => {
      return order.indexOf(a.id) - order.indexOf(b.id);
    });
  }

  const items: { [key: string]: ExtendedTreeItem } = collections.reduce(
    (acc: any, collection) => {
      acc[collection.id as number] = {
        id: collection.id,
        children: [],
        hasChildren: false,
        isExpanded: tree?.items[collection.id as number]?.isExpanded || false,
        data: {
          id: collection.id,
          parentId: collection.parentId,
          name: collection.name,
          description: collection.description,
          color: collection.color,
          icon: collection.icon,
          iconWeight: collection.iconWeight,
          isPublic: collection.isPublic,
          ownerId: collection.ownerId,
          createdAt: collection.createdAt,
          updatedAt: collection.updatedAt,
          _count: {
            links: collection._count?.links,
          },
        },
      };
      return acc;
    },
    {}
  );

  if (activeCollectionId) {
    for (const item in items) {
      const collection = items[item];
      if (Number(item) === activeCollectionId && collection.data.parentId) {
        // get all the parents of the active collection recursively until root and set isExpanded to true
        let parentId = collection.data.parentId || null;
        while (parentId && items[parentId]) {
          items[parentId].isExpanded = true;
          parentId = items[parentId].data.parentId;
        }
      }
    }
  }

  collections.forEach((collection) => {
    const parentId = collection.parentId;
    if (parentId && items[parentId] && collection.id) {
      items[parentId].children.push(collection.id);
      items[parentId].hasChildren = true;
    }
  });

  function getTotalLinkCount(collectionId: number): number {
    const collection = items[collectionId];
    if (!collection) {
      return 0;
    }

    let totalLinkCount = (collection.data as any)._count?.links || 0;

    if (collection.hasChildren) {
      collection.children.forEach((childId: any) => {
        totalLinkCount += getTotalLinkCount(childId as number);
      });
    }

    return totalLinkCount;
  }

  collections.forEach((collection) => {
    const collectionId = collection.id;
    if (items[collectionId as number] && collection.id) {
      const linkCount = getTotalLinkCount(collectionId as number);
      (items[collectionId as number].data as any)._count.links = linkCount;
    }
  });

  const rootId = "root";
  items[rootId] = {
    id: rootId,
    children: (collections
      .filter(
        (c) =>
          c.parentId === null || !collections.find((i) => i.id === c.parentId)
      )
      .map((c) => c.id) || "") as unknown as string[],
    hasChildren: true,
    isExpanded: true,
    data: { name: "Root" } as Collection,
  };

  return { rootId, items };
}

export function reorderCollectionTree(
  tree: TreeData,
  movedCollectionId: ItemId,
  source: TreeSourcePosition,
  destination: TreeDestinationPosition
): TreeData {
  // Same parent reordering
  if (source.parentId === destination.parentId) {
    const parent = tree.items[source.parentId];
    const children = [...parent.children];

    // Remove from source index
    children.splice(source.index, 1);
    // Insert at destination index
    if (destination.index !== undefined) {
      children.splice(destination.index, 0, movedCollectionId);
    }

    parent.children = children;
    return tree;
  }

  // Different parent move
  const sourceParent = tree.items[source.parentId];
  const destinationParent = tree.items[destination.parentId];

  // Remove from source parent
  sourceParent.children = sourceParent.children.filter(
    (id: any) => id !== movedCollectionId
  );

  // Initialize children array if it doesn't exist
  if (!destinationParent.children) {
    destinationParent.children = [];
  }

  // If destination index is not specified, add to the end
  const destinationIndex =
    destination.index !== undefined
      ? destination.index
      : destinationParent.children.length;

  // Add to destination parent
  destinationParent.children.splice(destinationIndex, 0, movedCollectionId);

  // Update destination parent properties
  destinationParent.hasChildren = true;
  destinationParent.isExpanded = true;

  // Update the moved item's parent ID
  tree.items[movedCollectionId].data.parentId = destination.parentId;

  return tree;
}

export function flattenCollectionTreeIds(
  tree: TreeData,
  nodeId: ItemId = "root",
  result: Array<ItemId> = []
): Array<ItemId> {
  const node = tree.items[nodeId];

  if (nodeId !== "root") {
    result.push(node.id);
  }

  if (node.children && node.children.length > 0) {
    node.children.forEach((childId: any) => {
      flattenCollectionTreeIds(tree, childId, result);
    });
  }

  return result;
}
