import { prisma } from "@linkwarden/prisma";
import verifyUser from "@/lib/api/verifyUser";
import setCollection from "@/lib/api/setCollection";
import { NextApiRequest, NextApiResponse } from "next";
import { PutRssSubscriptionSchema } from "@linkwarden/lib/schemaValidation";
import { assertUrlIsSafeForServerSideFetch } from "@linkwarden/lib/ssrf";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user = await verifyUser({ req, res });
  if (!user) return;

  const rssId = Number(req.query.id);

  if (req.method === "GET") {
    const rssSubscription = await prisma.rssSubscription.findUnique({
      where: { id: rssId },
      include: {
        collection: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!rssSubscription)
      return res.status(404).json({ response: "RSS subscription not found." });

    if (rssSubscription.ownerId !== user.id)
      return res.status(403).json({ response: "Permission denied." });

    return res.status(200).json({ response: rssSubscription });
  }

  if (req.method === "PUT") {
    if (process.env.NEXT_PUBLIC_DEMO === "true") {
      return res.status(400).json({
        response:
          "This action is disabled because this is a read-only demo of Linkwarden.",
      });
    }

    const rssSubscription = await prisma.rssSubscription.findUnique({
      where: { id: rssId },
    });

    if (!rssSubscription)
      return res.status(404).json({ response: "RSS subscription not found." });

    if (rssSubscription.ownerId !== user.id)
      return res.status(403).json({ response: "Permission denied." });

    const dataValidation = PutRssSubscriptionSchema.safeParse(req.body);

    if (!dataValidation.success) {
      return res.status(400).json({
        response: `Error: ${
          dataValidation.error.issues[0].message
        } [${dataValidation.error.issues[0].path.join(", ")}]`,
      });
    }

    const { name, url, collectionId, collectionName } = dataValidation.data;

    if (!name && !url && !collectionId && !collectionName) {
      return res.status(400).json({
        response: "At least one field must be provided for update.",
      });
    }

    if (url) {
      try {
        await assertUrlIsSafeForServerSideFetch(url);
      } catch (error: any) {
        return res.status(400).json({
          response: error?.message || "RSS URL is not allowed.",
        });
      }
    }

    let linkCollection = rssSubscription.collectionId;

    if (collectionId || collectionName) {
      linkCollection = await setCollection({
        userId: user.id,
        collectionId,
        collectionName,
      });

      if (!linkCollection) {
        return res.status(403).json({
          response:
            "You do not have permission to update a link to this collection",
        });
      }
    }

    if (name) {
      const existingRssSubscription = await prisma.rssSubscription.findFirst({
        where: {
          name,
          ownerId: user.id,
          id: { not: rssId },
        },
      });

      if (existingRssSubscription) {
        return res
          .status(400)
          .json({ response: "RSS Subscription with that name already exists" });
      }
    }

    const response = await prisma.rssSubscription.update({
      where: { id: rssId },
      data: {
        ...(name && { name }),
        ...(url && { url }),
        ...(linkCollection && {
          collection: {
            connect: {
              id: typeof linkCollection === "number" ? linkCollection : linkCollection.id,
            },
          },
        }),
      },
      include: {
        collection: {
          select: {
            name: true,
          },
        },
      },
    });

    return res.status(200).json({ response });
  }

  if (req.method === "DELETE") {
    const rssSubscription = await prisma.rssSubscription.findUnique({
      where: { id: rssId },
    });

    if (!rssSubscription)
      return res.status(404).json({ response: "RSS subscription not found." });

    if (rssSubscription.ownerId !== user.id)
      return res.status(403).json({ response: "Permission denied." });

    await prisma.rssSubscription.delete({ where: { id: rssId } });

    return res.status(200).json({ response: "RSS subscription deleted." });
  }
}
