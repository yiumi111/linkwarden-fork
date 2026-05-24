import React, { ChangeEvent, useLayoutEffect, useRef, useState } from "react";
import Modal from "../Modal";
import { useTranslation } from "next-i18next";
import { useUpdateRssSubscription } from "@linkwarden/router/rss";
import type {
  RssSubscriptionPayload,
  RssSubscriptionWithCollectionName,
} from "@linkwarden/router/rss";
import toast from "react-hot-toast";
import TextInput from "../TextInput";
import CollectionSelection from "../InputSelect/CollectionSelection";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";

type Props = {
  onClose: () => void;
  rssSubscription: RssSubscriptionWithCollectionName;
};

export default function EditRssSubscriptionModal({
  onClose,
  rssSubscription,
}: Props) {
  const { t } = useTranslation();
  const updateRssSubscription = useUpdateRssSubscription();
  const [submitLoader, setSubmitLoader] = useState(false);

  const [form, setForm] = useState<RssSubscriptionPayload>({
    name: rssSubscription.name,
    url: rssSubscription.url,
    collectionId: rssSubscription.collectionId,
    collectionName: rssSubscription.collection.name,
  });

  const submit = async () => {
    if (submitLoader) return;

    const name = form.name.trim();
    const url = form.url.trim();
    const collectionName = form.collectionName?.trim();

    if (!name || !url || (!form.collectionId && !collectionName)) {
      return toast.error(t("fill_all_fields"));
    }

    setSubmitLoader(true);

    const load = toast.loading(t("updating"));

    await updateRssSubscription.mutateAsync(
      {
        rssSubscriptionId: rssSubscription.id,
        body: {
          name,
          url,
          collectionId: form.collectionId || undefined,
          collectionName,
        },
      },
      {
        onSettled: (_data: unknown, error: Error | null) => {
          setSubmitLoader(false);
          toast.dismiss(load);

          if (error) {
            toast.error(error.message);
          } else {
            onClose();
            toast.success(t("updated"));
          }
        },
      }
    );
  };

  const inputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <Modal toggleModal={onClose}>
      <>
        <p className="text-xl font-thin">{t("edit")}</p>

        <Separator className="my-3" />

        <div className="w-full mb-3">
          <label>{t("link")}</label>
          <TextInput
            type="text"
            placeholder="https://example.com/rss"
            className="bg-base-200 mt-2"
            value={form.url}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setForm({ ...form, url: e.target.value })
            }
          />
        </div>

        <div className="flex sm:flex-row flex-col gap-3 items-center">
          <div className="w-full">
            <label>{t("name")}</label>
            <TextInput
              ref={inputRef}
              type="text"
              placeholder="Sample RSS"
              className="bg-base-200 mt-2"
              value={form.name}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setForm({ ...form, name: e.target.value })
              }
            />
          </div>
          <div className="w-full">
            <label>{t("collection")}</label>
            <CollectionSelection
              className="mt-2"
              defaultValue={{
                value: rssSubscription.collectionId,
                label: rssSubscription.collection.name,
              }}
              onChange={(e: any) => {
                const nextCollectionId = e?.__isNew__ ? undefined : e?.value;

                setForm({
                  ...form,
                  collectionId: nextCollectionId,
                  collectionName: e?.label,
                });
              }}
            />
          </div>
        </div>

        <div className="flex justify-end items-center mt-5">
          <Button variant="accent" onClick={submit} disabled={submitLoader}>
            {t("save")}
          </Button>
        </div>
      </>
    </Modal>
  );
}
