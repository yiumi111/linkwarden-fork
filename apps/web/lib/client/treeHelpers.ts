import { TreeData, ItemId, TreeSourcePosition, TreeDestinationPosition, TreeItem } from "@atlaskit/tree";
import { Collection } from "@linkwarden/prisma/client";
import { CollectionIncludingMembersAndLinkCount } from "@linkwarden/types/global";

export interface ExtendedTreeItem extends TreeItem {
  data: Collection;
}

export function getTotalLinkCount(
  items: { [key: string]: ExtendedTreeItem },
  collectionId: number
): number {
  const collection = items[collectionId];
  if (!collection) {
    return 0;
  }

  let totalLinkCount = (collection.data as any)._count?.links || 0;

  if (collection.hasChildren) {
    collection.children.forEach((childId) => {
      totalLinkCount += getTotalLinkCount(items, childId as number);
    });
  }

  return totalLinkCount;
}

export function getExpandedParentIds(
  items: { [key: string]: ExtendedTreeItem },
  activeCollectionId: number
): Set<number> {
  const expandedIds = new Set<number>();
  
  if (activeCollectionId && items[activeCollectionId]) {
    let parentId = items[activeCollectionId].data.parentId || null;
    while (parentId && items[parentId]) {
      expandedIds.add(parentId);
      parentId = items[parentId].data.parentId;
    }
  }

  return expandedIds;
}

export function buildCollectionTree(
  collections: CollectionIncludingMembersAndLinkCount[],
  activeCollectionPath: string,
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

  const activeCollectionId = Number(activeCollectionPath.split("/collections/")[1]);

  if (activeCollectionId) {
    const expandedParentIds = getExpandedParentIds(items, activeCollectionId);
    expandedParentIds.forEach((id) => {
      items[id].isExpanded = true;
    });
  }

  collections.forEach((collection) => {
    const parentId = collection.parentId;
    if (parentId && items[parentId] && collection.id) {
      items[parentId].children.push(collection.id);
      items[parentId].hasChildren = true;
    }
  });

  collections.forEach((collection) => {
    const collectionId = collection.id;
    if (items[collectionId as number] && collection.id) {
      const linkCount = getTotalLinkCount(items, collectionId as number);
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
  if (source.parentId === destination.parentId) {
    const parent = tree.items[source.parentId];
    const children = [...parent.children];

    children.splice(source.index, 1);
    if (destination.index !== undefined) {
      children.splice(destination.index, 0, movedCollectionId);
    }

    parent.children = children;
    return tree;
  }

  const sourceParent = tree.items[source.parentId];
  const destinationParent = tree.items[destination.parentId];

  sourceParent.children = sourceParent.children.filter(
    (id) => id !== movedCollectionId
  );

  if (!destinationParent.children) {
    destinationParent.children = [];
  }

  const destinationIndex =
    destination.index !== undefined
      ? destination.index
      : destinationParent.children.length;

  destinationParent.children.splice(destinationIndex, 0, movedCollectionId);

  destinationParent.hasChildren = true;
  destinationParent.isExpanded = true;

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
    node.children.forEach((childId) => {
      flattenCollectionTreeIds(tree, childId, result);
    });
  }

  return result;
}

export function updateCollectionOrder(
  user: any,
  collections: CollectionIncludingMembersAndLinkCount[]
): number[] | null {
  if (!user?.username) return null;

  if ((!user.collectionOrder || user.collectionOrder.length === 0) && collections.length > 0) {
    return collections
      .filter((c) => c.parentId === null)
      .map((c) => c.id as number);
  } else {
    const existingCollectionIds = collections.map((c) => c.id as number);
    const filteredCollectionOrder = user.collectionOrder.filter((id: any) =>
      existingCollectionIds.includes(id)
    );

    collections.forEach((collection) => {
      if (
        !filteredCollectionOrder.includes(collection.id as number) &&
        (!collection.parentId || collection.ownerId === user.id)
      ) {
        filteredCollectionOrder.push(collection.id as number);
      }
    });

    if (JSON.stringify(filteredCollectionOrder) !== JSON.stringify(user.collectionOrder)) {
      return filteredCollectionOrder;
    }

    return null;
  }
}
