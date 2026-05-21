import {
  ItemId,
  TreeData,
  TreeDestinationPosition,
  TreeSourcePosition,
} from "@atlaskit/tree";
import { CollectionIncludingMembersAndLinkCount } from "@linkwarden/types/global";

export interface CollectionTreeItem {
  id: ItemId;
  children: ItemId[];
  hasChildren: boolean;
  isExpanded: boolean;
  data: Partial<CollectionIncludingMembersAndLinkCount> & {
    parentId?: number | string | null;
    _count?: { links?: number };
  };
}

const rootId = "root";

const cloneCollectionTree = (tree: TreeData): TreeData => {
  const items = Object.entries(tree.items).reduce(
    (acc, [id, item]) => {
      const currentItem = item as CollectionTreeItem;

      acc[id] = {
        ...currentItem,
        children: [...(currentItem.children ?? [])],
        data:
          currentItem.data && typeof currentItem.data === "object"
            ? { ...currentItem.data }
            : currentItem.data,
      };

      return acc;
    },
    {} as TreeData["items"]
  );

  return {
    rootId: tree.rootId,
    items,
  };
};

const getCollectionTreeLinkCount = (
  collectionId: number,
  items: Record<string, CollectionTreeItem>
): number => {
  const collection = items[collectionId];

  if (!collection) {
    return 0;
  }

  let totalLinkCount = collection.data._count?.links || 0;

  for (const childId of collection.children ?? []) {
    totalLinkCount += getCollectionTreeLinkCount(Number(childId), items);
  }

  return totalLinkCount;
};

export const getExpandedParentIds = (
  collections: CollectionIncludingMembersAndLinkCount[],
  activeCollectionId?: number
): number[] => {
  if (!activeCollectionId) {
    return [];
  }

  const parentsByCollectionId = new Map<number, number | null>();

  for (const collection of collections) {
    if (collection.id == null) {
      continue;
    }

    parentsByCollectionId.set(collection.id, collection.parentId);
  }

  const expandedParentIds: number[] = [];
  let parentId = parentsByCollectionId.get(activeCollectionId);

  while (typeof parentId === "number") {
    expandedParentIds.push(parentId);
    parentId = parentsByCollectionId.get(parentId) ?? null;
  }

  return expandedParentIds;
};

export const buildCollectionTree = ({
  collections,
  activeCollectionId,
  previousTree,
  order,
}: {
  collections: CollectionIncludingMembersAndLinkCount[];
  activeCollectionId?: number;
  previousTree?: TreeData;
  order?: number[];
}): TreeData => {
  const sortedCollections = [...collections];

  if (order) {
    sortedCollections.sort((a, b) => {
      return order.indexOf(a.id as number) - order.indexOf(b.id as number);
    });
  }

  const expandedParentIds = new Set(
    getExpandedParentIds(sortedCollections, activeCollectionId)
  );

  const items = sortedCollections.reduce<Record<string, CollectionTreeItem>>(
    (acc, collection) => {
      if (collection.id == null) {
        return acc;
      }

      acc[String(collection.id)] = {
        id: collection.id,
        children: [],
        hasChildren: false,
        isExpanded:
          previousTree?.items[collection.id]?.isExpanded ||
          expandedParentIds.has(collection.id),
        data: {
          ...collection,
          _count: {
            links: collection._count?.links,
          },
        },
      };

      return acc;
    },
    {}
  );

  for (const collection of sortedCollections) {
    if (collection.id == null || collection.parentId == null) {
      continue;
    }

    const parentItem = items[String(collection.parentId)];

    if (!parentItem) {
      continue;
    }

    parentItem.children.push(collection.id);
    parentItem.hasChildren = true;
  }

  for (const collection of sortedCollections) {
    if (collection.id == null || !items[String(collection.id)]) {
      continue;
    }

    items[String(collection.id)].data._count = {
      links: getCollectionTreeLinkCount(collection.id, items),
    };
  }

  const collectionIds = new Set(
    sortedCollections
      .map((collection) => collection.id)
      .filter((collectionId): collectionId is number => collectionId != null)
  );

  items[rootId] = {
    id: rootId,
    children: sortedCollections
      .filter(
        (collection) =>
          collection.id != null &&
          (collection.parentId === null ||
            !collectionIds.has(collection.parentId as number))
      )
      .map((collection) => collection.id as number),
    hasChildren: true,
    isExpanded: true,
    data: { name: "Root" },
  };

  return {
    rootId,
    items,
  };
};

export const reorderCollectionTree = (
  tree: TreeData,
  movedCollectionId: ItemId,
  source: TreeSourcePosition,
  destination: TreeDestinationPosition
): TreeData => {
  const nextTree = cloneCollectionTree(tree);

  if (source.parentId === destination.parentId) {
    const parent = nextTree.items[source.parentId] as CollectionTreeItem;
    const children = [...parent.children];
    const destinationIndex =
      destination.index !== undefined ? destination.index : children.length;

    children.splice(source.index, 1);
    children.splice(destinationIndex, 0, movedCollectionId);

    parent.children = children;

    return nextTree;
  }

  const sourceParent = nextTree.items[source.parentId] as CollectionTreeItem;
  const destinationParent = nextTree.items[
    destination.parentId
  ] as CollectionTreeItem;

  sourceParent.children = sourceParent.children.filter(
    (itemId) => itemId !== movedCollectionId
  );
  sourceParent.hasChildren = sourceParent.children.length > 0;

  destinationParent.children = [...(destinationParent.children ?? [])];
  const destinationIndex =
    destination.index !== undefined
      ? destination.index
      : destinationParent.children.length;
  destinationParent.children.splice(destinationIndex, 0, movedCollectionId);
  destinationParent.hasChildren = true;
  destinationParent.isExpanded = true;

  const movedItem = nextTree.items[movedCollectionId] as
    | CollectionTreeItem
    | undefined;

  if (movedItem?.data) {
    movedItem.data = {
      ...movedItem.data,
      parentId: destination.parentId,
    };
  }

  return nextTree;
};

export const flattenCollectionTreeIds = (
  tree: TreeData,
  nodeId: ItemId = rootId,
  result: number[] = []
): number[] => {
  const node = tree.items[nodeId] as CollectionTreeItem | undefined;

  if (!node) {
    return result;
  }

  if (nodeId !== rootId && typeof node.id === "number") {
    result.push(node.id);
  }

  for (const childId of node.children ?? []) {
    flattenCollectionTreeIds(tree, childId, result);
  }

  return result;
};
