import { useLinks } from "@linkwarden/router/links";
import MainLayout from "@/layouts/MainLayout";
import {
  LinkIncludingShortenedCollectionAndTags,
  Sort,
  ViewMode,
} from "@linkwarden/types/global";
import { useRouter } from "next/router";
import React, { ReactElement, useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import LinkListOptions from "@/components/LinkListOptions";
import getServerSideProps from "@/lib/client/getServerSideProps";
import { useTranslation } from "next-i18next";
import Links from "@/components/LinkViews/Links";
import { NextPageWithLayout } from "./_app";
import useLocalSettingsStore from "@/store/localSettings";

const Page: NextPageWithLayout = () => {
  const { t } = useTranslation();

  const router = useRouter();
  const { settings, updateSettings } = useLocalSettingsStore();

  // 使用 store 中的状态
  const viewMode = settings.viewMode as ViewMode;
  const sortBy = settings.sortBy ?? Sort.DateNewestFirst;

  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (editMode) return setEditMode(false);
  }, [router]);

  // 安全地处理搜索查询字符串
  const searchQueryString = useMemo(() => {
    const q = router.query.q;
    if (typeof q === "string" && q.trim()) {
      try {
        return decodeURIComponent(q);
      } catch {
        return q;
      }
    }
    return undefined;
  }, [router.query.q]);

  const setViewMode = (mode: ViewMode) => {
    updateSettings({ viewMode: mode });
  };

  const setSortBy = (sort: Sort) => {
    updateSettings({ sortBy: sort });
  };

  const { links, data } = useLinks({
    sort: sortBy,
    searchQueryString,
  });

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

      {!data.isLoading && links && !links[0] && <p>{t("nothing_found")}</p>}
      <Links
        editMode={editMode}
        links={links}
        layout={viewMode}
        useData={data}
      />
    </div>
  );
};

Page.getLayout = function getLayout(page: ReactElement<any>) {
  return <MainLayout>{page}</MainLayout>;
};

export default Page;

export { getServerSideProps };
