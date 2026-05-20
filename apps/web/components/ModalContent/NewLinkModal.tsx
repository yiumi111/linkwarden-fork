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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [link, setLink] = useState<PostLinkSchemaType>(initial);
  const [optionsExpanded, setOptionsExpanded] = useState(false);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchUrls, setBatchUrls] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [batchStatus, setBatchStatus] = useState<{
    total: number;
    success: number;
    failed: number;
    failedUrls: string[];
  }>({ total: 0, success: 0, failed: 0, failedUrls: [] });
  const router = useRouter();
  const { data: collections = [] } = useCollections();

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

  const submitBatch = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    setBatchStatus({ total: 0, success: 0, failed: 0, failedUrls: [] });

    const urlLines = batchUrls
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const uniqueUrls = [...new Set(urlLines)];
    setBatchStatus((prev) => ({ ...prev, total: uniqueUrls.length }));

    const failedUrls: string[] = [];
    let successCount = 0;

    for (const url of uniqueUrls) {
      try {
        const linkData: PostLinkSchemaType = {
          ...link,
          url,
          name: "",
        };
        
        await addLink.mutateAsync(linkData);
        successCount++;
        setBatchStatus((prev) => ({ ...prev, success: successCount }));
      } catch (error) {
        failedUrls.push(url);
        setBatchStatus((prev) => ({
          ...prev,
          failed: failedUrls.length,
          failedUrls: [...failedUrls],
        }));
      }
    }

    setIsSubmitting(false);

    if (failedUrls.length === 0) {
      setBatchUrls("");
      onClose();
    } else {
      setBatchUrls(failedUrls.join("\n"));
      toast.error(t("some_links_failed"));
    }
  };

  return (
    <Modal toggleModal={onClose}>
      <p className="text-xl font-thin">{t("create_new_link")}</p>

      <Separator className="my-3" />

      <div className="flex justify-between items-center mb-3">
        <Button
          variant={isBatchMode ? "accent" : "ghost"}
          size="sm"
          onClick={() => {
            setIsBatchMode(!isBatchMode);
            setBatchUrls("");
            setBatchStatus({ total: 0, success: 0, failed: 0, failedUrls: [] });
          }}
        >
          {t("batch_mode")}
        </Button>
      </div>

      <div className="grid grid-flow-row-dense sm:grid-cols-5 gap-3">
        <div className="sm:col-span-3 col-span-5">
          <p className="mb-2">{t("link")}</p>
          {isBatchMode ? (
            <textarea
              ref={textareaRef}
              value={batchUrls}
              onChange={(e) => setBatchUrls(e.target.value)}
              placeholder={t("batch_links_placeholder")}
              className="resize-none w-full h-40 rounded-md p-2 border-neutral-content bg-base-200 focus:border-primary border-solid border outline-none duration-100"
            />
          ) : (
            <TextInput
              ref={inputRef}
              value={link.url || ""}
              onChange={(e) => setLink({ ...link, url: e.target.value })}
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
              defaultValue={{
                value: link.collection?.id,
                label: link.collection?.name || "Unorganized",
              }}
            />
          )}
        </div>
      </div>

      {isBatchMode && batchStatus.total > 0 && (
        <div className="mt-3 p-3 bg-base-200 rounded-md">
          <p className="text-sm">
            {t("progress")}: {batchStatus.success + batchStatus.failed}/{batchStatus.total}
          </p>
          {batchStatus.success > 0 && (
            <p className="text-sm text-green-500">
              ✓ {t("success")}: {batchStatus.success}
            </p>
          )}
          {batchStatus.failed > 0 && (
            <p className="text-sm text-red-500">
              ✗ {t("failed")}: {batchStatus.failed}
            </p>
          )}
        </div>
      )}
      {optionsExpanded && (
        <div className="mt-5 grid sm:grid-cols-2 gap-3">
          <div>
            <p className="mb-2">{t("name")}</p>
            <TextInput
              value={link.name}
              onChange={(e) => setLink({ ...link, name: e.target.value })}
              placeholder={t("link_name_placeholder")}
              className="bg-base-200"
            />
          </div>
          <div>
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
          onClick={isBatchMode ? submitBatch : submit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <i className="bi-spinner animate-spin mr-2" />
              {t("creating")}
            </>
          ) : isBatchMode ? (
            t("create_links")
          ) : (
            t("create_link")
          )}
        </Button>
      </div>
    </Modal>
  );
}
