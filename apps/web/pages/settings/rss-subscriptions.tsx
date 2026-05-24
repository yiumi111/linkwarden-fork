import SettingsLayout from "@/layouts/SettingsLayout";
import { useTranslation } from "next-i18next";
import getServerSideProps from "@/lib/client/getServerSideProps";
import { useRssSubscriptions } from "@linkwarden/router/rss";
import type { RssSubscriptionWithCollectionName } from "@linkwarden/router/rss";
import DeleteRssSubscriptionModal from "@/components/ModalContent/DeleteRssSubscriptionModal";
import { useState } from "react";
import type { ReactElement } from "react";
import NewRssSubscriptionModal from "@/components/ModalContent/NewRssSubscriptionModal";
import EditRssSubscriptionModal from "@/components/ModalContent/EditRssSubscriptionModal";
import { useConfig } from "@linkwarden/router/config";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { NextPageWithLayout } from "../_app";

const Page: NextPageWithLayout = () => {
  const { t } = useTranslation();
  const { data: rssSubscriptions = [] } = useRssSubscriptions();

  const [deleteSubscriptionModal, setDeleteSubscriptionModal] = useState(false);
  const [editSubscriptionModal, setEditSubscriptionModal] = useState(false);
  const [newSubscriptionModal, setNewSubscriptionModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] =
    useState<RssSubscriptionWithCollectionName | null>(null);

  const openDeleteModal = (subscription: RssSubscriptionWithCollectionName) => {
    setSelectedSubscription(subscription);
    setDeleteSubscriptionModal(true);
  };

  const openEditModal = (subscription: RssSubscriptionWithCollectionName) => {
    setSelectedSubscription(subscription);
    setEditSubscriptionModal(true);
  };

  const closeSubscriptionModal = () => {
    setDeleteSubscriptionModal(false);
    setEditSubscriptionModal(false);
    setSelectedSubscription(null);
  };

  const { data: config } = useConfig();

  return (
    <>
      <div className="flex items-center gap-2">
        <i className="bi-rss text-primary text-2xl"></i>
        <p className="capitalize text-3xl font-thin inline">
          {t("rss_subscriptions")}
        </p>
      </div>

      <Separator className="my-3" />

      <div className="flex flex-col gap-3">
        <p>
          {t("rss_subscriptions_desc", {
            number: config?.RSS_POLLING_INTERVAL_MINUTES || 60,
          })}
        </p>

        <Button
          variant="accent"
          className="ml-auto"
          onClick={() => {
            setNewSubscriptionModal(true);
          }}
        >
          {t("new_rss_subscription")}
        </Button>
        {rssSubscriptions.length > 0 && (
          <table className="table mt-2 overflow-x-auto">
            <thead>
              <tr>
                <th>{t("name")}</th>
                <th>{t("link")}</th>
                <th>{t("collection")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rssSubscriptions.map((rssSubscription) => (
                <tr key={rssSubscription.id}>
                  <td>{rssSubscription.name}</td>
                  <td>{rssSubscription.url}</td>
                  <td>{rssSubscription.collection.name}</td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditModal(rssSubscription)}
                      >
                        <i className="bi-pencil text-base"></i>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:text-error"
                        onClick={() => openDeleteModal(rssSubscription)}
                      >
                        <i className="bi-x text-lg"></i>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {newSubscriptionModal && (
        <NewRssSubscriptionModal
          onClose={() => setNewSubscriptionModal(false)}
        />
      )}
      {editSubscriptionModal && selectedSubscription && (
        <EditRssSubscriptionModal
          rssSubscription={selectedSubscription}
          onClose={closeSubscriptionModal}
        />
      )}
      {deleteSubscriptionModal && selectedSubscription && (
        <DeleteRssSubscriptionModal
          rssSubscription={selectedSubscription}
          onClose={closeSubscriptionModal}
        />
      )}
    </>
  );
};

Page.getLayout = function getLayout(page: ReactElement<any>) {
  return <SettingsLayout>{page}</SettingsLayout>;
};

export default Page;

export { getServerSideProps };
