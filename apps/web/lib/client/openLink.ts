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

    const externalUrl = getLinkExternalOpenUrl(link.url as string) || (link.url as string);

    window.open(
      format !== null
        ? `/preserved/${link?.id}?format=${format}`
        : externalUrl,
      "_blank"
    );
  }
};

export default openLink;
