import { LinkIncludingShortenedCollectionAndTags } from "@linkwarden/types/global";
import getFormatBasedOnPreference from "@linkwarden/lib/getFormatBasedOnPreference";
import { LinksRouteTo } from "@linkwarden/prisma/client";
import { getLinkExternalOpenUrl } from "./linkDisplayMeta";

const openLink = (
  link: LinkIncludingShortenedCollectionAndTags,
  user: any,
  openModal: () => void
) => {
  if (user.linksRouteTo === LinksRouteTo.DETAILS) {
    openModal();
  } else {
    const format = getFormatBasedOnPreference({
      link,
      preference: user.linksRouteTo,
    });

    const targetUrl =
      format !== null
        ? `/preserved/${link?.id}?format=${format}`
        : getLinkExternalOpenUrl(link);

    if (!targetUrl) {
      openModal();
      return;
    }

    window.open(targetUrl, "_blank");
  }
};

export default openLink;
