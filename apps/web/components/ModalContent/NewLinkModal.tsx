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
  const batchInputRef = useRef<HTMLTextAreaElement>(null);
  const [link, setLink] = useState<PostLinkSchemaType>(initial);
  const [batchMode, setBatchMode] = useState(false);
  const [batchUrls, setBatchUrls] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ total: 0, current: 0, errors: 0 });
  const [optionsExpanded, setOptionsExpanded] = useState(false);
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
    if (isSubmitting) return;

    if (!batchMode) {
      const dataValidation = PostLinkSchema.safeParse(link);

      if (!dataValidation.success)
        return toast.error(
          `Error: ${
            dataValidation.error.issues[0].message
          } [${dataValidation.error.issues[0].path.join(", ")}]`
        );

      setIsSubmitting(true);
      try {
        await addLink.mutateAsync(link);
        onClose();
      } catch {
        // useAddLink handles toast
      } finally {
        setIsSubmitting(false);
      }
    } else {
      const urls = batchUrls
        .split("\n")
        .map((u: string) => u.trim())
        .filter((u: string) => u.length > 0);

      const uniqueUrls: string[] = Array.from(new Set(urls));

      if (uniqueUrls.length === 0) {
        return toast.error("Please enter at least one valid URL");
      }

      setIsSubmitting(true);
      setBatchProgress({ total: uniqueUrls.length, current: 0, errors: 0 });

      const failedUrls: string[] = [];
      let currentErrors = 0;

      for (let i = 0; i < uniqueUrls.length; i++) {
        const url = uniqueUrls[i];
        const linkData = {
          ...link,
          url,
          name: undefined,
        };

        const dataValidation = PostLinkSchema.safeParse(linkData);

        if (!dataValidation.success) {
          failedUrls.push(url);
          currentErrors++;
          setBatchProgress({ total: uniqueUrls.length, current: i + 1, errors: currentErrors });
          continue;
        }

        try {
          await addLink.mutateAsync(linkData);
        } catch {
          failedUrls.push(url);
          currentErrors++;
        }

        setBatchProgress({ total: uniqueUrls.length, current: i + 1, errors: currentErrors });
      }

      setIsSubmitting(false);

      if (failedUrls.length === 0) {
        toast.success("All links added successfully");
        setBatchUrls("");
        onClose();
      } else {
        toast.error(`${failedUrls.length} links failed to add`);
        setBatchUrls(failedUrls.join("\n"));
      }
    }
  };

  return (
    <Modal toggleModal={onClose}>
      <div className="flex justify-between items-center">
        <p className="text-xl font-thin">{t("create_new_link")}</p>
        <label className="flex items-center cursor-pointer gap-2">
          <span className="text-sm">{t("batch_mode") || "Batch mode"}</span>
          <input
            type="checkbox"
            className="toggle toggle-primary toggle-sm"
            checked={batchMode}
            onChange={(e) => {
              setBatchMode(e.target.checked);
              if (e.target.checked) {
                setTimeout(() => batchInputRef.current?.focus(), 0);
              } else {
                setTimeout(() => inputRef.current?.focus(), 0);
              }
            }}
            disabled={isSubmitting}
          />
        </label>
      </div>

      <Separator className="my-3" />

      <div className="grid grid-flow-row-dense sm:grid-cols-5 gap-3">
        <div className="sm:col-span-3 col-span-5">
          <p className="mb-2">{batchMode ? (t("links") || "Links (one per line)") : t("link")}</p>
          {batchMode ? (
            <textarea
              ref={batchInputRef}
              value={batchUrls}
              onChange={(e) => setBatchUrls(e.target.value)}
              placeholder="https://example.com&#10;https://example.org"
              className="resize-none w-full h-24 rounded-md p-2 border-neutral-content bg-base-200 focus:border-primary border-solid border outline-none duration-100"
              disabled={isSubmitting}
            />
          ) : (
            <TextInput
              ref={inputRef}
              value={link.url || ""}
              onChange={(e) => setLink({ ...link, url: e.target.value })}
              placeholder={t("link_url_placeholder")}
              className="bg-base-200"
              disabled={isSubmitting}
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
          disabled={isSubmitting}
        >
          <p>{optionsExpanded ? t("hide_options") : t("more_options")}</p>
          <i className={`bi-chevron-${optionsExpanded ? "up" : "down"}`} />
        </Button>
        <div className="flex items-center gap-3">
          {isSubmitting && batchMode && batchProgress.total > 0 && (
            <span className="text-sm text-neutral-500">
              {batchProgress.current} / {batchProgress.total} ({batchProgress.errors} failed)
            </span>
          )}
          <Button variant="accent" onClick={submit} disabled={isSubmitting}>
            {isSubmitting ? (batchMode ? "Processing..." : "Creating...") : t("create_link")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
