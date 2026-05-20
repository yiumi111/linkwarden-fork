import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import CollectionSelection from "@/components/InputSelect/CollectionSelection";
import TagSelection from "@/components/InputSelect/TagSelection";
import TextInput from "@/components/TextInput";
import unescapeString from "@/lib/client/unescapeString";
import { useRouter } from "next/router";
import Modal from "../Modal";
import { useTranslation } from "next-i18next";
import { useCollections } from "@linkwarden/router/collections";
import toast from "react-hot-toast";
import {
  PostLinkSchema,
  PostLinkSchemaType,
} from "@linkwarden/lib/schemaValidation";
import { Button } from "@/components/ui/button";
import { Separator } from "../ui/separator";
import { useAddLink } from "@linkwarden/router/links";

type Props = {
  onClose: () => void;
};

type BulkProgressState = {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  duplicateCount: number;
  status: "idle" | "running" | "partial";
};

const initial = {
  name: "",
  url: "",
  description: "",
  type: "url",
  tags: [],
  collection: {
    id: undefined,
    name: "",
  },
} as PostLinkSchemaType;

const initialBulkProgress: BulkProgressState = {
  total: 0,
  processed: 0,
  succeeded: 0,
  failed: 0,
  duplicateCount: 0,
  status: "idle",
};

const normalizeBatchUrl = (value: string) => {
  try {
    return new URL(value).toString();
  } catch {
    return value;
  }
};

const parseBulkUrls = (value: string) => {
  const seen = new Set<string>();
  const urls: string[] = [];
  let duplicateCount = 0;

  for (const line of value.split(/\r?\n/g)) {
    const trimmedLine = line.trim();

    if (!trimmedLine) continue;

    const normalizedUrl = normalizeBatchUrl(trimmedLine);

    if (seen.has(normalizedUrl)) {
      duplicateCount += 1;
      continue;
    }

    seen.add(normalizedUrl);
    urls.push(trimmedLine);
  }

  return {
    urls,
    duplicateCount,
  };
};

export default function NewLinkModal({ onClose }: Props) {
  const { t } = useTranslation();
  const addLink = useAddLink({
    toast,
    t,
  });
  const addLinkSilently = useAddLink({});

  const inputRef = useRef<HTMLInputElement>(null);
  const bulkInputRef = useRef<HTMLTextAreaElement>(null);
  const [link, setLink] = useState<PostLinkSchemaType>(initial);
  const [optionsExpanded, setOptionsExpanded] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkUrls, setBulkUrls] = useState("");
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [bulkProgress, setBulkProgress] =
    useState<BulkProgressState>(initialBulkProgress);
  const [collectionInitialized, setCollectionInitialized] = useState(false);
  const router = useRouter();
  const { data: collections = [] } = useCollections();

  const bulkInputState = useMemo(() => parseBulkUrls(bulkUrls), [bulkUrls]);

  const collectionValue =
    link.collection?.name && link.collection.name.length > 0
      ? {
          value: link.collection.id,
          label: link.collection.name || "Unorganized",
        }
      : undefined;

  const tagValue =
    link.tags?.map((tag: { id?: number; name: string }) => ({
      label: tag.name,
      value: tag.id,
    })) || [];

  const setCollection = (e: any) => {
    const nextCollectionId = e?.__isNew__ ? undefined : e?.value;

    setLink((previousLink: PostLinkSchemaType) => ({
      ...previousLink,
      collection: { id: nextCollectionId, name: e?.label || "Unorganized" },
    }));
  };

  const setTags = (selectedOptions: any = []) => {
    const tagNames = selectedOptions.map((option: any) => ({
      name: option.label,
    }));

    setLink((previousLink: PostLinkSchemaType) => ({
      ...previousLink,
      tags: tagNames,
    }));
  };

  useEffect(() => {
    if (collectionInitialized) return;

    if (router.pathname.startsWith("/collections/") && router.query.id) {
      if (!collections.length) return;

      const currentCollection = collections.find(
        (collection: any) => collection.id == Number(router.query.id)
      );

      if (currentCollection && currentCollection.ownerId) {
        setLink((previousLink: PostLinkSchemaType) => ({
          ...previousLink,
          collection: {
            id: currentCollection.id,
            name: currentCollection.name,
          },
        }));
        setCollectionInitialized(true);
        return;
      }
    }

    setLink((previousLink: PostLinkSchemaType) => ({
      ...previousLink,
      collection: { name: "Unorganized" },
    }));
    setCollectionInitialized(true);
  }, [collectionInitialized, collections, router.pathname, router.query.id]);

  useLayoutEffect(() => {
    if (bulkMode) bulkInputRef.current?.focus();
    else inputRef.current?.focus();
  }, [bulkMode]);

  const submitSingle = async () => {
    const dataValidation = PostLinkSchema.safeParse(link);

    if (!dataValidation.success)
      return toast.error(
        `Error: ${
          dataValidation.error.issues[0].message
        } [${dataValidation.error.issues[0].path.join(", ")}]`
      );

    addLink.mutateAsync(link);
    onClose();
  };

  const submitBulk = async () => {
    if (isBulkSubmitting) return;

    const { urls, duplicateCount } = parseBulkUrls(bulkUrls);

    if (!urls.length) {
      toast.error("Please add at least one URL.");
      setBulkProgress({
        ...initialBulkProgress,
        duplicateCount,
      });
      return;
    }

    setIsBulkSubmitting(true);
    setBulkProgress({
      total: urls.length,
      processed: 0,
      succeeded: 0,
      failed: 0,
      duplicateCount,
      status: "running",
    });

    const failedUrls: string[] = [];
    let succeeded = 0;
    let failed = 0;

    for (const url of urls) {
      const linkToCreate: PostLinkSchemaType = {
        ...link,
        url,
        name: undefined,
      };

      const dataValidation = PostLinkSchema.safeParse(linkToCreate);

      if (!dataValidation.success) {
        failed += 1;
        failedUrls.push(url);
        setBulkProgress((previousState: BulkProgressState) => ({
          ...previousState,
          processed: previousState.processed + 1,
          failed,
        }));
        continue;
      }

      try {
        await addLinkSilently.mutateAsync(linkToCreate);
        succeeded += 1;
      } catch {
        failed += 1;
        failedUrls.push(url);
      }

      setBulkProgress((previousState: BulkProgressState) => ({
        ...previousState,
        processed: previousState.processed + 1,
        succeeded,
        failed,
      }));
    }

    setIsBulkSubmitting(false);

    if (!failedUrls.length) {
      setBulkUrls("");
      setBulkProgress(initialBulkProgress);
      toast.success(
        succeeded === 1 ? "1 link created." : `${succeeded} links created.`
      );
      onClose();
      return;
    }

    setBulkUrls(failedUrls.join("\n"));
    setBulkProgress({
      total: failedUrls.length,
      processed: failedUrls.length,
      succeeded,
      failed,
      duplicateCount,
      status: "partial",
    });

    toast.error(
      failed === 1
        ? "1 URL failed. The failed URL has been kept for retry."
        : `${failed} URLs failed. Failed URLs have been kept for retry.`
    );
  };

  const submit = async () => {
    if (bulkMode) await submitBulk();
    else await submitSingle();
  };

  return (
    <Modal toggleModal={onClose}>
      <p className="text-xl font-thin">{t("create_new_link")}</p>

      <Separator className="my-3" />

      <div className="flex items-center justify-between gap-3 rounded-md bg-base-200 px-3 py-2">
        <div>
          <p className="text-sm font-medium">Bulk add links</p>
          <p className="text-xs text-neutral">
            Paste one URL per line and reuse the current collection, tags, and
            description.
          </p>
        </div>
        <input
          type="checkbox"
          className="toggle toggle-primary"
          checked={bulkMode}
          onChange={(e: any) => {
            setBulkMode(e.target.checked);
            setBulkProgress(initialBulkProgress);
          }}
          disabled={isBulkSubmitting}
        />
      </div>

      <div className="grid grid-flow-row-dense sm:grid-cols-5 gap-3 mt-5">
        <div className="sm:col-span-3 col-span-5">
          <p className="mb-2">{t("link")}</p>
          {bulkMode ? (
            <>
              <textarea
                ref={bulkInputRef}
                value={bulkUrls}
                onChange={(e: any) => setBulkUrls(e.target.value)}
                placeholder={"https://example.com\nhttps://example.org"}
                className="resize-none w-full h-32 rounded-md p-2 border-neutral-content bg-base-200 focus:border-primary border-solid border outline-none duration-100"
                disabled={isBulkSubmitting}
              />
              <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-neutral">
                <p>
                  {bulkInputState.urls.length > 0
                    ? `${bulkInputState.urls.length} unique URL${
                        bulkInputState.urls.length === 1 ? "" : "s"
                      } ready`
                    : "Empty lines are ignored automatically."}
                </p>
                {bulkInputState.duplicateCount > 0 && (
                  <p>
                    {bulkInputState.duplicateCount} duplicate URL
                    {bulkInputState.duplicateCount === 1 ? "" : "s"} will be
                    skipped
                  </p>
                )}
              </div>
            </>
          ) : (
            <TextInput
              ref={inputRef}
              value={link.url || ""}
              onChange={(e: any) =>
                setLink((previousLink: PostLinkSchemaType) => ({
                  ...previousLink,
                  url: e.target.value,
                }))
              }
              placeholder={t("link_url_placeholder")}
              className="bg-base-200"
            />
          )}
        </div>
        <div className="sm:col-span-2 col-span-5">
          <p className="mb-2">{t("collection")}</p>
          {link.collection?.name && (
            <CollectionSelection
              onChange={setCollection}
              defaultValue={collectionValue}
              value={collectionValue}
              disabled={isBulkSubmitting}
            />
          )}
        </div>
      </div>
      {optionsExpanded && (
        <div className="mt-5 grid sm:grid-cols-2 gap-3">
          {!bulkMode && (
            <div>
              <p className="mb-2">{t("name")}</p>
              <TextInput
                value={link.name}
                onChange={(e: any) =>
                  setLink((previousLink: PostLinkSchemaType) => ({
                    ...previousLink,
                    name: e.target.value,
                  }))
                }
                placeholder={t("link_name_placeholder")}
                className="bg-base-200"
              />
            </div>
          )}
          <div className={bulkMode ? "sm:col-span-2" : ""}>
            <p className="mb-2">{t("tags")}</p>
            <TagSelection
              onChange={setTags}
              defaultValue={tagValue}
              value={tagValue}
              disabled={isBulkSubmitting}
            />
          </div>
          <div className="sm:col-span-2">
            <p className="mb-2">{t("description")}</p>
            <textarea
              value={unescapeString(link.description || "") || ""}
              onChange={(e: any) =>
                setLink((previousLink: PostLinkSchemaType) => ({
                  ...previousLink,
                  description: e.target.value,
                }))
              }
              placeholder={t("link_description_placeholder")}
              className="resize-none w-full h-32 rounded-md p-2 border-neutral-content bg-base-200 focus:border-primary border-solid border outline-none duration-100"
              disabled={isBulkSubmitting}
            />
          </div>
        </div>
      )}
      {bulkMode && bulkProgress.status !== "idle" && (
        <div className="mt-5 rounded-md border border-neutral-content bg-base-200 px-3 py-2 text-sm">
          {bulkProgress.status === "running" ? (
            <p>
              Creating {bulkProgress.processed} / {bulkProgress.total} URLs.
              Success: {bulkProgress.succeeded}. Failed: {bulkProgress.failed}.
            </p>
          ) : (
            <p>
              Created {bulkProgress.succeeded} URL
              {bulkProgress.succeeded === 1 ? "" : "s"}. Failed URL
              {bulkProgress.failed === 1 ? "" : "s"} remain in the input for
              retry.
            </p>
          )}
          {bulkProgress.duplicateCount > 0 && (
            <p className="mt-1 text-xs text-neutral">
              {bulkProgress.duplicateCount} duplicate URL
              {bulkProgress.duplicateCount === 1 ? " was" : "s were"} skipped
              in this batch.
            </p>
          )}
        </div>
      )}
      <div className="flex justify-between items-center mt-5 gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center px-2 w-fit text-sm"
          onClick={() => setOptionsExpanded(!optionsExpanded)}
          disabled={isBulkSubmitting}
        >
          <p>{optionsExpanded ? t("hide_options") : t("more_options")}</p>
          <i className={`bi-chevron-${optionsExpanded ? "up" : "down"}`} />
        </Button>
        <Button variant="accent" onClick={submit} disabled={isBulkSubmitting}>
          {bulkMode
            ? isBulkSubmitting
              ? "Creating..."
              : "Create links"
            : t("create_link")}
        </Button>
      </div>
    </Modal>
  );
}
