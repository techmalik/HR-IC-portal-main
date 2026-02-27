import { Client } from "@notionhq/client";
import type { Invoice } from "@shared/schema";

const NOTION_DATABASE_ID = "b2c73227d00440e48037b88f4403603f";

let notionClient: Client | null = null;

function getNotionClient(): Client | null {
  if (!process.env.NOTION_API_KEY) {
    return null;
  }
  if (!notionClient) {
    notionClient = new Client({
      auth: process.env.NOTION_API_KEY,
    });
  }
  return notionClient;
}

interface SyncInvoiceData {
  invoice: Invoice;
  contractorName: string;
  totalHours: number;
  category?: string;
  fileUrl?: string;
}

export function syncInvoiceToNotionAsync(data: SyncInvoiceData): void {
  console.log("[Notion] Starting async sync for invoice:", data.invoice.invoiceNumber);
  console.log("[Notion] Contractor:", data.contractorName);
  console.log("[Notion] File URL:", data.fileUrl || "none");
  console.log("[Notion] NOTION_API_KEY configured:", !!process.env.NOTION_API_KEY);
  
  setImmediate(() => {
    syncInvoiceToNotion(data).catch((err) => {
      console.error("[Notion] Sync background error:", err);
      if (err?.stack) {
        console.error("[Notion] Stack trace:", err.stack);
      }
    });
  });
}

async function syncInvoiceToNotion(data: SyncInvoiceData): Promise<void> {
  const { invoice, contractorName, totalHours, category, fileUrl } = data;
  
  const notion = getNotionClient();
  if (!notion) {
    console.warn("NOTION_API_KEY not configured, skipping Notion sync");
    return;
  }

  try {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const monthName = monthNames[invoice.month - 1] || "Unknown";
    const durationLabel = `${monthName} ${invoice.year}`;

    const properties: Record<string, any> = {
      Title: {
        rich_text: [
          {
            text: {
              content: contractorName,
            },
          },
        ],
      },
      Status: {
        select: {
          name: "Not Paid",
        },
      },
      "Submitted at": {
        date: {
          start: invoice.uploadedAt ? new Date(invoice.uploadedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        },
      },
      Duration: {
        multi_select: [
          {
            name: durationLabel,
          },
        ],
      },
    };

    if (invoice.amount) {
      properties.Amount = {
        number: invoice.amount / 100,
      };
    }

    if (category) {
      properties.Category = {
        select: {
          name: category,
        },
      };
    }

    if (fileUrl) {
      properties["Upload PDF of Invoice"] = {
        files: [
          {
            name: invoice.fileName || "invoice.pdf",
            type: "external",
            external: {
              url: fileUrl,
            },
          },
        ],
      };
    }

    await notion.pages.create({
      parent: {
        database_id: NOTION_DATABASE_ID,
      },
      properties,
    });

    console.log(`[Notion] Successfully synced invoice ${invoice.invoiceNumber} for ${contractorName}`);
  } catch (error: any) {
    console.error("[Notion] Failed to sync invoice:", error?.message || error);
    if (error?.body) {
      console.error("[Notion] API error details:", JSON.stringify(error.body, null, 2));
    }
    if (error?.code) {
      console.error("[Notion] Error code:", error.code);
    }
  }
}
