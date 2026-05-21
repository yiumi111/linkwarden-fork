import React, { useEffect, useMemo, useRef, useState } from "react";
import Tree, {
  mutateTree,
  moveItemOnTree,
  RenderItemParams,
  TreeData,
  ItemId,
  TreeSourcePosition,
  TreeDestinationPosition,
} from "@atlaskit/tree";
import Link from "next/link";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import { useTranslation } from "next-i18next";
import {
  useCollections,
  useUpdateCollection,
} from "@linkwarden/router/collections";
import { useUpdateUser, useUser } from "@linkwarden/router/user";
import Icon from "./Icon";
import { IconWeight } from "@phosphor-icons/react";
import Droppable from "./Droppable";
import { cn } from "@linkwarden/lib/utils";
import { Active, useDndContext } from "@dnd-kit/core";
import {
  buildCollectionTree,
  CollectionTreeItem,
  flattenCollectionTreeIds,
  reorderCollectionTree,
} from "@/lib/collectionTree";

const CollectionListing = () => {
  const { active: droppableActive } = useDndContext();
  const { t } = useTranslation();
  const updateCollection = useUpdateCollection();
  const { data: collections = [], isLoading } = useCollections();

  const { data: user } = useUser();
  const updateUser = useUpdateUser();

  const router = useRouter();

  const [tree, setTree] = useState<TreeData | undefined>();
  const treeRef = useRef<TreeData | undefined>(undefined);

  useEffect(() => {
    treeRef.current = tree;
  }, [tree]);

  const activeCollectionId = useMemo(
    () => Number(router.asPath.split("/collections/")[1]),
    [router.asPath]
  );

  const initialTree = useMemo(() => {
    if (collections.length === 0) {
      return undefined;
    }

    return buildCollectionTree({
      collections,
      activeCollectionId,
      previousTree: treeRef.current,
      order: user?.collectionOrder,
    });
  }, [activeCollectionId, collections, user?.collectionOrder]);

  useEffect(() => {
    setTree(initialTree);
  }, [initialTree]);

  useEffect(() => {
    if (user?.username) {
      if (
        (!user.collectionOrder || user.collectionOrder.length === 0) &&
        collections.length > 0
      )
        updateUser.mutate({
          ...user,
          collectionOrder: collections
            .filter((e) => e.parentId === null)
            .map((e) => e.id as number),
        });
      else {
        const newCollectionOrder: number[] = [...(user.collectionOrder || [])];

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

        if (
          JSON.stringify(newCollectionOrder) !==
          JSON.stringify(user.collectionOrder)
        ) {
          updateUser.mutateAsync({
            ...user,
            collectionOrder: newCollectionOrder,
          });
        }
      }
    }
  }, [user, collections]);

  const onExpand = (movedCollectionId: ItemId) => {
    setTree((currentTree) =>
      mutateTree(currentTree!, movedCollectionId, { isExpanded: true })
    );
  };

  const onCollapse = (movedCollectionId: ItemId) => {
    setTree((currentTree) =>
      mutateTree(currentTree as TreeData, movedCollectionId, {
        isExpanded: false,
      })
    );
  };

  const onDragEnd = async (
    source: TreeSourcePosition,
    destination: TreeDestinationPosition | undefined
  ) => {
    if (!destination || !tree) {
      return;
    }

    if (
      source.index === destination.index &&
      source.parentId === destination.parentId
    ) {
      return;
    }

    const movedCollectionId = Number(
      tree.items[source.parentId].children[source.index]
    );

    const movedCollection = collections.find((c) => c.id === movedCollectionId);

    const destinationCollection = collections.find(
      (c) => c.id === Number(destination.parentId)
    );

    if (
      (movedCollection?.ownerId !== user?.id &&
        destination.parentId !== source.parentId) ||
      (destinationCollection?.ownerId !== user?.id &&
        destination.parentId !== "root")
    ) {
      return toast.error(t("cant_change_collection_you_dont_own"));
    }

    setTree((currentTree) => moveItemOnTree(currentTree!, source, destination));

    const newTree = reorderCollectionTree(
      tree,
      movedCollectionId,
      source,
      destination
    );

    if (source.parentId !== destination.parentId) {
      await updateCollection.mutateAsync(
        {
          ...movedCollection,
          parentId:
            destination.parentId && destination.parentId !== "root"
              ? Number(destination.parentId)
              : destination.parentId === "root"
                ? "root"
                : null,
        },
        {
          onError: (error) => {
            toast.error(error.message);
          },
        }
      );
    }

    await updateUser.mutateAsync({
      ...user,
      collectionOrder: flattenCollectionTreeIds(newTree),
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="skeleton h-4 w-full"></div>
        <div className="skeleton h-4 w-full"></div>
        <div className="skeleton h-4 w-full"></div>
      </div>
    );
  }

  if (!tree) {
    return (
      <p className="text-neutral text-xs font-semibold truncate w-full px-2 mt-5 mb-8">
        {t("you_have_no_collections")}
      </p>
    );
  }

  return (
    <Tree
      tree={tree}
      renderItem={(itemProps) =>
        renderItem({ ...itemProps }, router.asPath, droppableActive)
      }
      onExpand={onExpand}
      onCollapse={onCollapse}
      onDragEnd={onDragEnd}
      isDragEnabled
      isNestingEnabled
    />
  );
};

export default CollectionListing;

const renderItem = (
  { item, onExpand, onCollapse, provided }: RenderItemParams,
  currentPath: string,
  droppableActive: Active | null
) => {
  const collection = item.data;

  return (
    <Droppable
      id={`side-bar-collection-${collection.id}`}
      data={{
        name: collection.name,
        id: collection.id,
        ownerId: collection.ownerId,
      }}
      className="group"
    >
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        className="mb-1"
      >
        <div
          className={cn(
            currentPath === `/collections/${collection.id}`
              ? "bg-primary/20 is-active"
              : droppableActive
                ? "select-none"
                : "hover:bg-neutral/20",
            "duration-100 flex gap-1 items-center pr-2 pl-1 rounded-md"
          )}
        >
          {Dropdown(item as CollectionTreeItem, onExpand, onCollapse)}

          <Link
            href={`/collections/${collection.id}`}
            className="w-full"
            {...provided.dragHandleProps}
          >
            <div
              className={`py-1 cursor-pointer flex items-center gap-2 w-full rounded-md h-8`}
            >
              {collection.icon ? (
                <Icon
                  icon={collection.icon}
                  size={30}
                  weight={(collection.iconWeight || "regular") as IconWeight}
                  color={collection.color}
                  className="-mr-[0.15rem]"
                />
              ) : (
                <i
                  className="bi-folder-fill text-xl"
                  style={{ color: collection.color }}
                ></i>
              )}

              <p className="truncate w-full">{collection.name}</p>

              {collection.isPublic && (
                <i
                  className="bi-globe2 text-sm text-black/50 dark:text-white/50 drop-shadow"
                  title="This collection is being shared publicly."
                ></i>
              )}
              <div className="drop-shadow text-neutral text-xs">
                {collection._count?.links}
              </div>
            </div>
          </Link>
        </div>
      </div>
    </Droppable>
  );
};

const Dropdown = (
  item: CollectionTreeItem,
  onExpand: (id: ItemId) => void,
  onCollapse: (id: ItemId) => void
) => {
  if (item.children && item.children.length > 0) {
    return item.isExpanded ? (
      <button onClick={() => onCollapse(item.id)}>
        <div className="bi-caret-down-fill opacity-50 hover:opacity-100 duration-200"></div>
      </button>
    ) : (
      <button onClick={() => onExpand(item.id)}>
        <div className="bi-caret-right-fill opacity-40 hover:opacity-100 duration-200"></div>
      </button>
    );
  }

  return <div></div>;
};
