import {
  ArchivedFormat,
  LinkIncludingShortenedCollectionAndTags,
} from "@linkwarden/types/global";
import { useTranslation } from "next-i18next";
import Link from "next/link";
import { useRouter } from "next/router";
import { getLinkDisplayBadges } from "@/lib/client/linkDisplayMeta";

export default function LinkFormats({
  link,
}: {
  link: LinkIncludingShortenedCollectionAndTags;
}) {
  const { t } = useTranslation();

  const router = useRouter();

  let isPublic = router.pathname.startsWith("/public") ? true : undefined;

  const formatBadges = getLinkDisplayBadges(link).filter(b => b.type === 'format');

  return (
    <div className="flex gap-1 text-neutral">
      {formatBadges.map(badge => (
        <Link
          key={badge.format}
          href={`${isPublic ? "/public" : ""}/preserved/${link?.id}?format=${badge.format}`}
          target="_blank"
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="hover:opacity-70 duration-100"
        >
          <i
            className={
              badge.format === ArchivedFormat.monolith ? "bi-filetype-html text-md leading-none" :
              badge.format === ArchivedFormat.pdf ? "bi-file-earmark-pdf text-md leading-none" :
              badge.format === ArchivedFormat.readability ? "bi-file-earmark-text text-md leading-none" :
              "bi-file-earmark-image text-md leading-none"
            }
            title={
              badge.format === ArchivedFormat.monolith ? t("webpage") :
              badge.format === ArchivedFormat.pdf ? t("pdf") :
              badge.format === ArchivedFormat.readability ? t("readable") :
              t("image")
            }
          ></i>
        </Link>
      ))}
    </div>
  );
}
