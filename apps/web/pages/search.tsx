import { useLinks } from "@linkwarden/router/links";
import MainLayout from "@/layouts/MainLayout";
import {
  LinkIncludingShortenedCollectionAndTags,
  Sort,
  ViewMode,
} from "@linkwarden/types/global";
import { useRouter } from "next/router";
import React, { ReactElement, useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import LinkListOptions from "@/components/LinkListOptions";
import getServerSideProps from "@/lib/client/getServerSideProps";
import { useTranslation } from "next-i18next";
import Links from "@/components/LinkViews/Links";
import { NextPageWithLayout } from "./_app";

const Page: NextPageWithLayout = () => {
  const { t } = useTranslation();

  const router = useRouter();

  const [viewMode, setViewMode] = useState<ViewMode>(
    (typeof window !== "undefined" && (localStorage.getItem("viewMode") as ViewMode)) || ViewMode.Card
  );

  const [sortBy, setSortBy] = useState<Sort>(
    typeof window !== "undefined" && localStorage.getItem("sortBy") !== null
      ? Number(localStorage.getItem("sortBy"))
      : Sort.DateNewestFirst
  );

  const [editMode, setEditMode] = useState(false);
  const [activeLink, setActiveLink] =
    useState<LinkIncludingShortenedCollectionAndTags | null>(null);

  useEffect(() => {
    if (editMode) return setEditMode(false);
  }, [router]);

  const getSearchQuery = () => {
    if (typeof router.query.q !== "string") return "";
    try {
      return decodeURIComponent(router.query.q);
    } catch {
      return router.query.q;
    }
  };

  const searchQuery = getSearchQuery();
  const isSearchValid = router.isReady && Boolean(searchQuery);

  const { links: fetchedLinks, data } = useLinks(
    {
      sort: sortBy,
      searchQueryString: isSearchValid ? searchQuery : "___invalid_search___",
    },
    undefined,
    isSearchValid
  );

  const links = isSearchValid ? fetchedLinks : [];

  return (
    <div className="p-3 flex flex-col gap-5 w-full h-full">
      <LinkListOptions
        t={t}
        viewMode={viewMode}
        setViewMode={setViewMode}
        sortBy={sortBy}
        setSortBy={setSortBy}
        editMode={editMode}
        setEditMode={setEditMode}
        links={links}
      >
        <PageHeader icon={"bi-search"} title={t("search_results")} />
      </LinkListOptions>

      {!isSearchValid && router.isReady && (
        <p>{t("search_for_links")}</p>
      )}
      {isSearchValid && !data.isLoading && links && !links[0] && (
        <p>{t("nothing_found")}</p>
      )}
      {isSearchValid && (
        <Links
          editMode={editMode}
          links={links}
          layout={viewMode}
          useData={data}
        />
      )}
    </div>
  );
};

Page.getLayout = function getLayout(page: ReactElement<any>) {
  return <MainLayout>{page}</MainLayout>;
};

export default Page;

export { getServerSideProps };
