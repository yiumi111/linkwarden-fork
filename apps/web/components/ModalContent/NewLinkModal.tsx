import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
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

type BatchResult = {
  url: string;
  success: boolean;
  error?: string;
};

export default function NewLinkModal({ onClose }: Props) {
  const { t } = useTranslation();
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

  const addLink = useAddLink({
    toast,
    t,
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const [link, setLink] = useState<PostLinkSchemaType>(initial);
  const [optionsExpanded, setOptionsExpanded] = useState(false);
  const router = useRouter();
  const { data: collections = [] } = useCollections();

  const [batchMode, setBatchMode] = useState(false);
  const [batchUrls, setBatchUrls] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [batchResults, setBatchResults] = useState<BatchResult[] | null>(null);

  const setCollection = (e: any) => {
    if (e?.__isNew__) e.value = undefined;
    setLink({
      ...link,
      collection: { id: e?.value, name: e?.label },
    });
  };

  const setTags = (selectedOptions: any = []) => {
    const tagNames = selectedOptions.map((option: any) => ({
      name: option.label,
    }));
    setLink({ ...link, tags: tagNames });
  };

  useEffect(() => {
    if (router.pathname.startsWith("/collections/") && router.query.id) {
      const currentCollection = collections.find(
        (e) => e.id == Number(router.query.id)
      );

      if (currentCollection && currentCollection.ownerId)
        setLink({
          ...initial,
          collection: {
            id: currentCollection.id,
            name: currentCollection.name,
          },
        });
    } else
      setLink({
        ...initial,
        collection: { name: "Unorganized" },
      });
  }, []);

  useLayoutEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = async () => {
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

  const parseBatchUrls = (): string[] => {
    const lines = batchUrls.split("\n");
    const trimmed = lines.map((l: string) => l.trim()).filter((l: string) => l.length > 0);
    const seen = new Set<string>();
    const deduplicated: string[] = [];
    for (const url of trimmed) {
      if (!seen.has(url)) {
        seen.add(url);
        deduplicated.push(url);
      }
    }
    return deduplicated;
  };

  const submitBatch = async () => {
    const urls = parseBatchUrls();
    if (urls.length === 0) {
      toast.error(t("no_valid_urls"));
      return;
    }

    setIsSubmitting(true);
    setBatchResults(null);

    const results: BatchResult[] = [];

    for (const url of urls) {
      const payload: PostLinkSchemaType = {
        url,
        type: "url",
        name: "",
        description: link.description || "",
        collection: link.collection,
        tags: link.tags || [],
      };

      const validation = PostLinkSchema.safeParse(payload);
      if (!validation.success) {
        results.push({
          url,
          success: false,
          error: validation.error.issues[0]?.message || "Invalid URL",
        });
        continue;
      }

      try {
        await addLink.mutateAsync(payload);
        results.push({ url, success: true });
      } catch (error: any) {
        results.push({
          url,
          success: false,
          error: error?.message || t("unknown_error"),
        });
      }
    }

    setBatchResults(results);
    setIsSubmitting(false);

    const successCount = results.filter((r: BatchResult) => r.success).length;
    const failCount = results.length - successCount;

    if (failCount === 0) {
      toast.success(
        t("batch_all_success", { count: successCount })
      );
      setBatchUrls("");
      setBatchResults(null);
      onClose();
    } else {
      toast.error(
        t("batch_partial_failure", { success: successCount, fail: failCount })
      );
      const failedUrls = results
        .filter((r: BatchResult) => !r.success)
        .map((r: BatchResult) => r.url)
        .join("\n");
      setBatchUrls(failedUrls);
    }
  };

  const failedCount = batchResults
    ? batchResults.filter((r: BatchResult) => !r.success).length
    : 0;
  const successCount = batchResults
    ? batchResults.filter((r: BatchResult) => r.success).length
    : 0;
  const totalCount = batchResults ? batchResults.length : 0;

  return (
    <Modal toggleModal={onClose}>
      <p className="text-xl font-thin">{t("create_new_link")}</p>

      <Separator className="my-3" />

      <div className="flex items-center gap-2 mb-3">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={batchMode}
            onChange={(e) => {
              setBatchMode(e.target.checked);
              setBatchResults(null);
            }}
          />
          <span className="text-sm">{t("batch_add_links")}</span>
        </label>
      </div>

      {batchMode ? (
        <div>
          <p className="mb-2">{t("batch_urls_label")}</p>
          <textarea
            value={batchUrls}
            onChange={(e) => setBatchUrls(e.target.value)}
            placeholder={t("batch_urls_placeholder")}
            className="resize-none w-full h-40 rounded-md p-2 border-neutral-content bg-base-200 focus:border-primary border-solid border outline-none duration-100 text-sm"
            disabled={isSubmitting}
          />
          {batchResults && totalCount > 0 && (
            <div className="mt-2 text-sm">
              <p>
                {t("batch_progress", { success: successCount, fail: failedCount, total: totalCount })}
              </p>
              {failedCount > 0 && (
                <div className="mt-1 text-error text-xs">
                  {batchResults
                    .filter((r: BatchResult) => !r.success)
                    .map((r: BatchResult, i: number) => (
                      <p key={i} className="truncate">
                        {r.url}: {r.error}
                      </p>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-flow-row-dense sm:grid-cols-5 gap-3">
          <div className="sm:col-span-3 col-span-5">
            <p className="mb-2">{t("link")}</p>
            <TextInput
              ref={inputRef}
              value={link.url || ""}
              onChange={(e) => setLink({ ...link, url: e.target.value })}
              placeholder={t("link_url_placeholder")}
              className="bg-base-200"
            />
          </div>
          <div className="sm:col-span-2 col-span-5">
            <p className="mb-2">{t("collection")}</p>
            {link.collection?.name && (
              <CollectionSelection
                onChange={setCollection}
                defaultValue={{
                  value: link.collection?.id,
                  label: link.collection?.name || "Unorganized",
                }}
              />
            )}
          </div>
        </div>
      )}

      {optionsExpanded && (
        <div className="mt-5 grid sm:grid-cols-2 gap-3">
          {!batchMode && (
            <div>
              <p className="mb-2">{t("name")}</p>
              <TextInput
                value={link.name}
                onChange={(e) => setLink({ ...link, name: e.target.value })}
                placeholder={t("link_name_placeholder")}
                className="bg-base-200"
              />
            </div>
          )}
          <div className={batchMode ? "sm:col-span-2" : undefined}>
            <p className="mb-2">{t("tags")}</p>
            <TagSelection
              onChange={setTags}
              defaultValue={
                link.tags?.map((e) => ({ label: e.name, value: e.id })) || []
              }
            />
          </div>
          <div className="sm:col-span-2">
            <p className="mb-2">{t("description")}</p>
            <textarea
              value={unescapeString(link.description || "") || ""}
              onChange={(e) =>
                setLink({ ...link, description: e.target.value })
              }
              placeholder={t("link_description_placeholder")}
              className="resize-none w-full h-32 rounded-md p-2 border-neutral-content bg-base-200 focus:border-primary border-solid border outline-none duration-100"
            />
          </div>
        </div>
      )}
      <div className="flex justify-between items-center mt-5">
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center px-2 w-fit text-sm"
          onClick={() => setOptionsExpanded(!optionsExpanded)}
        >
          <p>{optionsExpanded ? t("hide_options") : t("more_options")}</p>
          <i className={`bi-chevron-${optionsExpanded ? "up" : "down"}`} />
        </Button>
        <Button
          variant="accent"
          onClick={batchMode ? submitBatch : submit}
          disabled={isSubmitting}
        >
          {isSubmitting
            ? t("batch_creating")
            : batchMode
              ? t("batch_create_links")
              : t("create_link")}
        </Button>
      </div>
    </Modal>
  );
}
