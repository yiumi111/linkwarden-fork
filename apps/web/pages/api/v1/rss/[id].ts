import { prisma } from "@linkwarden/prisma";
import verifyUser from "@/lib/api/verifyUser";
import setCollection from "@/lib/api/setCollection";
import { PutRssSubscriptionSchema } from "@linkwarden/lib/schemaValidation";
import { assertUrlIsSafeForServerSideFetch } from "@linkwarden/lib/ssrf";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user = await verifyUser({ req, res });
  if (!user) return;

  const rssId = Number(req.query.id);

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

  if (req.method === "PUT") {
    if (process.env.NEXT_PUBLIC_DEMO === "true") {
      return res.status(400).json({
        response:
          "This action is disabled because this is a read-only demo of Linkwarden.",
      });
    }

    const dataValidation = PutRssSubscriptionSchema.safeParse(req.body);

    if (!dataValidation.success) {
      return res.status(400).json({
        response: `Error: ${
          dataValidation.error.issues[0].message
        } [${dataValidation.error.issues[0].path.join(", ")}]`,
      });
    }

    const existingSubscription = await prisma.rssSubscription.findUnique({
      where: { id: rssId },
    });

    if (!existingSubscription) {
      return res
        .status(404)
        .json({ response: "RSS subscription not found." });
    }

    if (existingSubscription.ownerId !== user.id) {
      return res.status(403).json({ response: "Permission denied." });
    }

    const { name, url, collectionId, collectionName } = dataValidation.data;

    try {
      await assertUrlIsSafeForServerSideFetch(url);
    } catch (error: any) {
      return res.status(400).json({
        response: error?.message || "RSS URL is not allowed.",
      });
    }

    const linkCollection = await setCollection({
      userId: user.id,
      collectionId: collectionId,
      collectionName: collectionName,
    });

    if (!linkCollection) {
      return res.status(403).json({
        response:
          "You do not have permission to add a link to this collection",
      });
    }

    const duplicateName = await prisma.rssSubscription.findFirst({
      where: {
        name: name,
        ownerId: user.id,
        id: { not: rssId },
      },
    });

    if (duplicateName) {
      return res
        .status(400)
        .json({ response: "RSS Subscription with that name already exists" });
    }

    const updated = await prisma.rssSubscription.update({
      where: { id: rssId },
      data: {
        name,
        url,
        collection: {
          connect: {
            id: linkCollection.id,
          },
        },
      },
      include: {
        collection: {
          select: {
            name: true,
          },
        },
      },
    });

    return res.status(200).json({ response: updated });
  }
}
