import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { $Enums, BrokerInboxStatus, COI } from "@prisma/client";
import { ExtractService } from "../extract/extract.service";
import { FilesService } from "../files/files.service";
import { PrismaService } from "../prisma/prisma.service";
import { AntivirusService } from "../security/antivirus.service";

type AnyObj = Record<string, any>;

type ParsedAttachment = {
  filename?: string;
  contentType?: string;
  url?: string;
  base64?: string;
  kind?: "CERTIFICATE" | "ENDORSEMENT";
};

function asArray<T = any>(x: any): T[] {
  if (!x) return [];
  return Array.isArray(x) ? x : [x];
}

function inferVendorBuilding(
  body: AnyObj,
  headers: AnyObj
): { vendorId?: string; buildingId?: string } {
  const result: { vendorId?: string; buildingId?: string } = {};
  const subj = (body?.subject || body?.Subject || "").toString();
  const hdrs = Object.fromEntries(
    Object.entries(headers || {}).map(([k, v]) => [
      k.toString().toLowerCase(),
      v,
    ])
  );

  const mV = subj.match(/\[V:([A-Za-z0-9_\-]+)\]/);
  const mB = subj.match(/\[B:([A-Za-z0-9_\-]+)\]/);
  if (mV) result.vendorId = mV[1];
  if (mB) result.buildingId = mB[1];

  result.vendorId ||= (hdrs["x-vendor-id"] as string) || undefined;
  result.buildingId ||= (hdrs["x-building-id"] as string) || undefined;

  return result;
}

function looksPdf(att: ParsedAttachment): boolean {
  const ct = (att.contentType || "").toLowerCase();
  const name = (att.filename || "").toLowerCase();
  const url = (att.url || "").toLowerCase();
  const byCt = ct.includes("application/pdf");
  const byExt = name.endsWith(".pdf") || url.includes(".pdf");
  return byCt || byExt;
}

function parseEmailAttachments(body: AnyObj): ParsedAttachment[] {
  const out: ParsedAttachment[] = [];
  const att = asArray(body?.attachments || body?.Attachments || body?.files);
  for (const a of att) {
    const filename = a?.filename || a?.name || a?.FileName;
    const url = a?.url || a?.href || a?.downloadUrl || a?.Url;
    const contentType =
      a?.type || a?.contentType || a?.["content-type"] || a?.ContentType;
    const base64 = a?.content || a?.Content || undefined;
    const lower = (filename || "").toLowerCase();
    const kind: ParsedAttachment["kind"] = lower.includes("endorsement")
      ? "ENDORSEMENT"
      : "CERTIFICATE";
    out.push({ filename, contentType, url, base64, kind });
  }
  return out;
}

async function runAvOnUrl(
  av: AntivirusService,
  url: string,
  logger: Logger
): Promise<boolean> {
  try {
    const maybe =
      (av as any)["scanUrl"] ||
      (av as any)["scanRemote"] ||
      (av as any)["scan"] ||
      (av as any)["checkUrl"];
    if (typeof maybe === "function") {
      const res = await maybe.call(av, url);
      if (typeof res === "boolean") return res;
      if (res && typeof res === "object") {
        if (typeof (res as any).ok === "boolean") return (res as any).ok;
        if (typeof (res as any).infected === "boolean")
          return !(res as any).infected;
      }
    }
    logger.warn(
      `AntivirusService: método scanUrl/scanRemote/scan no disponible, omito AV para ${url}`
    );
    return true;
  } catch (e) {
    logger.error(`AV error en ${url}: ${e}`);
    return false;
  }
}

function toPrismaFilesCreate(files: { url: string; kind: string }[]) {
  return files.map((a) => ({
    fileUrl: a.url,
    mimeType: "application/pdf",
  }));
}

@Injectable()
export class BrokersService {
  private logger = new Logger(BrokersService.name);
  constructor(
    private prisma: PrismaService,
    private av: AntivirusService,
    private extract: ExtractService,
    private files: FilesService
  ) {}

  async handleEmailIn(body: any, headers: any) {
    this.logger.log("Email-in received");

    // 1) Parse adjuntos
    let attachments = parseEmailAttachments(body).filter(looksPdf);
    if (!attachments.length) {
      this.logger.warn("Email-in sin PDFs. Abort.");
      return;
    }

    // 2) Materializar a URLs (subir base64 si hace falta)
    const uploaded: { url: string; kind: string }[] = [];
    for (const a of attachments) {
      if (a.url) {
        uploaded.push({ url: a.url, kind: a.kind || "CERTIFICATE" });
      } else if (a.base64) {
        try {
          const buf = Buffer.from(a.base64, "base64");
          const ext = (a.filename || "").toLowerCase().endsWith(".pdf")
            ? ".pdf"
            : ".bin";
          const r = await this.files.uploadBuffer(
            buf,
            a.contentType || "application/pdf",
            ext
          );
          uploaded.push({ url: r.url, kind: a.kind || "CERTIFICATE" });
        } catch (e) {
          this.logger.error(`Error subiendo adjunto base64 a S3: ${e}`);
        }
      }
    }
    if (!uploaded.length) {
      this.logger.warn("No se pudieron materializar adjuntos en URLs. Abort.");
      return;
    }

    // 3) Inferir vendor/building
    const inferred = inferVendorBuilding(body, headers);
    const { vendorId, buildingId } = inferred;

    // 4) Registrar BrokerInbox con el modelo REAL (campos existentes)
    try {
      await this.prisma.brokerInbox.create({
        data: {
          source: "EMAIL",
          sender:
            (body?.from as string) ||
            (body?.From as string) ||
            (headers?.["from"] as string) ||
            "unknown",
          subject: body?.subject ?? body?.Subject ?? null,
          body: body?.text || body?.html || null,
          attachments: uploaded.map((u) => ({
            url: u.url,
            kind: u.kind,
          })) as any,
          status: BrokerInboxStatus.RECEIVED,
          metadata: {
            externalId:
              (headers?.["message-id"] as string) ??
              (body?.MessageID || body?.messageId || null),
            vendorId: vendorId ?? null,
            buildingId: buildingId ?? null,
            headers,
          },
        },
      });
    } catch (e) {
      this.logger.warn(`No se pudo registrar BrokerInbox: ${e}`);
    }

    if (!vendorId || !buildingId) {
      this.logger.warn("No se pudo inferir vendorId/buildingId del email-in");
      return;
    }

    // 5) Validaciones de existencia
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });
    const building = await this.prisma.building.findUnique({
      where: { id: buildingId },
    });
    if (!vendor || !building) {
      this.logger.warn(
        `Vendor o Building inexistentes: vendorId=${vendorId} buildingId=${buildingId}`
      );
      return;
    }

    // 6) Crear COI PENDING + files
    const coi: COI = await this.prisma.cOI.create({
      data: {
        vendor: { connect: { id: vendorId } },
        building: { connect: { id: buildingId } },
        status: $Enums.COIStatus.PENDING,
        reviewNotes: "Ingestado por emial-in",
        files: { create: toPrismaFilesCreate(uploaded) },
      },
      include: { files: true },
    });

    // 7) AV sobre archivos (evita error de tipado usando variable 'files')
    const coiFiles = ((coi as any).files as Array<{ url: string }>) || [];
    let infected = false;
    for (const f of coiFiles) {
      const ok = await runAvOnUrl(this.av, f.url, this.logger);
      if (!ok) infected = true;
    }
    if (infected) {
      await this.prisma.cOI.update({
        where: { id: coi.id },
        data: {
          reviewNotes:
            (coi.reviewNotes || "") + " | AV: posible infección detectada",
        },
      });
    }

    // 8) OCR (best-effort)
    try {
      await this.extract.extractFromCoiId(coi.id);
    } catch (e) {
      this.logger.error(`OCR error para COI ${coi.id}: ${e}`);
    }
  }

  async handleApiUpload(body: any) {
    this.logger.log("API upload received");
    const { vendorId, buildingId, files } = body || {};

    if (!vendorId || !buildingId || !Array.isArray(files) || !files.length) {
      throw new BadRequestException(
        "vendorId, buildingId y files son requeridos"
      );
    }

    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });
    const building = await this.prisma.building.findUnique({
      where: { id: buildingId },
    });
    if (!vendor || !building) {
      throw new BadRequestException("Vendor o Building inválidos");
    }

    // Acepta url o base64
    const uploaded: { url: string; kind: string }[] = [];
    for (const f of files) {
      if (f?.url) {
        uploaded.push({ url: f.url, kind: f.kind || "CERTIFICATE" });
      } else if (f?.base64) {
        const buf = Buffer.from(f.base64, "base64");
        const ext = (f.filename || "").toLowerCase().endsWith(".pdf")
          ? ".pdf"
          : ".bin";
        const r = await this.files.uploadBuffer(
          buf,
          f.contentType || "application/pdf",
          ext
        );
        uploaded.push({ url: r.url, kind: f.kind || "CERTIFICATE" });
      }
    }
    if (!uploaded.length)
      throw new BadRequestException("Ningún archivo válido (url o base64)");

    const coi: COI = await this.prisma.cOI.create({
      data: {
        vendor: { connect: { id: vendorId } },
        building: { connect: { id: buildingId } },
        status: $Enums.COIStatus.PENDING,
        reviewNotes: "Ingestado por API broker",
        files: { create: toPrismaFilesCreate(uploaded) },
      },
      include: { files: true },
    });

    const coiFiles = ((coi as any).files as Array<{ url: string }>) || [];
    let infected = false;
    for (const f of coiFiles) {
      const ok = await runAvOnUrl(this.av, f.url, this.logger);
      if (!ok) infected = true;
    }
    if (infected) {
      await this.prisma.cOI.update({
        where: { id: coi.id },
        data: {
          reviewNotes:
            (coi.reviewNotes || "") + " | AV: posible infección detectada",
        },
      });
    }

    try {
      await this.extract.extractFromCoiId(coi.id);
    } catch (e) {
      this.logger.error(`OCR error para COI ${coi.id}: ${e}`);
    }
  }
}
