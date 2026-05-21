import {
  TreeData,
  TreeItem,
  ItemId,
  TreeSourcePosition,
  TreeDestinationPosition,
} from "@atlaskit/tree";
import { Collection } from "@linkwarden/prisma/client";
import { CollectionIncludingMembersAndLinkCount } from "@linkwarden/types/global";

export interface CollectionTreeItem extends TreeItem {
  data: Collection;
}

export function calculateSubtreeLinkCount(
  items: Record<string, CollectionTreeItem>,
  nodeId: ItemId
): number {
  const node = items[nodeId];
  if (!node) return 0;

  let total = (node.data as any)._count?.links || 0;

  if (node.children && node.children.length > 0) {
    for (const childId of node.children) {
      total += calculateSubtreeLinkCount(items, childId);
    }
  }

  return total;
}

export function getExpandedParentIds(
  items: Record<string, CollectionTreeItem>,
  activeCollectionId: number
): ItemId[] {
  const parentIds: ItemId[] = [];
  const node = items[activeCollectionId];
  if (!node) return parentIds;

  let parentId = node.data.parentId;
  while (parentId && items[parentId]) {
    parentIds.push(parentId);
    parentId = items[parentId].data.parentId;
  }

  return parentIds;
}

export function buildCollectionTree(
  collections: CollectionIncludingMembersAndLinkCount[],
  order?: number[]
): TreeData {
  let sortedCollections = [...collections];

  if (order && order.length > 0) {
    sortedCollections.sort((a: any, b: any) => {
      const aIdx = order.indexOf(a.id);
      const bIdx = order.indexOf(b.id);
      if (aIdx === -1 && bIdx === -1) return 0;
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });
  }

  const items: Record<string, CollectionTreeItem> = {};

  for (const collection of collections) {
    items[collection.id as number] = {
      id: collection.id,
      children: [],
      hasChildren: false,
      isExpanded: false,
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
          links: collection._count?.links || 0,
        },
      } as Collection,
    };
  }

  collections.forEach((collection) => {
    const parentId = collection.parentId;
    if (parentId && items[parentId] && collection.id) {
      items[parentId].children.push(collection.id);
      items[parentId].hasChildren = true;
    }
  });

  for (const collectionId of Object.keys(items)) {
    const linkCount = calculateSubtreeLinkCount(items, collectionId);
    (items[collectionId].data as any)._count.links = linkCount;
  }

  items["root"] = {
    id: "root",
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

  return { rootId: "root", items };
}

export function applyExpandedState(
  tree: TreeData,
  expandedIds: ItemId[]
): TreeData {
  const items = { ...tree.items };

  for (const id of Object.keys(items)) {
    items[id] = { ...items[id], isExpanded: expandedIds.includes(id) };
  }

  return { ...tree, items };
}

export function applyReorderToTree(
  tree: TreeData,
  movedCollectionId: ItemId,
  source: TreeSourcePosition,
  destination: TreeDestinationPosition
): TreeData {
  const items = { ...tree.items };

  const sourceParent = items[source.parentId];
  const destinationParent = items[destination.parentId];

  if (source.parentId === destination.parentId) {
    const children = [...sourceParent.children];
    children.splice(source.index, 1);
    if (destination.index !== undefined) {
      children.splice(destination.index, 0, movedCollectionId);
    }
    items[source.parentId] = { ...sourceParent, children };
    return { ...tree, items };
  }

  items[source.parentId] = {
    ...sourceParent,
    children: sourceParent.children.filter((id) => id !== movedCollectionId),
  };

  const destChildren = [...(destinationParent.children || [])];
  const destIndex =
    destination.index !== undefined
      ? destination.index
      : destChildren.length;
    destChildren.splice(destIndex, 0, movedCollectionId);

    items[destination.parentId] = {
      ...destinationParent,
      children: destChildren,
      hasChildren: true,
      isExpanded: true,
    };

    items[movedCollectionId] = {
      ...items[movedCollectionId],
      data: {
        ...items[movedCollectionId].data,
        parentId: destination.parentId === "root" ? null : (Number(destination.parentId) as any),
      },
    };

    return { ...tree, items };
}

export function flattenTreeIds(
  tree: TreeData,
  nodeId: ItemId = "root",
  result: Array<ItemId> = []
): Array<ItemId> {
  const node = tree.items[nodeId];
  if (!node) return result;

  if (nodeId !== "root") {
    result.push(node.id);
  }

  if (node.children && node.children.length > 0) {
    for (const childId of node.children) {
      flattenTreeIds(tree, childId, result);
    }
  }

  return result;
}